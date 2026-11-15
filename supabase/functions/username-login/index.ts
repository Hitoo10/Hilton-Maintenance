import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0';
import { corsHeaders, emailFor, json, normalizeUsername } from '../_shared/http.ts';

async function hashPin(pin: string, userId: string, pepper: string) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(`v1:${userId}:${pin}`)
  );
  const hex = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `hmac-sha256:v1:${hex}`;
}

function safeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'طريقة الطلب غير مسموح بها' }, 405);

  try {
    const body = await req.json();
    const name = normalizeUsername(String(body.username ?? ''));
    const pin = String(body.pin ?? '');

    if (name.length < 3 || !/^\d{4}$/.test(pin))
      return json({ error: 'اسم المستخدم أو الرقم السري غير صحيح' }, 401);

    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const pepper = Deno.env.get('PIN_PEPPER');
    if (!url || !key || !pepper)
      return json({ error: 'إعدادات الخادم غير مكتملة' }, 500);

    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const clientIp =
      req.headers.get('cf-connecting-ip')?.trim() ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';

    const rateLimit = await admin.rpc('consume_pin_login_attempt', {
      p_username: name,
      p_client_ip: clientIp,
    });

    if (rateLimit.error) {
      return json({ error: 'تعذر التحقق من محاولات تسجيل الدخول' }, 500);
    }

    const decision = rateLimit.data?.[0];
    if (!decision || decision.allowed !== true) {
      const retryAfter = Math.max(1, Number(decision?.retry_after_seconds) || 900);
      return new Response(JSON.stringify({
        error: 'تم تجاوز عدد محاولات تسجيل الدخول. حاول مرة أخرى بعد قليل.',
        retry_after_seconds: retryAfter,
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      });
    }

    const p = await admin.from('profiles')
      .select('id,team_id,status,username')
      .eq('normalized_username', name).maybeSingle();

    if (p.error || !p.data || p.data.status !== 'active')
      return json({ error: 'اسم المستخدم أو الرقم السري غير صحيح' }, 401);

    const c = await admin.from('user_pin_credentials')
      .select('pin_hash').eq('user_id', p.data.id).maybeSingle();

    if (c.error || !c.data?.pin_hash)
      return json({ error: 'اسم المستخدم أو الرقم السري غير صحيح' }, 401);

    const calculated = await hashPin(pin, p.data.id, pepper);
    if (!safeEqual(calculated, c.data.pin_hash))
      return json({ error: 'اسم المستخدم أو الرقم السري غير صحيح' }, 401);

    const reset = await admin.rpc('reset_pin_login_attempt', {
      p_username: name,
    });
    if (reset.error) {
      return json({ error: 'تعذر إكمال تسجيل الدخول بأمان' }, 500);
    }

    const authUser = await admin.auth.admin.getUserById(p.data.id);
    const actualEmail = authUser.data?.user?.email;

    if (authUser.error || !actualEmail) {
      return json({ error: 'تعذر التحقق من حساب المستخدم' }, 500);
    }

    const generated = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: actualEmail
    });

    const tokenHash = generated.data?.properties?.hashed_token;
    if (generated.error || !tokenHash)
      return json({ error: 'تعذر إنشاء جلسة تسجيل الدخول' }, 500);

    await admin.from('audit_logs').insert({
      team_id: p.data.team_id,
      user_id: p.data.id,
      username: p.data.username,
      action: 'login',
      description: 'User logged in with PIN'
    });

    return json({ token_hash: tokenHash });
  } catch {
    return json({ error: 'اسم المستخدم أو الرقم السري غير صحيح' }, 401);
  }
});

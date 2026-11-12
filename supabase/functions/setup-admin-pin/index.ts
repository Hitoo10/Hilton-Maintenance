import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const ADMIN_USER_ID = '025d8899-f9dd-4300-9a54-6efea4059b03';

function constantTimeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);

  let diff = x.length ^ y.length;
  const length = Math.max(x.length, y.length);

  for (let i = 0; i < length; i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }

  return diff === 0;
}

async function hashPin(pin: string, userId: string, pepper: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`v1:${userId}:${pin}`),
  );

  const hex = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return `hmac-sha256:v1:${hex}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'طريقة الطلب غير مسموح بها' }, 405);
  }

  try {
    const setupToken = Deno.env.get('ADMIN_PIN_SETUP_TOKEN');
    const pepper = Deno.env.get('PIN_PEPPER');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!setupToken || !pepper || !supabaseUrl || !serviceRoleKey) {
      return json({ error: 'إعدادات الخادم غير مكتملة' }, 500);
    }

    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return json({ error: 'بيانات الطلب غير صالحة' }, 400);
    }

    const pin = typeof body.pin === 'string' ? body.pin : '';
    const suppliedToken =
      typeof body.setup_token === 'string' ? body.setup_token : '';

    if (!constantTimeEqual(suppliedToken, setupToken)) {
      return json({ error: 'رمز الإعداد غير صحيح' }, 401);
    }

    if (!/^\d{4}$/.test(pin)) {
      return json({ error: 'PIN يجب أن يتكون من 4 أرقام' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const profile = await admin
      .from('profiles')
      .select('id, role, status')
      .eq('id', ADMIN_USER_ID)
      .maybeSingle();

    if (profile.error) {
      return json({ error: 'تعذّر التحقق من حساب الأدمن' }, 500);
    }

    if (
      !profile.data ||
      profile.data.role !== 'admin' ||
      profile.data.status !== 'active'
    ) {
      return json({ error: 'حساب الأدمن غير جاهز' }, 403);
    }

    const existing = await admin
      .from('user_pin_credentials')
      .select('user_id')
      .eq('user_id', ADMIN_USER_ID)
      .maybeSingle();

    if (existing.error) {
      return json({ error: 'تعذّر التحقق من إعداد PIN' }, 500);
    }

    if (existing.data) {
      return json({ error: 'تم إعداد PIN لهذا الحساب من قبل' }, 409);
    }

    const pinHash = await hashPin(pin, ADMIN_USER_ID, pepper);

    const inserted = await admin
      .from('user_pin_credentials')
      .insert({
        user_id: ADMIN_USER_ID,
        pin_hash: pinHash,
      });

    if (inserted.error) {
      return json({ error: 'فشل حفظ إعداد PIN' }, 500);
    }

    return json({
      ok: true,
      message: 'تم إعداد PIN الأدمن بنجاح',
    });
  } catch {
    return json({ error: 'حدث خطأ داخلي أثناء إعداد PIN' }, 500);
  }
});

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

function randomPassword() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'طريقة الطلب غير مسموح بها' }, 405);

  let admin: any = null;
  let userId: string | null = null;

  try {
    const body = await req.json();
    const name = normalizeUsername(String(body.username ?? ''));
    const pin = String(body.pin ?? '');
    const jobTitle = typeof body.job_title === 'string'
      ? body.job_title.trim().slice(0, 80) : '';

    if (name.length < 3 || name.length > 32)
      return json({ error: 'اسم المستخدم يجب أن يكون من 3 إلى 32 حرفًا' }, 400);
    if (!/^\d{4}$/.test(pin))
      return json({ error: 'الرقم السري يجب أن يتكون من 4 أرقام' }, 400);

    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const pepper = Deno.env.get('PIN_PEPPER');
    if (!url || !key || !pepper)
      return json({ error: 'إعدادات الخادم غير مكتملة' }, 500);

    admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const team = await admin.from('teams').select('id').limit(1);
    if (team.error) return json({ error: 'تعذر التحقق من فريق العمل' }, 500);
    const teamId = team.data?.[0]?.id;
    if (!teamId) return json({ error: 'لا يوجد فريق عمل مُعد في النظام' }, 409);

    const exists = await admin.from('profiles')
      .select('id').eq('normalized_username', name).maybeSingle();
    if (exists.error) return json({ error: 'تعذر التحقق من اسم المستخدم' }, 500);
    if (exists.data) return json({ error: 'اسم المستخدم موجود بالفعل' }, 409);

    const created = await admin.auth.admin.createUser({
      email: emailFor(name),
      password: randomPassword(),
      email_confirm: true
    });

    if (created.error || !created.data.user) {
      if (created.error && /already registered|duplicate/i.test(created.error.message))
        return json({ error: 'اسم المستخدم موجود بالفعل' }, 409);
      return json({ error: 'تعذر إنشاء حساب المستخدم' }, 400);
    }

    userId = created.data.user.id;

    const profile = await admin.from('profiles').insert({
      id: userId,
      team_id: teamId,
      username: name,
      normalized_username: name,
      job_title: jobTitle || null,
      role: 'technician',
      status: 'pending'
    });

    if (profile.error) {
      await admin.auth.admin.deleteUser(userId);
      userId = null;
      if (profile.error.code === '23505')
        return json({ error: 'اسم المستخدم موجود بالفعل' }, 409);
      return json({ error: 'تعذر حفظ بيانات الحساب' }, 400);
    }

    const pinHash = await hashPin(pin, created.data.user.id, pepper);
    const saved = await admin.from('user_pin_credentials').insert({
      user_id: userId, pin_hash: pinHash
    });

    if (saved.error) {
      await admin.from('profiles').delete().eq('id', userId);
      await admin.auth.admin.deleteUser(userId);
      userId = null;
      return json({ error: 'تعذر حفظ PIN. تحقق من ترحيل قاعدة البيانات' }, 500);
    }

    return json({
      ok: true,
      message: 'تم إنشاء الحساب بانتظار موافقة المسؤول'
    });
  } catch {
    if (admin && userId) {
      await admin.from('profiles').delete().eq('id', userId);
      await admin.auth.admin.deleteUser(userId);
    }
    return json({ error: 'حدث خطأ غير متوقع أثناء إنشاء الحساب' }, 500);
  }
});

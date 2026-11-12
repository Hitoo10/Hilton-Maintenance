import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { corsHeaders, emailFor, json, normalizeUsername, strongPassword } from '../_shared/http.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { username, password, invitationCode, adminSetupCode } = await req.json();
    const name = normalizeUsername(String(username ?? ''));
    const pass = String(password ?? '');
    if (!name || !strongPassword(pass)) return json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتتضمن حرفًا كبيرًا وحرفًا صغيرًا ورقمًا' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const teamRes = await admin.from('teams').select('id').limit(1);
    let teamId = teamRes.data?.[0]?.id as string | undefined;

    if (!teamId) {
      if (!adminSetupCode || adminSetupCode !== Deno.env.get('ADMIN_SETUP_CODE')) return json({ error: 'إعداد أول مسؤول غير مصرح' }, 403);
      const created = await admin.from('teams').insert({ name: 'Hotel Maintenance Team' }).select().single();
      teamId = created.data!.id;
      await admin.from('shifts').insert([
        { team_id: teamId, name: 'Morning', start_time: '07:00', end_time: '15:00' },
        { team_id: teamId, name: 'Evening', start_time: '15:00', end_time: '23:00' },
        { team_id: teamId, name: 'Night', start_time: '23:00', end_time: '07:00' },
      ]);
      const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email: emailFor(name), password: pass, email_confirm: true });
      if (authError) return json({ error: authError.message }, 400);
      await admin.from('profiles').insert({ id: authUser.user!.id, team_id: teamId, username: name, normalized_username: name, role: 'admin', status: 'active' });
      return json({ ok: true, message: 'تم إنشاء الحساب بنجاح، يمكنك تسجيل الدخول الآن', bootstrapAdmin: true });
    }

    let status = 'pending';
    let role = 'technician';
    if (invitationCode) {
      const code = await admin.from('invitation_codes').select('*').eq('code', String(invitationCode)).eq('team_id', teamId).single();
      if (code.error) return json({ error: 'كود الدعوة غير صالح' }, 403);
      const c = code.data as any;
      if (c.expires_at && new Date(c.expires_at) < new Date()) return json({ error: 'كود الدعوة منتهي' }, 403);
      if (c.used_count >= c.max_uses) return json({ error: 'كود الدعوة مستخدم' }, 403);
      status = 'active';
      await admin.from('invitation_codes').update({ used_count: c.used_count + 1 }).eq('id', c.id);
    }

    const exists = await admin.from('profiles').select('id').eq('normalized_username', name).maybeSingle();
    if (exists.data) return json({ error: 'اسم المستخدم موجود بالفعل' }, 409);

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email: emailFor(name), password: pass, email_confirm: true });
    if (authError) {
      if (/already registered|duplicate/i.test(authError.message)) return json({ error: 'اسم المستخدم موجود بالفعل' }, 409);
      return json({ error: authError.message }, 400);
    }
    const { error: profileError } = await admin.from('profiles').insert({ id: authUser.user!.id, team_id: teamId, username: name, normalized_username: name, role, status });
    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user!.id);
      return json({ error: profileError.message }, 400);
    }
    return json({ ok: true, message: status === 'active' ? 'تم إنشاء الحساب بنجاح، يمكنك تسجيل الدخول الآن' : 'تم إنشاء الحساب بانتظار موافقة المسؤول' });
  } catch (e) {
    return json({ error: 'حدث خطأ غير متوقع' }, 500);
  }
});

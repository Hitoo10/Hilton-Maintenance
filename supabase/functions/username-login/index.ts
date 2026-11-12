import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { corsHeaders, emailFor, json, normalizeUsername } from '../_shared/http.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { username, password } = await req.json();
    const name = normalizeUsername(String(username ?? ''));
    const pass = String(password ?? '');
    if (!name || !pass) return json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const profile = await admin.from('profiles').select('id,status').eq('normalized_username', name).maybeSingle();
    if (profile.error || !profile.data || profile.data.status !== 'active') return json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, 401);

    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const session = await client.auth.signInWithPassword({ email: emailFor(name), password: pass });
    if (session.error) return json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, 401);
    await admin.from('audit_logs').insert({ team_id: (await admin.from('profiles').select('team_id').eq('id', profile.data.id).single()).data?.team_id, user_id: profile.data.id, username: name, action: 'login', description: 'User logged in' });
    return json({ session: session.data, profile: profile.data });
  } catch {
    return json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, 401);
  }
});

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
export function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 32);
}
export function emailFor(username: string) { return `${normalizeUsername(username)}@users.shiftflow.local`; }
export function strongPassword(password: string) {
  return password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

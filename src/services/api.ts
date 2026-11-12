import { supabase } from '@/lib/supabase';
import type { Handover, Message, NotificationItem, Priority, Profile, Shift, Task, TaskStatus } from '@/lib/types';

export async function getDashboard() {
  const [{ data: tasks }, { data: profiles }, { data: shifts }, { data: handovers }] = await Promise.all([
    supabase.from('tasks').select('id,status,priority,created_at').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id,status,role').eq('status', 'active'),
    supabase.from('shifts').select('*').eq('is_active', true),
    supabase.from('handovers').select('*, outgoing:profiles!handovers_outgoing_user_id_fkey(username), incoming:profiles!handovers_incoming_user_id_fkey(username)').order('submitted_at', { ascending: false }).limit(1),
  ]);
  const list = (tasks ?? []) as Pick<Task, 'id'|'status'|'priority'|'created_at'>[];
  const count = (s: TaskStatus) => list.filter((t) => t.status === s).length;
  return {
    total: list.length,
    newCount: count('New'),
    inProgress: count('In Progress'),
    pending: count('Pending'),
    completed: count('Completed'),
    critical: list.filter((t) => t.priority === 'Critical' && t.status !== 'Completed').length,
    activeTechnicians: (profiles ?? []).filter((p: any) => p.role === 'technician').length,
    shifts: (shifts ?? []) as Shift[],
    latestTasks: list.slice(0, 8) as unknown as Task[],
    latestHandover: (handovers ?? [])[0] as Handover | undefined,
  };
}

export async function listTasks(search = '', status: TaskStatus | 'All' = 'All') {
  let q = supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(username), creator:profiles!tasks_created_by_fkey(username)').order('created_at', { ascending: false });
  if (status !== 'All') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  const s = search.trim().toLowerCase();
  return ((data ?? []) as Task[]).filter((t) => !s || `${t.title} ${t.description} ${t.location} ${t.room_number ?? ''}`.toLowerCase().includes(s));
}

export async function createTask(input: Partial<Task>) {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('tasks').insert({ ...input, created_by: user.user!.id } as any).select().single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, patch: Partial<Task>) {
  const next = { ...patch, updated_at: new Date().toISOString() };
  if (patch.status === 'Completed' && !patch.completed_at) next.completed_at = new Date().toISOString();
  const { data, error } = await supabase.from('tasks').update(next).eq('id', id).select().single();
  if (error) throw error;
  return data as Task;
}

export async function listMessages(conversationId: string) {
  const { data, error } = await supabase.from('messages').select('*, sender:profiles!messages_sender_id_fkey(username)').eq('conversation_id', conversationId).is('deleted_at', null).order('created_at', { ascending: true }).limit(200);
  if (error) throw error;
  return (data ?? []) as Message[];
}
export async function sendMessage(conversationId: string, body: string, image_url?: string | null, task_id?: string | null) {
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: user.user!.id, body, image_url, task_id } as any);
  if (error) throw error;
}
export async function listNotifications() {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []) as NotificationItem[];
}
export async function markAllNotificationsRead() {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
}
export async function submitHandover(input: { handover_notes: string; task_ids: string[]; requires_immediate_attention: string[]; incoming_user_id?: string | null }) {
  const { data: user } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.user!.id).single();
  const { data, error } = await supabase.from('handovers').insert({ team_id: profile.team_id, outgoing_user_id: user.user!.id, previous_shift_id: profile.current_shift_id, handover_notes: input.handover_notes } as any).select().single();
  if (error) throw error;
  const rows = input.task_ids.map((task_id) => ({ handover_id: data.id, task_id, requires_immediate_attention: input.requires_immediate_attention.includes(task_id) }));
  if (rows.length) await supabase.from('handover_tasks').insert(rows as any);
  return data as Handover;
}
export async function confirmHandover(id: string, accept: boolean, reason?: string) {
  const { data: user } = await supabase.auth.getUser();
  const patch = accept
    ? { status: 'Confirmed', incoming_user_id: user.user!.id, confirmed_at: new Date().toISOString(), rejection_reason: null }
    : { status: 'Rejected', incoming_user_id: user.user!.id, rejection_reason: reason ?? '' };
  const { error } = await supabase.from('handovers').update(patch).eq('id', id);
  if (error) throw error;
}
export async function listProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').eq('status', 'active').order('username');
  if (error) throw error;
  return (data ?? []) as Profile[];
}
export function priorityColor(p?: Priority) { return p === 'Critical' ? '#FF4D5E' : p === 'High' ? '#FF9F2E' : p === 'Medium' ? '#2F7DFF' : '#23C483'; }
export function statusColor(s?: TaskStatus) { return s === 'Completed' ? '#23C483' : s === 'Pending' ? '#FF9F2E' : s === 'In Progress' ? '#2F7DFF' : '#AAB6C8'; }

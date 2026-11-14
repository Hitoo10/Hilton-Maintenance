export type Role = 'admin' | 'technician';
export type TaskStatus = 'New' | 'In Progress' | 'Pending' | 'Completed';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Category = 'HVAC' | 'Electrical' | 'Plumbing' | 'Cold Rooms' | 'Freezing Rooms' | 'Chillers' | 'Refrigeration' | 'General';
export interface Profile { id: string; team_id: string | null; username: string; job_title: string | null; role: Role; status: 'pending'|'active'|'disabled'; avatar_url: string | null; current_shift_id: string | null; created_at: string; }
export interface Shift { id: string; team_id: string; name: string; start_time: string; end_time: string; is_active: boolean; }
export interface Task {
  id: string; team_id: string; title: string; description: string; location: string; room_number?: string | null; floor?: string | null;
  department?: string | null; equipment_type?: string | null; category: Category; priority: Priority; status: TaskStatus;
  assigned_to?: string | null; created_by: string; shift_id?: string | null; handover_notes: string; completion_notes: string; images: string[];
  created_at: string; updated_at: string; completed_at?: string | null;
  assignee?: { username: string } | null; creator?: { username: string } | null;
}
export interface Message { id: string; conversation_id: string; sender_id: string; body: string; image_url?: string | null; reply_to?: string | null; task_id?: string | null; created_at: string; sender?: { username: string } | null; }
export interface NotificationItem { id: string; user_id: string; type: string; title: string; body: string; task_id?: string | null; conversation_id?: string | null; read_at?: string | null; created_at: string; }
export interface Handover { id: string; team_id: string; outgoing_user_id: string; incoming_user_id?: string | null; previous_shift_id?: string | null; new_shift_id?: string | null; handover_notes: string; status: 'Submitted'|'Confirmed'|'Rejected'; rejection_reason?: string | null; submitted_at: string; confirmed_at?: string | null; outgoing?: { username: string } | null; incoming?: { username: string } | null; }

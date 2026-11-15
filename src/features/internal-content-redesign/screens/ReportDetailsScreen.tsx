import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Screen, Button, Input, Title } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { updateTask } from '@/services/api';
import type { Priority, Task, TaskStatus } from '@/lib/types';
import { spacing } from '@/lib/theme';
import { colors } from '../theme/theme';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import { LoadingState } from '../components/States';
import { formatDateTime, formatDate } from '../utils/format';
import { statusLabels, priorityLabels } from '../utils/labels';

const statuses: TaskStatus[] = ['New', 'In Progress', 'Pending', 'Completed'];
const priorities: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

export function ReportDetailsScreen({ id }: { id: string }) {
  const [task, setTask] = useState<Task | null>(null);
  const [notes, setNotes] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assignee:profiles!tasks_assigned_to_fkey(username), creator:profiles!tasks_created_by_fkey(username)')
      .eq('id', id)
      .single();

    if (error) {
      Alert.alert('تعذر تحميل البلاغ', error.message);
      return;
    }

    setTask(data as Task);
    setNotes((data as Task).completion_notes ?? '');
  }, [id]);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`task-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `id=eq.${id}` }, () => { void load(); })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [load, id]);

  async function changeStatus(status: TaskStatus) {
    if (!task || saving) return;
    if (status === 'Completed' && !notes.trim() && task.priority === 'Critical') {
      Alert.alert('إغلاق بلاغ حرج', 'يلزم إدخال ملاحظات الإتمام قبل إغلاق البلاغ الحرج.');
      return;
    }
    setSaving(true);
    try {
      await updateTask(task.id, { status, completion_notes: notes || task.completion_notes });
      await load();
    } catch (error) {
      Alert.alert('تعذر تحديث الحالة', error instanceof Error ? error.message : 'حدث خطأ غير متوقع.');
    } finally {
      setSaving(false);
    }
  }

  async function changePriority(priority: Priority) {
    if (!task || saving || task.priority === priority) return;
    setSaving(true);
    try {
      await updateTask(task.id, { priority });
      await load();
    } catch (error) {
      Alert.alert('تعذر تحديث الأولوية', error instanceof Error ? error.message : 'حدث خطأ غير متوقع.');
    } finally {
      setSaving(false);
    }
  }

  async function addComment() {
    const body = comment.trim();
    if (!task || !body || saving) return;
    setSaving(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error('جلسة المستخدم غير متاحة.');
      const { error } = await supabase.from('task_comments').insert({ task_id: task.id, user_id: userData.user.id, body });
      if (error) throw error;
      setComment('');
      Alert.alert('تم', 'تمت إضافة التعليق.');
    } catch (error) {
      Alert.alert('تعذر إضافة التعليق', error instanceof Error ? error.message : 'حدث خطأ غير متوقع.');
    } finally {
      setSaving(false);
    }
  }

  if (!task) return <Screen><LoadingState label="جارٍ تحميل البلاغ..." /></Screen>;

  const location = [
    task.location,
    task.room_number ? `غرفة ${task.room_number}` : null,
    task.floor ? `طابق ${task.floor}` : null,
    task.equipment_type || null,
  ].filter(Boolean).join(' • ');

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(2) }}>
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </View>
        <Title>{task.title}</Title>
        {task.description ? <Text style={{ color: colors.muted, marginBottom: spacing(2) }}>{task.description}</Text> : null}
        {location ? <Text style={{ color: colors.muted, marginBottom: spacing(1) }}>{location}</Text> : null}
        <Text style={{ color: colors.muted, marginBottom: spacing(2) }}>أنشأه: {task.creator?.username ?? 'غير معروف'} • المسؤول: {task.assignee?.username ?? 'غير مسند'}</Text>
        <Text style={{ color: colors.muted, marginBottom: spacing(3) }}>تاريخ الإنشاء: {formatDateTime(task.created_at)}</Text>

        {task.completion_notes ? (
          <View style={{ padding: spacing(3), borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: spacing(3) }}>
            <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing(1) }}>ملاحظات الإتمام</Text>
            <Text style={{ color: colors.muted }}>{task.completion_notes}</Text>
            {task.completed_at ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: spacing(1) }}>اكتمل في: {formatDate(task.completed_at)}</Text> : null}
          </View>
        ) : null}

        <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing(1.5) }}>تغيير الحالة</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5), marginBottom: spacing(3) }}>
          {statuses.map((status) => <Button key={status} title={statusLabels[status]} variant={task.status === status ? 'primary' : 'ghost'} disabled={saving} onPress={() => { void changeStatus(status); }} />)}
        </View>

        <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing(1.5) }}>تغيير الأولوية</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5), marginBottom: spacing(3) }}>
          {priorities.map((priority) => <Button key={priority} title={priorityLabels[priority]} variant={task.priority === priority ? 'primary' : 'ghost'} disabled={saving} onPress={() => { void changePriority(priority); }} />)}
        </View>

        <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing(1.5) }}>ملاحظات الإتمام</Text>
        <Input placeholder="اكتب ملاحظات الإتمام" multiline value={notes} onChangeText={setNotes} />
        <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing(1.5) }}>إضافة تعليق</Text>
        <Input placeholder="اكتب تعليقك على البلاغ" multiline value={comment} onChangeText={setComment} />
        <Button title="إرسال التعليق" onPress={() => { void addComment(); }} disabled={saving || !comment.trim()} loading={saving} />
      </ScrollView>
    </Screen>
  );
}

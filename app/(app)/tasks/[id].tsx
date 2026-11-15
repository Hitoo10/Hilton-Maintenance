import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Card, Title, Badge, Button, Input, EmptyState } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { priorityColor, statusColor, updateTask } from '@/services/api';
import type { Priority, Task, TaskStatus } from '@/lib/types';
import { colors } from '@/lib/theme';

const statuses: TaskStatus[] = ['New', 'In Progress', 'Pending', 'Completed'];
const priorities: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

export default function TaskDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [comment, setComment] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    if (!id) {
      setLoadError('معرّف المهمة غير صالح');
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!tasks_assigned_to_fkey(username), creator:profiles!tasks_created_by_fkey(username)')
        .eq('id', id)
        .single();
      if (error) throw error;
      setTask(data as Task);
      setCompletionNotes((data as Task).completion_notes ?? '');
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'تعذر تحميل المهمة');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
    if (!id) return;
    const channel = supabase
      .channel(`task-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `id=eq.${id}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, id]);

  async function setStatus(status: TaskStatus) {
    if (!task || saving) return;
    if (status === 'Completed' && !completionNotes.trim() && task.priority === 'Critical') {
      Alert.alert('إغلاق حرج', 'يلزم ملاحظات إتمام قبل إغلاق مهمة حرجة');
      return;
    }
    setSaving(true);
    try {
      await updateTask(task.id, { status, completion_notes: completionNotes || task.completion_notes });
      await load();
    } catch (error) {
      Alert.alert('تعذر تحديث الحالة', error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  }

  async function setPriority(priority: Priority) {
    if (!task || saving || task.priority === priority) return;
    setSaving(true);
    try {
      await updateTask(task.id, { priority });
      await load();
    } catch (error) {
      Alert.alert('تعذر تحديث الأولوية', error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  }

  async function addComment() {
    const body = comment.trim();
    if (!task || !body || saving) return;
    setSaving(true);
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user.user) throw new Error('جلسة المستخدم غير متاحة');
      const { error } = await supabase.from('task_comments').insert({
        task_id: task.id,
        user_id: user.user.id,
        body,
      });
      if (error) throw error;
      setComment('');
      Alert.alert('تم', 'تمت إضافة التعليق');
    } catch (error) {
      Alert.alert('تعذر إضافة التعليق', error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Screen><EmptyState title="جارٍ تحميل المهمة..." /></Screen>;
  if (!task) return <Screen><EmptyState title={loadError || 'المهمة غير موجودة أو لا تملك صلاحية عرضها'} /></Screen>;

  return (
    <Screen><ScrollView keyboardShouldPersistTaps="handled">
      <Card>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
          <Badge label={task.priority} color={priorityColor(task.priority)} />
          <Badge label={task.status} color={statusColor(task.status)} />
        </View>
        <Title>{task.title}</Title>
        <Text style={{ color: colors.muted, textAlign: 'right' }}>{task.description}</Text>
        <Text style={{ color: colors.muted, textAlign: 'right' }}>{task.location} {task.room_number ? `• غرفة ${task.room_number}` : ''} {task.floor ? `• طابق ${task.floor}` : ''}</Text>
        <Text style={{ color: colors.muted, textAlign: 'right' }}>أنشأها: {task.creator?.username ?? 'غير معروف'} • المسؤول: {task.assignee?.username ?? 'غير مسند'}</Text>
      </Card>
      <Text style={{ color: colors.text, textAlign: 'right', fontWeight: '800', marginBottom: 6 }}>تغيير الحالة</Text>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>
        {statuses.map((status) => <Button key={status} title={status} disabled={saving} variant={task.status === status ? 'primary' : 'ghost'} onPress={() => { void setStatus(status); }} />)}
      </View>
      <Text style={{ color: colors.text, textAlign: 'right', fontWeight: '800', marginVertical: 6 }}>تغيير الأولوية</Text>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>
        {priorities.map((priority) => <Button key={priority} title={priority} disabled={saving} variant={task.priority === priority ? 'primary' : 'ghost'} onPress={() => { void setPriority(priority); }} />)}
      </View>
      <Input placeholder="ملاحظات الإتمام" multiline value={completionNotes} onChangeText={setCompletionNotes} />
      <Input placeholder="أضف تعليقًا" value={comment} onChangeText={setComment} />
      <Button title="إضافة تعليق" variant="ghost" disabled={saving || !comment.trim()} loading={saving} onPress={() => { void addComment(); }} />
    </ScrollView></Screen>
  );
}

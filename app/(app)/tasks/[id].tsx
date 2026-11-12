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
  const load = useCallback(async () => {
    const { data } = await supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(username), creator:profiles!tasks_created_by_fkey(username)').eq('id', id).single();
    setTask(data as Task);
  }, [id]);
  useEffect(() => {
    load();
    const channel = supabase.channel(`task-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `id=eq.${id}` }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);
  if (!task) return <Screen><EmptyState title="جارٍ التحميل..." /></Screen>;
  async function setStatus(status: TaskStatus) {
    if (status === 'Completed' && !completionNotes.trim() && task?.priority === 'Critical') return Alert.alert('إغلاق حرج', 'يلزم ملاحظات إتمام قبل إغلاق مهمة حرجة');
    await updateTask(task!.id, { status, completion_notes: completionNotes || task!.completion_notes });
    await load();
  }
  async function addComment() {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from('task_comments').insert({ task_id: task!.id, user_id: user.user!.id, body: comment });
    setComment('');
  }
  return (
    <Screen><ScrollView>
      <Card>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}><Badge label={task.priority} color={priorityColor(task.priority)} /><Badge label={task.status} color={statusColor(task.status)} /></View>
        <Title>{task.title}</Title>
        <Text style={{ color: colors.muted, textAlign: 'right' }}>{task.description}</Text>
        <Text style={{ color: colors.muted, textAlign: 'right' }}>{task.location} {task.room_number ? `• غرفة ${task.room_number}` : ''} {task.floor ? `• طابق ${task.floor}` : ''}</Text>
        <Text style={{ color: colors.muted, textAlign: 'right' }}>أنشأها: {task.creator?.username} • المسؤول: {task.assignee?.username ?? 'غير مسند'}</Text>
      </Card>
      <Text style={{ color: colors.text, textAlign: 'right', fontWeight: '800', marginBottom: 6 }}>تغيير الحالة</Text>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>{statuses.map((s) => <Button key={s} title={s} variant={task.status === s ? 'primary' : 'ghost'} onPress={() => setStatus(s)} />)}</View>
      <Text style={{ color: colors.text, textAlign: 'right', fontWeight: '800', marginVertical: 6 }}>تغيير الأولوية</Text>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>{priorities.map((p) => <Button key={p} title={p} variant={task.priority === p ? 'primary' : 'ghost'} onPress={() => updateTask(task.id, { priority: p }).then(load)} />)}</View>
      <Input placeholder="ملاحظات الإتمام" multiline value={completionNotes} onChangeText={setCompletionNotes} />
      <Input placeholder="أضف تعليقًا" value={comment} onChangeText={setComment} />
      <Button title="إضافة تعليق" variant="ghost" onPress={addComment} />
    </ScrollView></Screen>
  );
}

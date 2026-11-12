import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, Card, Title, Button, Input, Badge, EmptyState } from '@/components/ui';
import { listTasks, submitHandover, confirmHandover } from '@/services/api';
import { useAuth } from '@/state/AuthContext';
import { priorityColor } from '@/services/api';
import type { Handover, Task } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function HandoverScreen() {
  const { profile } = useAuth();
  const [open, setOpen] = useState<Task[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [urgent, setUrgent] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [latest, setLatest] = useState<Handover | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => {
    setRefreshing(true);
    const tasks = await listTasks('', 'All');
    setOpen(tasks.filter((t) => t.status !== 'Completed'));
    const { data } = await supabase.from('handovers').select('*, outgoing:profiles!handovers_outgoing_user_id_fkey(username), incoming:profiles!handovers_incoming_user_id_fkey(username)').order('submitted_at', { ascending: false }).limit(1).maybeSingle();
    setLatest(data as Handover | null);
    setRefreshing(false);
  };
  useFocusEffect(useCallback(() => { load().catch(() => setRefreshing(false)); }, []));
  async function submit() {
    if (open.filter((t) => t.priority === 'Critical').length && !notes.trim()) return Alert.alert('تسليم الشيفت', 'سجّل ملاحظات مفصلة للمشكلات الحرجة');
    await submitHandover({ handover_notes: notes, task_ids: selected, requires_immediate_attention: urgent });
    Alert.alert('تسليم الشيفت', 'تم إرسال تقرير التسليم');
    await load();
  }
  return (
    <Screen>
      <FlatList
        data={open}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListHeaderComponent={<>
          <Card><Title>تسليم الشيفت</Title><Text style={{ color: colors.muted, textAlign: 'right' }}>اختر المهام غير المنجزة وأضف ملاحظات الاستلام</Text></Card>
          {latest && <Card><Text style={{ color: colors.text, textAlign: 'right', fontWeight: '800' }}>آخر تقرير: {latest.status}</Text><Text style={{ color: colors.muted, textAlign: 'right' }}>من {latest.outgoing?.username ?? ''}</Text><Text style={{ color: colors.muted, textAlign: 'right' }}>{latest.handover_notes}</Text><View style={{ flexDirection: 'row-reverse', gap: 8 }}><Button title="تأكيد استلام الشيفت" onPress={() => confirmHandover(latest.id, true).then(load)} /><Button title="رفض مع سبب" variant="danger" onPress={() => rejectReason.trim() ? confirmHandover(latest.id, false, rejectReason).then(load) : Alert.alert('رفض', 'اكتب سبب الرفض')} /></View><Input placeholder="سبب الرفض" value={rejectReason} onChangeText={setRejectReason} /></Card>}
          <Input placeholder="ملاحظات التسليم التفصيلية" multiline value={notes} onChangeText={setNotes} />
        </>}
        ListEmptyComponent={<EmptyState title="لا توجد مهام مفتوحة" />}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => {
          const checked = selected.includes(item.id);
          return <Card>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}><Badge label={item.priority} color={priorityColor(item.priority)} /><Button title={checked ? 'مختارة' : 'اختيار'} variant={checked ? 'primary' : 'ghost'} onPress={() => setSelected(checked ? selected.filter((x) => x !== item.id) : [...selected, item.id])} /></View>
            <Text style={{ color: colors.text, textAlign: 'right', fontWeight: '800', marginTop: 6 }}>{item.title}</Text>
            {checked && <Button title={urgent.includes(item.id) ? 'تتطلب انتباه فوري ✓' : 'تتطلب انتباه فوري'} variant={urgent.includes(item.id) ? 'danger' : 'ghost'} onPress={() => setUrgent(urgent.includes(item.id) ? urgent.filter((x) => x !== item.id) : [...urgent, item.id])} />}
          </Card>;
        }}
        ListFooterComponent={<Button title="إرسال تقرير التسليم" onPress={submit} />}
      />
    </Screen>
  );
}

import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, Card, Title, Button, Input, Badge, EmptyState } from '@/components/ui';
import { listProfiles, listTasks, submitHandover, confirmHandover, priorityColor } from '@/services/api';
import { useAuth } from '@/state/AuthContext';
import type { Handover, Profile, Task } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function HandoverScreen() {
  const { profile } = useAuth();
  const [open, setOpen] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [incomingUserId, setIncomingUserId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [urgent, setUrgent] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [latest, setLatest] = useState<Handover | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [tasks, teamProfiles] = await Promise.all([listTasks('', 'All'), listProfiles()]);
      setOpen(tasks.filter((task) => task.status !== 'Completed'));
      setProfiles(teamProfiles.filter((member) => member.id !== profile?.id));
      const { data, error } = await supabase
        .from('handovers')
        .select('*, outgoing:profiles!handovers_outgoing_user_id_fkey(username), incoming:profiles!handovers_incoming_user_id_fkey(username)')
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setLatest(data as Handover | null);
    } catch (error) {
      Alert.alert('تعذر تحميل تسليم الشيفت', error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setRefreshing(false);
    }
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function submit() {
    if (!incomingUserId) return Alert.alert('تسليم الشيفت', 'اختر الفني الذي سيستلم الشيفت');
    if (open.some((task) => task.priority === 'Critical') && !notes.trim()) {
      return Alert.alert('تسليم الشيفت', 'سجّل ملاحظات مفصلة للمشكلات الحرجة');
    }
    setSaving(true);
    try {
      await submitHandover({
        handover_notes: notes,
        task_ids: selected,
        requires_immediate_attention: urgent,
        incoming_user_id: incomingUserId,
      });
      setNotes('');
      setSelected([]);
      setUrgent([]);
      setIncomingUserId('');
      Alert.alert('تسليم الشيفت', 'تم إرسال تقرير التسليم للفني المحدد');
      await load();
    } catch (error) {
      Alert.alert('تعذر إرسال تقرير التسليم', error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  }

  async function respond(accept: boolean) {
    if (!latest || saving) return;
    if (!accept && !rejectReason.trim()) return Alert.alert('رفض الاستلام', 'اكتب سبب الرفض أولاً');
    setSaving(true);
    try {
      await confirmHandover(latest.id, accept, rejectReason);
      setRejectReason('');
      Alert.alert('تسليم الشيفت', accept ? 'تم تأكيد استلام الشيفت' : 'تم رفض الاستلام وإرسال السبب');
      await load();
    } catch (error) {
      Alert.alert('تعذر تحديث تقرير التسليم', error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  }

  const canRespond = !!latest && (profile?.role === 'admin' || latest.incoming_user_id === profile?.id);
  const canSubmit = !!profile?.id && !!incomingUserId && !saving;

  return (
    <Screen>
      <FlatList
        data={open}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListHeaderComponent={<>
          <Card><Title>تسليم الشيفت</Title><Text style={{ color: colors.muted, textAlign: 'right' }}>اختر الفني المستلم، ثم حدد المهام غير المنجزة وأضف ملاحظات الاستلام</Text></Card>
          {latest && <Card>
            <Text style={{ color: colors.text, textAlign: 'right', fontWeight: '800' }}>آخر تقرير: {latest.status}</Text>
            <Text style={{ color: colors.muted, textAlign: 'right' }}>من {latest.outgoing?.username ?? ''} إلى {latest.incoming?.username ?? 'غير محدد'}</Text>
            <Text style={{ color: colors.muted, textAlign: 'right' }}>{latest.handover_notes}</Text>
            {canRespond && latest.status === 'Submitted' && <>
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                <Button title="تأكيد استلام الشيفت" disabled={saving} onPress={() => { void respond(true); }} />
                <Button title="رفض مع سبب" variant="danger" disabled={saving} onPress={() => { void respond(false); }} />
              </View>
              <Input placeholder="سبب الرفض" value={rejectReason} onChangeText={setRejectReason} />
            </>}
            {!canRespond && latest.status === 'Submitted' && <Text style={{ color: colors.muted, textAlign: 'right' }}>بانتظار رد الفني المستلم: {latest.incoming?.username ?? 'غير محدد'}</Text>}
          </Card>}
          <Text style={{ color: colors.text, textAlign: 'right', fontWeight: '800', marginBottom: 6 }}>الفني المستلم</Text>
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {profiles.map((member) => <Button key={member.id} title={member.username} disabled={saving} variant={incomingUserId === member.id ? 'primary' : 'ghost'} onPress={() => setIncomingUserId(member.id)} />)}
          </View>
          <Input placeholder="ملاحظات التسليم التفصيلية" multiline value={notes} onChangeText={setNotes} />
        </>}
        ListEmptyComponent={<EmptyState title="لا توجد مهام مفتوحة" />}
        keyExtractor={(task) => task.id}
        renderItem={({ item }) => {
          const checked = selected.includes(item.id);
          return <Card>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
              <Badge label={item.priority} color={priorityColor(item.priority)} />
              <Button title={checked ? 'مختارة' : 'اختيار'} variant={checked ? 'primary' : 'ghost'} disabled={saving} onPress={() => setSelected(checked ? selected.filter((id) => id !== item.id) : [...selected, item.id])} />
            </View>
            <Text style={{ color: colors.text, textAlign: 'right', fontWeight: '800', marginTop: 6 }}>{item.title}</Text>
            {checked && <Button title={urgent.includes(item.id) ? 'تتطلب انتباه فوري ✓' : 'تتطلب انتباه فوري'} variant={urgent.includes(item.id) ? 'danger' : 'ghost'} disabled={saving} onPress={() => setUrgent(urgent.includes(item.id) ? urgent.filter((id) => id !== item.id) : [...urgent, item.id])} />}
          </Card>;
        }}
        ListFooterComponent={<Button title="إرسال تقرير التسليم" disabled={!canSubmit} loading={saving} onPress={() => { void submit(); }} />}
      />
    </Screen>
  );
}

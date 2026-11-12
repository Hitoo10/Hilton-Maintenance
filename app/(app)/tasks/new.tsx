import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Title, Button, Input } from '@/components/ui';
import { createTask, listProfiles } from '@/services/api';
import type { Category, Priority, Profile, TaskStatus } from '@/lib/types';
import { colors } from '@/lib/theme';

const categories: Category[] = ['HVAC','Electrical','Plumbing','Cold Rooms','Freezing Rooms','Chillers','Refrigeration','General'];
const priorities: Priority[] = ['Low','Medium','High','Critical'];

export default function NewTask() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [form, setForm] = useState({ title: '', description: '', location: '', room_number: '', floor: '', department: '', equipment_type: '', category: 'General' as Category, priority: 'Medium' as Priority, status: 'New' as TaskStatus, assigned_to: '' });
  const [loading, setLoading] = useState(false);
  useEffect(() => { listProfiles().then(setProfiles).catch(() => {}); }, []);
  async function save() {
    if (!form.title.trim() || !form.location.trim()) return Alert.alert('مهمة جديدة', 'أدخل العنوان والموقع');
    setLoading(true);
    try {
      await createTask({ ...form, assigned_to: form.assigned_to || null, room_number: form.room_number || null, floor: form.floor || null, department: form.department || null, equipment_type: form.equipment_type || null });
      router.back();
    } catch (e: any) { Alert.alert('مهمة جديدة', e.message ?? 'تعذر الحفظ'); } finally { setLoading(false); }
  }
  function Picker<T extends string>({ label, values, value, onChange }: { label: string; values: T[]; value: T; onChange: (v: T) => void }) {
    return <View style={{ marginBottom: 10 }}><Text style={{ color: colors.muted, textAlign: 'right', marginBottom: 6 }}>{label}</Text><View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>{values.map((v) => <Button key={v} title={v} variant={value === v ? 'primary' : 'ghost'} onPress={() => onChange(v)} />)}</View></View>;
  }
  return (
    <Screen><ScrollView>
      <Card><Title>مهمة جديدة</Title></Card>
      <Input placeholder="عنوان المهمة" value={form.title} onChangeText={(title) => setForm({ ...form, title })} />
      <Input placeholder="الوصف التفصيلي" multiline value={form.description} onChangeText={(description) => setForm({ ...form, description })} />
      <Input placeholder="الموقع / القسم" value={form.location} onChangeText={(location) => setForm({ ...form, location })} />
      <Input placeholder="رقم الغرفة" value={form.room_number} onChangeText={(room_number) => setForm({ ...form, room_number })} />
      <Input placeholder="الطابق" value={form.floor} onChangeText={(floor) => setForm({ ...form, floor })} />
      <Input placeholder="نوع المعدات" value={form.equipment_type} onChangeText={(equipment_type) => setForm({ ...form, equipment_type })} />
      <Picker label="القسم" values={categories} value={form.category} onChange={(category) => setForm({ ...form, category })} />
      <Picker label="الأولوية" values={priorities} value={form.priority} onChange={(priority) => setForm({ ...form, priority })} />
      <Text style={{ color: colors.muted, textAlign: 'right', marginBottom: 6 }}>إسناد إلى فني</Text>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>
        <Button title="بدون إسناد" variant={!form.assigned_to ? 'primary' : 'ghost'} onPress={() => setForm({ ...form, assigned_to: '' })} />
        {profiles.map((p) => <Button key={p.id} title={p.username} variant={form.assigned_to === p.id ? 'primary' : 'ghost'} onPress={() => setForm({ ...form, assigned_to: p.id })} />)}
      </View>
      <Button title="حفظ المهمة" onPress={save} loading={loading} />
    </ScrollView></Screen>
  );
}

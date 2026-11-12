import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, Card, Title, Subtitle, Badge, Button } from '@/components/ui';
import { getDashboard, priorityColor, statusColor } from '@/services/api';
import { useAuth } from '@/state/AuthContext';
import { colors } from '@/lib/theme';
import type { Task } from '@/lib/types';

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return <Card style={{ flex: 1, minWidth: '45%' }}><Text style={{ color: colors.muted, textAlign: 'right' }}>{label}</Text><Text style={{ color, fontSize: 28, fontWeight: '900', textAlign: 'right' }}>{value}</Text></Card>;
}

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => { setRefreshing(true); try { setData(await getDashboard()); } finally { setRefreshing(false); } };
  useFocusEffect(useCallback(() => { load(); }, []));
  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View><Title>{profile?.username ?? 'فني'}</Title><Subtitle>فريق الصيانة</Subtitle></View>
          <Button title="خروج" variant="ghost" onPress={signOut} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Stat label="إجمالي المهام" value={data?.total ?? 0} color={colors.text} />
          <Stat label="جديدة" value={data?.newCount ?? 0} color={colors.primary} />
          <Stat label="قيد التنفيذ" value={data?.inProgress ?? 0} color={colors.primary} />
          <Stat label="معلقة" value={data?.pending ?? 0} color={colors.orange} />
          <Stat label="مكتملة" value={data?.completed ?? 0} color={colors.green} />
          <Stat label="حرجة" value={data?.critical ?? 0} color={colors.red} />
          <Stat label="فنيون نشطون" value={data?.activeTechnicians ?? 0} color={colors.text} />
        </View>
        <Card>
          <Text style={{ color: colors.text, fontWeight: '800', textAlign: 'right', marginBottom: 6 }}>الشيفت الحالي</Text>
          {(data?.shifts ?? []).map((s: any) => <Text key={s.id} style={{ color: colors.muted, textAlign: 'right' }}>{s.name}: {s.start_time} - {s.end_time}</Text>)}
        </Card>
        <Card>
          <Text style={{ color: colors.text, fontWeight: '800', textAlign: 'right', marginBottom: 6 }}>آخر تسليم شيفت</Text>
          {data?.latestHandover ? <Text style={{ color: colors.muted, textAlign: 'right' }}>{data.latestHandover.status} • من {data.latestHandover.outgoing?.username ?? ''}</Text> : <Text style={{ color: colors.muted, textAlign: 'right' }}>لا يوجد</Text>}
        </Card>
        <Text style={{ color: colors.text, fontWeight: '900', textAlign: 'right', marginVertical: 8 }}>أحدث المهام</Text>
        {(data?.latestTasks ?? []).map((t: Task) => (
          <Card key={t.id}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
              <Badge label={t.priority} color={priorityColor(t.priority)} />
              <Badge label={t.status} color={statusColor(t.status)} />
            </View>
            <Text style={{ color: colors.text, textAlign: 'right', marginTop: 8, fontWeight: '700' }}>{t.title}</Text>
            <Text style={{ color: colors.muted, textAlign: 'right' }}>{t.location}</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, Card, Button, EmptyState } from '@/components/ui';
import { listNotifications, markAllNotificationsRead } from '@/services/api';
import type { NotificationItem } from '@/lib/types';
import { colors } from '@/lib/theme';

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => { setRefreshing(true); try { setItems(await listNotifications()); } finally { setRefreshing(false); } };
  useFocusEffect(useCallback(() => { load(); }, []));
  return (
    <Screen>
      <Button title="تحديد الكل كمقروء" onPress={() => markAllNotificationsRead().then(load)} />
      <FlatList data={items} keyExtractor={(n) => n.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />} ListEmptyComponent={<EmptyState title="لا توجد إشعارات" />} renderItem={({ item }) => <Card style={{ borderColor: item.read_at ? colors.border : colors.primary }}><Text style={{ color: colors.text, textAlign: 'right', fontWeight: '800' }}>{item.title}</Text><Text style={{ color: colors.muted, textAlign: 'right' }}>{item.body}</Text></Card>} />
    </Screen>
  );
}

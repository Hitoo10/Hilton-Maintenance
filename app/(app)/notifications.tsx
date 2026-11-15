import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, Card, Button, EmptyState } from '@/components/ui';
import { listNotifications, markAllNotificationsRead } from '@/services/api';
import type { NotificationItem } from '@/lib/types';
import { colors } from '@/lib/theme';

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setItems(await listNotifications());
    } catch (error) {
      Alert.alert('تعذر تحميل الإشعارات', error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function markAllRead() {
    if (saving) return;
    setSaving(true);
    try {
      await markAllNotificationsRead();
      await load();
    } catch (error) {
      Alert.alert('تعذر تحديث الإشعارات', error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Button title="تحديد الكل كمقروء" disabled={saving} loading={saving} onPress={() => { void markAllRead(); }} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={<EmptyState title={refreshing ? 'جارٍ تحميل الإشعارات...' : 'لا توجد إشعارات'} />}
        renderItem={({ item }) => (
          <Card style={{ borderColor: item.read_at ? colors.border : colors.primary }}>
            <Text style={{ color: colors.text, textAlign: 'right', fontWeight: '800' }}>{item.title}</Text>
            <Text style={{ color: colors.muted, textAlign: 'right' }}>{item.body}</Text>
          </Card>
        )}
      />
    </Screen>
  );
}

import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Screen, Card, Badge, Button, Input, EmptyState } from '@/components/ui';
import { listTasks, priorityColor, statusColor } from '@/services/api';
import type { Task, TaskStatus } from '@/lib/types';
import { colors } from '@/lib/theme';

const statuses: Array<TaskStatus | 'All'> = ['All', 'New', 'In Progress', 'Pending', 'Completed'];

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus | 'All'>('All');
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => { setRefreshing(true); try { setTasks(await listTasks(search, status)); } finally { setRefreshing(false); } };
  useFocusEffect(useCallback(() => { load(); }, [search, status]));
  return (
    <Screen>
      <View style={{ flexDirection: 'row-reverse', gap: 8, marginBottom: 8 }}>
        <View style={{ flex: 1 }}><Input placeholder="بحث في المهام" value={search} onChangeText={setSearch} /></View>
        <Link href="/tasks/new" asChild><Button title="+" /></Link>
      </View>
      <FlatList
        data={statuses}
        horizontal
        inverted
        keyExtractor={(s) => s}
        style={{ marginBottom: 8 }}
        renderItem={({ item }) => <Button title={item === 'All' ? 'الكل' : item} variant={status === item ? 'primary' : 'ghost'} onPress={() => setStatus(item)} />}
      />
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={<EmptyState title="لا توجد مهام" />}
        renderItem={({ item }) => (
          <Link href={`/tasks/${item.id}`} asChild>
            <Card>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                <Badge label={item.priority} color={priorityColor(item.priority)} />
                <Badge label={item.status} color={statusColor(item.status)} />
              </View>
              <Text style={{ color: colors.text, fontWeight: '800', textAlign: 'right', marginTop: 8 }}>{item.title}</Text>
              <Text style={{ color: colors.muted, textAlign: 'right' }}>{item.location} {item.room_number ? `• غرفة ${item.room_number}` : ''}</Text>
            </Card>
          </Link>
        )}
      />
    </Screen>
  );
}

import React from 'react';
import { Tabs } from 'expo-router';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border } }}>
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="tasks" options={{ title: 'المهام' }} />
      <Tabs.Screen name="handover" options={{ title: 'الشيفت' }} />
      <Tabs.Screen name="chat" options={{ title: 'الدردشة' }} />
      <Tabs.Screen name="notifications" options={{ title: 'الإشعارات' }} />
      <Tabs.Screen name="profile" options={{ title: 'حسابي' }} />
    </Tabs>
  );
}

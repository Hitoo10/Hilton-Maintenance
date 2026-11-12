import '../src/lib/i18n-rtl';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/state/AuthContext';
import { NetProvider, useNet } from '@/state/OfflineContext';
import { ActivityIndicator, Text, View } from 'react-native';
import { colors } from '@/lib/theme';
import { ar } from '@/lib/labels';

function Guard() {
  const { session, profile, loading } = useAuth();
  const { online } = useNet();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) router.replace('/(auth)/login');
    else if (session && profile?.status !== 'active' && !inAuthGroup) router.replace('/(auth)/login');
    else if (session && profile?.status === 'active' && inAuthGroup) router.replace('/');
  }, [session, profile, loading, segments]);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}><ActivityIndicator color={colors.primary} /></View>;
  return (
    <>
      {!online && <View style={{ backgroundColor: colors.orange, padding: 8 }}><Text style={{ color: '#111', textAlign: 'center', fontWeight: '700' }}>{ar.offline}</Text></View>}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      <StatusBar style="light" />
    </>
  );
}

export default function RootLayout() {
  return <AuthProvider><NetProvider><Guard /></NetProvider></AuthProvider>;
}

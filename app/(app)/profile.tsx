import React from 'react';
import { Text } from 'react-native';
import { Screen, Card, Title, Button } from '@/components/ui';
import { useAuth } from '@/state/AuthContext';
import { colors } from '@/lib/theme';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  return (
    <Screen>
      <Card><Title>{profile?.username}</Title><Text style={{ color: colors.muted, textAlign: 'right' }}>الدور: {profile?.role}</Text><Text style={{ color: colors.muted, textAlign: 'right' }}>الحالة: {profile?.status}</Text><Text style={{ color: colors.muted, textAlign: 'right' }}>تاريخ الإنشاء: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ar') : ''}</Text></Card>
      <Button title="تسجيل الخروج" variant="danger" onPress={signOut} />
    </Screen>
  );
}

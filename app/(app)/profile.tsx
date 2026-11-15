import React from 'react';
import { Alert, Text } from 'react-native';
import { Screen, Card, Title, Button } from '@/components/ui';
import { useAuth } from '@/state/AuthContext';
import { colors } from '@/lib/theme';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();

  async function logout() {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('تعذر تسجيل الخروج', error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    }
  }

  return (
    <Screen>
      <Card>
        <Title>{profile?.username}</Title>
        <Text style={{ color: colors.muted, textAlign: 'right' }}>الدور: {profile?.role}</Text>
        <Text style={{ color: colors.muted, textAlign: 'right' }}>الحالة: {profile?.status}</Text>
        <Text style={{ color: colors.muted, textAlign: 'right' }}>تاريخ الإنشاء: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ar') : ''}</Text>
      </Card>
      <Button title="تسجيل الخروج" variant="danger" onPress={() => { void logout(); }} />
    </Screen>
  );
}

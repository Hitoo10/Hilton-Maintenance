import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import {
  Screen,
  Card,
  Title,
  Subtitle,
  Button,
  Input,
} from '@/components/ui';
import { invokeFunction, supabase } from '@/lib/supabase';
import { useAuth } from '@/state/AuthContext';
import { isValidPin, normalizeUsername } from '@/utils/validation';
import { ar } from '@/lib/labels';

type LoginResponse = {
  token_hash?: string;
};

export default function LoginScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    const name = normalizeUsername(username);

    if (name.length < 3 || !isValidPin(pin)) {
      Alert.alert(ar.login, ar.wrongCredentials);
      return;
    }

    setLoading(true);

    try {
      const res = await invokeFunction<LoginResponse>(
        'username-login',
        { username: name, pin }
      );

      if (!res.token_hash) {
        throw new Error('Invalid token response');
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.verifyOtp({
          token_hash: res.token_hash,
          type: 'magiclink',
        });

      if (sessionError) throw sessionError;

      const authenticatedUserId = sessionData.session?.user?.id;
      if (!authenticatedUserId) {
        throw new Error('Authenticated user ID is missing');
      }

      const currentProfile = await refreshProfile(authenticatedUserId);

      if (!currentProfile || currentProfile.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error('Profile is unavailable or inactive');
      }

      router.replace('/');
    } catch {
      Alert.alert(ar.login, ar.wrongCredentials);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
          }}
        >
          <Card>
            <Title>{ar.appName}</Title>
            <Subtitle>إدارة صيانة الفندق بين الشيفتات</Subtitle>

            <Input
              autoCapitalize="none"
              placeholder={ar.username}
              value={username}
              onChangeText={setUsername}
            />

            <Input
              placeholder="الرقم السري المكوّن من 4 أرقام"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={pin}
              onChangeText={(value) => setPin(value.replace(/[^0-9]/g, '').slice(0, 4))}
            />

            <Button title={ar.login} onPress={login} loading={loading} />

            <Link href="/(auth)/register" asChild>
              <Button title={ar.createAccount} variant="ghost" />
            </Link>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

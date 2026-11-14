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
import { isStrongPassword, normalizeUsername } from '@/utils/validation';
import { ar } from '@/lib/labels';

type LoginResponse = {
  session?: {
    access_token?: string;
    refresh_token?: string;
  };
};

export default function LoginScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    const name = normalizeUsername(username);

    if (name.length < 3 || !isStrongPassword(password)) {
      Alert.alert(ar.login, ar.wrongCredentials);
      return;
    }

    setLoading(true);

    try {
      const res = await invokeFunction<LoginResponse>(
        'username-login',
        { username: name, password }
      );

      const accessToken = res.session?.access_token;
      const refreshToken = res.session?.refresh_token;

      if (!accessToken || !refreshToken) {
        throw new Error('Invalid session response');
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
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
              placeholder={ar.password}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
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
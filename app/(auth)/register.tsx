import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Title, Subtitle, Button, Input } from '@/components/ui';
import { invokeFunction } from '@/lib/supabase';
import { isStrongPassword, normalizeUsername } from '@/utils/validation';
import { ar } from '@/lib/labels';

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function register() {
    const name = normalizeUsername(username);
    const job = jobTitle.trim();

    if (name.length < 3) {
      return Alert.alert(ar.createAccount, 'اسم المستخدم يجب أن يكون من 3 إلى 32 حرفًا');
    }

    if (!isStrongPassword(password)) {
      return Alert.alert(ar.createAccount, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتتضمن حرفًا كبيرًا وحرفًا صغيرًا ورقمًا');
    }

    if (password !== confirmPassword) {
      return Alert.alert(ar.createAccount, ar.passwordMismatch);
    }

    setLoading(true);

    try {
      const result = await invokeFunction<{
        error?: string;
        message?: string;
        ok?: boolean;
      }>('register-user', {
        username: name,
        password,
        job_title: job || null,
      });

      if (result.error) throw new Error(result.error);

      Alert.alert(
        ar.createAccount,
        result.message ?? 'تم إنشاء الحساب بانتظار موافقة المسؤول',
        [{ text: 'حسنًا', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (error: any) {
      const message = String(error?.message ?? '');
      Alert.alert(
        ar.createAccount,
        message.includes('موجود') ? ar.usernameTaken : message || 'تعذر إنشاء الحساب'
      );
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
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <Card>
            <Title>{ar.createAccount}</Title>
            <Subtitle>
              أنشئ حسابك وانتظر موافقة مسؤول النظام قبل تسجيل الدخول
            </Subtitle>

            <Input
              autoCapitalize="none"
              placeholder={ar.username}
              value={username}
              onChangeText={setUsername}
            />

            <Input
              placeholder="المسمى الوظيفي"
              value={jobTitle}
              onChangeText={setJobTitle}
            />

            <Input
              placeholder={ar.password}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Input
              placeholder={ar.confirmPassword}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <Button title={ar.createAccount} onPress={register} loading={loading} />

            <Button
              title="لديك حساب؟ دخول"
              variant="ghost"
              onPress={() => router.back()}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
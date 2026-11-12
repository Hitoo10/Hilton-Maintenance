import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: { params: { eventsPerSecond: 10 } },
  }
);

export async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    let message = error.message || 'حدث خطأ في الخادم';

    try {
      const response = (error as any).context;
      if (response && typeof response.clone === 'function') {
        const payload = await response.clone().json();
        message = payload?.error || payload?.message || message;
      }
    } catch {
      // نحتفظ برسالة الخطأ الأصلية إذا تعذر تحليل رد الخادم.
    }

    throw new Error(message);
  }

  if (data == null) {
    throw new Error('الخادم لم يُرجع بيانات');
  }

  return data as T;
}

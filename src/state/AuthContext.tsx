import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: (userId?: string) => Promise<Profile | null>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => null,
  signOut: async () => {},
});

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const mounted = useRef(true);
  const sessionRef = useRef<Session | null>(null);
  const requestVersion = useRef(0);
  const authEventVersion = useRef(0);

  const loadProfile = useCallback(async (
    userId: string | null
  ): Promise<Profile | null> => {
    const version = ++requestVersion.current;

    if (!userId) {
      if (mounted.current && version === requestVersion.current) {
        setProfile(null);
      }
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!mounted.current || version !== requestVersion.current) {
        return null;
      }

      if (error || !data) {
        setProfile(null);
        return null;
      }

      const result = data as Profile;
      setProfile(result);
      return result;
    } catch {
      if (mounted.current && version === requestVersion.current) {
        setProfile(null);
      }
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async (userId?: string): Promise<Profile | null> => {
    const targetUserId = userId ?? sessionRef.current?.user?.id ?? null;
    return loadProfile(targetUserId);
  }, [loadProfile]);

  useEffect(() => {
    mounted.current = true;

    const { data: authSubscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        const eventVersion = ++authEventVersion.current;

        sessionRef.current = nextSession;
        setSession(nextSession);

        if (!nextSession) {
          requestVersion.current += 1;
          setProfile(null);
          setLoading(false);
          return;
        }

        // لا ننفذ استعلام Supabase داخل callback المصادقة نفسه.
        void Promise.resolve().then(async () => {
          await loadProfile(nextSession.user.id);

          if (
            mounted.current &&
            eventVersion === authEventVersion.current
          ) {
            setLoading(false);
          }
        });
      }
    );

    const appStateSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') {
          void supabase.auth.startAutoRefresh();
        } else {
          supabase.auth.stopAutoRefresh();
        }
      }
    );

    if (AppState.currentState === 'active') {
      void supabase.auth.startAutoRefresh();
    }

    const initialEventVersion = authEventVersion.current;

    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted.current) return;

      // أي حدث أحدث للمصادقة له الأولوية على نتيجة getSession القديمة.
      if (authEventVersion.current !== initialEventVersion) return;

      if (error) {
        sessionRef.current = null;
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const currentSession = data.session;

      sessionRef.current = currentSession;
      setSession(currentSession);

      await loadProfile(currentSession?.user?.id ?? null);

      if (
        mounted.current &&
        authEventVersion.current === initialEventVersion
      ) {
        setLoading(false);
      }
    }).catch(() => {
      // لا نمسح جلسة أحدث إذا وصل حدث مصادقة أثناء getSession.
      if (
        mounted.current &&
        authEventVersion.current === initialEventVersion
      ) {
        sessionRef.current = null;
        setSession(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted.current = false;
      authSubscription.subscription.unsubscribe();
      appStateSubscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [loadProfile]);

  const value = useMemo<AuthState>(() => ({
    session,
    profile,
    loading,
    refreshProfile,
    signOut: async () => {
      const userId = sessionRef.current?.user?.id ?? null;

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      sessionRef.current = null;
      setSession(null);
      setProfile(null);
    },
  }), [session, profile, loading, refreshProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

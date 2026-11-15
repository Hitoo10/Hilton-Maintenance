import React, { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Screen, Card, Button, Input, EmptyState } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { listMessages, sendMessage } from '@/services/api';
import type { Message } from '@/lib/types';
import { colors } from '@/lib/theme';

export default function TeamChat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const initializeChat = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) throw new Error('يجب تسجيل الدخول لفتح دردشة الفريق');

        const userId = authData.user.id;
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;
        if (!profile?.team_id) throw new Error('حسابك غير مرتبط بفريق صيانة');

        const teamId = profile.team_id;
        const { data: existing, error: lookupError } = await supabase
          .from('conversations')
          .select('id')
          .eq('team_id', teamId)
          .eq('type', 'group')
          .maybeSingle();

        if (lookupError) throw lookupError;

        let currentConversationId = existing?.id;

        if (!currentConversationId) {
          const { data: created, error: createError } = await supabase
            .from('conversations')
            .insert({ team_id: teamId, type: 'group', title: 'فريق الصيانة' })
            .select('id')
            .single();

          if (createError?.code === '23505') {
            const { data: raced, error: raceError } = await supabase
              .from('conversations')
              .select('id')
              .eq('team_id', teamId)
              .eq('type', 'group')
              .single();
            if (raceError) throw raceError;
            currentConversationId = raced.id;
          } else {
            if (createError) throw createError;
            if (!created?.id) throw new Error('تعذر إنشاء محادثة الفريق');
            currentConversationId = created.id;

            const { data: members, error: membersError } = await supabase
              .from('profiles')
              .select('id')
              .eq('team_id', teamId)
              .eq('status', 'active');
            if (membersError) throw membersError;

            if (members?.length) {
              const { error: insertMembersError } = await supabase
                .from('conversation_members')
                .upsert(
                  members.map((member) => ({
                    conversation_id: currentConversationId,
                    user_id: member.id,
                  })),
                  { onConflict: 'conversation_id,user_id', ignoreDuplicates: true }
                );
              if (insertMembersError) throw insertMembersError;
            }
          }
        }

        const initialMessages = await listMessages(currentConversationId);
        if (active) {
          setCurrentUserId(userId);
          setConversationId(currentConversationId);
          setMessages(initialMessages);
        }
      } catch (error) {
        if (active) Alert.alert('تعذر فتح دردشة الفريق', error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
      } finally {
        if (active) setLoading(false);
      }
    };

    void initializeChat();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async () => {
        try {
          setMessages(await listMessages(conversationId));
        } catch (error) {
          Alert.alert('تعذر تحديث الرسائل', error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId]);

  async function send() {
    const message = body.trim();
    if (!message || !conversationId || sending) return;
    setSending(true);
    try {
      await sendMessage(conversationId, message);
      setBody('');
    } catch (error) {
      Alert.alert('تعذر إرسال الرسالة', error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          inverted
          data={[...messages].reverse()}
          keyExtractor={(message) => message.id}
          ListEmptyComponent={<EmptyState title={loading ? 'جارٍ فتح المحادثة...' : 'لا توجد رسائل'} />}
          renderItem={({ item }) => (
            <Card style={{ alignSelf: item.sender_id === currentUserId ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'right' }}>{item.sender?.username ?? 'مستخدم'}</Text>
              <Text style={{ color: colors.text, textAlign: 'right', marginTop: 4 }}>{item.body}</Text>
              <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4, textAlign: 'left' }}>
                {new Date(item.created_at).toLocaleTimeString('ar')}
              </Text>
            </Card>
          )}
        />
        <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Input placeholder="اكتب رسالة" value={body} onChangeText={setBody} editable={!loading && !!conversationId && !sending} />
          </View>
          <Button title="إرسال" disabled={loading || !conversationId || !body.trim() || sending} loading={sending} onPress={() => { void send(); }} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

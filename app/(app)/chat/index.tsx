import React, { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Screen, Card, Button, Input, EmptyState } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { listMessages, sendMessage } from '@/services/api';
import type { Message } from '@/lib/types';
import { colors } from '@/lib/theme';

export default function TeamChat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');

  useEffect(() => {
    let active = true;

    const initializeChat = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('team_id')
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile?.team_id) {
          console.error('Chat initialization: profile or team_id is missing');
          return;
        }

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
            .insert({
              team_id: teamId,
              type: 'group',
              title: 'فريق الصيانة',
            })
            .select('id')
            .single();

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
              .insert(
                members.map((member) => ({
                  conversation_id: currentConversationId,
                  user_id: member.id,
                }))
              );

            if (insertMembersError) throw insertMembersError;
          }
        }

        const initialMessages = await listMessages(currentConversationId);

        if (active) {
          setConversationId(currentConversationId);
          setMessages(initialMessages);
        }
      } catch (error) {
        console.error('Chat initialization failed:', error);
      }
    };

    initializeChat();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          try {
            setMessages(await listMessages(conversationId));
          } catch (error) {
            console.error('Loading chat messages failed:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const send = async () => {
    if (!body.trim() || !conversationId) return;

    try {
      await sendMessage(conversationId, body);
      setBody('');
    } catch (error) {
      console.error('Sending message failed:', error);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          inverted
          data={[...messages].reverse()}
          keyExtractor={(message) => message.id}
          ListEmptyComponent={<EmptyState title="لا توجد رسائل" />}
          renderItem={({ item }) => (
            <Card
              style={{
                alignSelf: item.sender_id ? 'flex-start' : 'flex-end',
                maxWidth: '85%',
              }}
            >
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 11,
                  textAlign: 'right',
                }}
              >
                {item.sender?.username}
              </Text>
              <Text
                style={{
                  color: colors.text,
                  textAlign: 'right',
                  marginTop: 4,
                }}
              >
                {item.body}
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 10,
                  marginTop: 4,
                  textAlign: 'left',
                }}
              >
                {new Date(item.created_at).toLocaleTimeString('ar')}
              </Text>
            </Card>
          )}
        />

        <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="اكتب رسالة"
              value={body}
              onChangeText={setBody}
            />
          </View>
          <Button title="إرسال" onPress={send} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

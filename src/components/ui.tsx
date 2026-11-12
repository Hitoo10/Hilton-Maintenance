import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/lib/theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Title({ children }: { children: React.ReactNode }) { return <Text style={styles.title}>{children}</Text>; }
export function Subtitle({ children }: { children: React.ReactNode }) { return <Text style={styles.subtitle}>{children}</Text>; }
export function Button({ title, onPress, variant = 'primary', loading, disabled }: { title: string; onPress?: () => void; variant?: 'primary'|'ghost'|'danger'; loading?: boolean; disabled?: boolean }) {
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.red : 'transparent';
  return (
    <Pressable disabled={disabled || loading} onPress={onPress} style={[styles.button, { backgroundColor: bg, borderColor: variant === 'ghost' ? colors.border : bg, opacity: disabled ? 0.6 : 1 }]}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.buttonText, variant === 'ghost' && { color: colors.text }]}>{title}</Text>}
    </Pressable>
  );
}
export function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}
export function Badge({ label, color }: { label: string; color: string }) {
  return <View style={[styles.badge, { borderColor: color }]}><Text style={[styles.badgeText, { color }]}>{label}</Text></View>;
}
export function EmptyState({ title }: { title: string }) { return <Card><Text style={{ color: colors.muted, textAlign: 'center' }}>{title}</Text></Card>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing(5), paddingTop: spacing(14) },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing(4), marginBottom: spacing(3) },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'right', marginBottom: spacing(2) },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'right', marginBottom: spacing(4) },
  button: { minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: spacing(2) },
  buttonText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  input: { backgroundColor: colors.card2, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing(4), minHeight: 52, textAlign: 'right', marginBottom: spacing(3) },
  badge: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing(3), paddingVertical: spacing(1), alignSelf: 'flex-start' },
  badgeText: { fontWeight: '700', fontSize: 12 },
});

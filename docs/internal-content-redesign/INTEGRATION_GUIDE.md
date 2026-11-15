# Internal Content Redesign — Integration Guide

## Current status
The redesign is staged under `src/features/internal-content-redesign/`. It is intentionally not registered in Expo Router and does not replace any current route. This keeps the existing application behavior available while the redesign is reviewed.

## Existing contracts reused
- `@/services/api`: tasks, profiles, notifications, task updates.
- `@/lib/types`: Task, TaskStatus, Priority, Category, Profile, NotificationItem.
- `@/lib/theme`: base palette, spacing, radius.
- `@/state/AuthContext`: authenticated profile and sign-out.
- `@/components/ui`: existing Screen, Button, Input, Title, Subtitle.

## Preserved behavior
- Task details: status updates, priority updates, critical-task completion note guard, task comments, and live task refresh.
- Notifications: list and mark-all-read action.
- Team: active profiles, job title, and role.
- Archive: completed tasks only.
- Existing login, registration, chat, handover, task creation, profile, offline state, and Supabase integration remain in their original routes/files.

## Safe integration sequence
1. Run `npm ci` and `npm run typecheck`.
2. Review each proposed route mapping against the current route's features.
3. Integrate one route at a time; do not remove original actions or validation.
4. Test on Android with admin and technician accounts.
5. Verify task updates, priority changes, comments, notification read state, team visibility, and realtime refresh.
6. Only then consider merging route changes.

## Protected backend/authentication scope
No changes are authorized or included here to:
- `supabase/migrations/**`
- `supabase/functions/**`
- `src/lib/supabase.ts`
- `src/state/AuthContext.tsx`
- `app/(auth)/**`
- `src/utils/validation.ts`

## Known limitation
The home screen's urgent/normal grouping is derived from task priority (High/Critical versus Medium/Low). It does not identify a separate reception-originated report type because the current Task contract has no such field.

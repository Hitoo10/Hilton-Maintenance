# File Map — Internal Content Redesign

The files below are staged as a feature module. They are **not** direct replacements for current route files.

| Staged feature file | Current application counterpart | Safe action |
|---|---|---|
| `screens/HomeScreen.tsx` | `app/(app)/index.tsx` | Compare and integrate selectively; preserve dashboard statistics and shift/handover summary |
| `screens/ReportsScreen.tsx` | `app/(app)/tasks/index.tsx` | Compare and integrate selectively; preserve task creation route |
| `screens/ReportDetailsScreen.tsx` | `app/(app)/tasks/[id].tsx` | Compare and integrate selectively; retain priority controls and comments |
| `screens/ArchiveScreen.tsx` | New route | Add only after route/navigation review |
| `screens/TeamScreen.tsx` | New route | Add only after role/permission review |
| `screens/NotificationsScreen.tsx` | `app/(app)/notifications.tsx` | Compare and integrate selectively |
| `components/**` | `src/components/ui.tsx` | Keep feature-scoped; do not replace shared UI |
| `theme/theme.ts` | `src/lib/theme.ts` | Semantic extension only; base theme remains authoritative |
| `utils/**` | `src/lib/labels.ts` | Feature-scoped helpers; do not overwrite shared labels |

## Protected files
Authentication, Supabase client, migrations, RLS, Edge Functions, validation, root layout, and existing chat/handover/task-creation routes must not be overwritten as part of this UI-only integration.

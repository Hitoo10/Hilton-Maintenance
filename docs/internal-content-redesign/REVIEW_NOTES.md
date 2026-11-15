# Review Notes — Internal Content Redesign

## Findings addressed
1. The initial report-details screen omitted priority editing and task-comment creation present in the existing route. Both actions have been restored in the staged screen.
2. The initial team screen omitted the existing `Profile.job_title` field. It now displays job title with role fallback.
3. The initial file map suggested wholesale route replacement. It has been corrected to a staged, selective integration plan.
4. The home-screen subtitle previously claimed a reception-only filter that the data model does not implement. The label now describes the actual priority grouping.

## Compatibility review
- All referenced Task, Profile, NotificationItem, TaskStatus, Priority, Category, and Role fields exist in `src/lib/types.ts`.
- The used API exports exist in `src/services/api.ts`.
- The shared UI exports and theme tokens exist in `src/components/ui.tsx` and `src/lib/theme.ts`.
- Existing task comments use the `task_comments` table and the same `task_id/user_id/body` payload as the current task-details route.

## Not verified
- TypeScript/Expo build has not been executed in this environment.
- No Android device/runtime tests have been executed.
- No Supabase project, database, or Edge Function was contacted or modified.
- Realtime, RLS, and role-specific behavior still require live testing.

## Known product limitation
The current data model has no explicit reception-origin field on Task. The UI must not label priority-based results as reception-only reports.

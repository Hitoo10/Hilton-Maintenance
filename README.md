# ShiftFlow Maintenance

React Native + Expo + TypeScript + Expo Router + Supabase hotel maintenance team system.

## Truth about this deliverable
This archive contains source code, SQL migrations, EAS config, and build instructions. It does **not** contain a generated APK because this chat environment has no Android SDK, EAS cloud credentials, Supabase project, or physical devices. Do not treat any APK as produced unless you run the build commands below and verify it.

## Setup
1. Create a Supabase project.
2. In Supabase SQL editor run `supabase/migrations/0001_init.sql` or use Supabase CLI migrations.
3. Enable Realtime for: `tasks`, `task_comments`, `messages`, `notifications`, `handovers`, `critical_alerts`.
4. Set Edge Function secrets:
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... ADMIN_SETUP_CODE=change-me
   supabase functions deploy register-user
   supabase functions deploy username-login
   ```
5. App env:
   ```bash
   cp .env.example .env
   # fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
   npm install
   npm run typecheck
   ```

## Authentication model
Supabase Auth uses email internally. Usernames map to private emails via Edge Functions:
- registration: username normalized -> `{normalized_username}@users.shiftflow.local` auth user, profile row, invitation/admin approval gate.
- login: Edge Function resolves username, verifies auth password, returns a session for the app.
Service role key stays only in Edge Function secrets.

## Build APK
```bash
npm i -g eas-cli
eas login
eas configure   # or replace app.json extra.eas.projectId
eas build --platform android --profile preview
eas build --platform android --profile production
```
Use `preview` for an internal APK and `production` for signed release after configuring credentials in EAS.

## Required manual verification
- Two physical Android devices install the same APK.
- Create/update tasks and confirm Realtime sync.
- Handover submit -> incoming confirm/reject with reason.
- Group/private chat, unread counts, image message.
- Push notification permission and delivery.
- Audit log append-only from technician account.

## Important files
- `supabase/migrations/0001_init.sql` — schema, indexes, RLS, audit trigger.
- `supabase/functions/*/index.ts` — username auth edge functions.
- `src/lib/supabase.ts` — client, secure session storage, Realtime helpers.
- `app/*` — Expo Router screens.
- `src/state/*` — auth/offline/sync state.

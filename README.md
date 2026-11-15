# ShiftFlow Maintenance

React Native + Expo + TypeScript + Expo Router + Supabase hotel maintenance team system.

## Truth about this deliverable
This repository contains source code, SQL migrations, EAS configuration, and build instructions. It does **not** contain a generated APK. Do not treat an APK as produced unless an Android/EAS build succeeds and the resulting artifact is verified.

## Setup
1. Create a Supabase project.
2. Apply `supabase/migrations/0001_init.sql` using the Supabase SQL editor or Supabase CLI.
3. Enable Realtime for the tables required by the app, including tasks, task comments, messages, notifications, handovers, and critical alerts where present in the schema.
4. Configure Edge Function secrets and deploy the required functions:
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... ADMIN_SETUP_CODE=change-me
   supabase functions deploy register-user
   supabase functions deploy username-login
   supabase functions deploy setup-admin-pin
   ```
5. Configure app environment variables:
   ```bash
   cp .env.example .env
   # Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
   npm ci
   npm run typecheck
   ```

## Authentication model
Supabase Auth uses email internally. Usernames are resolved through Edge Functions:
- Registration normalizes the username and creates the corresponding internal auth identity and profile, subject to the configured invitation/admin approval flow.
- Username login resolves the username and verifies the password through the Edge Function.
- The Supabase service-role key must remain only in Edge Function secrets. Never place it in the mobile app.

## Build APK
Configure EAS credentials and project ID first, then run:
```bash
eas build --platform android --profile preview
eas build --platform android --profile production
```
Use the preview profile for internal testing and production only after signing credentials and release configuration are verified.

## Required manual verification
- Install the same APK on two physical Android devices.
- Create and update tasks; confirm Realtime synchronization.
- Test handover submission and incoming confirmation/rejection with a reason.
- Test group/private chat, unread counts, and image messages.
- Verify notification permission and delivery.
- Verify role-based access and audit behavior with admin and technician accounts.

## Project structure
- `app/` — Expo Router screens and navigation.
- `src/components/` — shared UI primitives.
- `src/features/` — feature-scoped application modules.
- `src/lib/` — shared types, theme, Supabase client, and labels.
- `src/services/` — Supabase-backed application services.
- `src/state/` — authentication and offline state.
- `supabase/migrations/` — database schema migrations.
- `supabase/functions/` — Supabase Edge Functions.
- `docs/` — implementation and review documentation.

## Internal content redesign
A reviewed UI redesign is staged in `src/features/internal-content-redesign/`. It is intentionally not connected to active Expo Router routes yet. Read `docs/internal-content-redesign/INTEGRATION_GUIDE.md`, `FILE_MAP.md`, and `REVIEW_NOTES.md` before integration. Existing routes and backend/authentication behavior remain authoritative.

## Important files
- `supabase/migrations/0001_init.sql` — schema, indexes, RLS, and database triggers.
- `supabase/functions/*/index.ts` — username and admin setup Edge Functions.
- `src/lib/supabase.ts` — Supabase client and session storage.
- `src/state/AuthContext.tsx` — authentication state and profile loading.
- `app/*` — Expo Router screens.

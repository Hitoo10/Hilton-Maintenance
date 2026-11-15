# ShiftFlow Maintenance

React Native + Expo + TypeScript + Expo Router + Supabase hotel maintenance team system.

## Truth about this deliverable
This repository contains source code, SQL migrations, EAS configuration, and build instructions. It does **not** contain a signed production APK. Do not treat a production APK as produced unless an Android/EAS release build succeeds and the resulting artifact is verified.

## Setup
1. Create a Supabase project.
2. Apply all three migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_auth_pin_alignment.sql`
   - `supabase/migrations/0003_pin_login_rate_limit.sql`
   
   Use the Supabase SQL editor or Supabase CLI. Migration 0002 adds the `job_title` field and protected PIN credentials table. Migration 0003 adds database-backed PIN login throttling.
3. Enable Realtime for the tables used by the app, including `tasks`, `task_comments`, `messages`, `notifications`, and `handovers`.
4. Configure the Edge Function secrets. Keep the service-role key and PIN secrets server-side only:
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... PIN_PEPPER=... ADMIN_PIN_SETUP_TOKEN=...
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
   For EAS cloud builds, add the same two `EXPO_PUBLIC_*` values to the EAS environment used by the build profile. Do not add `SUPABASE_SERVICE_ROLE_KEY`, `PIN_PEPPER`, or `ADMIN_PIN_SETUP_TOKEN` to the mobile app or EAS public build variables.

## Authentication model
Supabase Auth uses email internally. Usernames are resolved through Edge Functions:
- Registration normalizes the username, creates an internal auth identity and profile, and leaves the profile pending until an admin activates it.
- Username login verifies the four-digit PIN through the Edge Function and returns a Supabase Auth token hash.
- PIN login is throttled in the database: up to 5 attempts per username and 20 attempts per source IP in a 15-minute window. Successful authentication clears the username bucket. Raw usernames and IP addresses are not stored in the rate-limit table.
- The Supabase service-role key and PIN pepper must remain only in Edge Function secrets. Never place them in the mobile app.

## Build APK
The EAS project ID and Android application ID are configured in `app.json`. Confirm that the EAS account owner has access to that project and that the required Android signing credentials are available, then run:
```bash
eas build --platform android --profile preview
eas build --platform android --profile production
```
The `preview` and `production` profiles are both configured to produce APK files. Use preview for internal testing; use production only after signing credentials and release configuration are verified.

## Required manual verification
- Install the same APK on two physical Android devices.
- Create and update tasks; confirm Realtime synchronization.
- Test handover submission and incoming confirmation/rejection with a reason.
- Test group chat and message synchronization.
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
- `supabase/migrations/0001_init.sql`, `0002_auth_pin_alignment.sql`, and `0003_pin_login_rate_limit.sql` — schema, indexes, RLS, triggers, PIN credentials, and login throttling.
- `supabase/functions/*/index.ts` — username and admin setup Edge Functions.
- `src/lib/supabase.ts` — Supabase client and secure session storage.
- `src/state/AuthContext.tsx` — authentication state and profile loading.
- `app/*` — Expo Router screens.

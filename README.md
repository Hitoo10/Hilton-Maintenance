# ShiftFlow Maintenance

React Native + Expo + TypeScript + Expo Router + Supabase hotel maintenance team system.

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
A reviewed UI redesign is staged in `src/features/internal-content-redesign/`. It is not yet connected to the active Expo Router routes. See `docs/internal-content-redesign/INTEGRATION_GUIDE.md` and `REVIEW_NOTES.md` before integrating it. Existing routes and backend/authentication behavior remain authoritative.

## Setup
1. Create a Supabase project.
2. Apply migrations from `supabase/migrations/` using the Supabase CLI or SQL editor.
3. Configure the required Supabase Edge Function secrets and deploy functions as appropriate.
4. Configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
5. Install dependencies and check types:

```bash
npm ci
npm run typecheck
```

## Build
Use the configured EAS profiles in `eas.json` after configuring EAS credentials:

```bash
eas build --platform android --profile preview
eas build --platform android --profile production
```

## Important
A source-code commit is not an APK build. A build is complete only after the EAS/Android build succeeds and the resulting APK is installed and tested on a device.

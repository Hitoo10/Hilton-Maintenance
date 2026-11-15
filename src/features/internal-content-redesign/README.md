# Internal Content Redesign (staged)

This folder contains the reviewed, frontend-only redesign screens and reusable UI components copied from the source Hilton repository.

## Status
- Staged and reviewed for contract compatibility.
- Not mounted in Expo Router yet.
- Existing production routes remain unchanged.
- No database schema, RLS policy, Edge Function, authentication, or Supabase client changes are included.

## Structure
- `components/`: report cards, badges, section headers, loading states.
- `screens/`: home, reports, report details, archive, team, notifications.
- `theme/`: semantic colors layered on the existing theme.
- `utils/`: Arabic labels, priority classification, date formatting.
- `index.ts`: feature exports.

## Integration rule
Do not replace `app/(app)` routes wholesale. The original task details screen contains priority editing and task comments; those behaviors have been preserved in this staged screen. Integrate routes only after a separate route-by-route review and on-device test.

# helm_mobile

Flutter app for **Helm حلم**.

Five-tab shell (Discover / Build / Packages / Trips / Profile). Discover loads
published destinations via the generated `helm_api_client` (`listDestinations`),
with search, pagination, and an interactive globe. Build lists and edits private
trip drafts after traveler sign-in (questionnaire, planner, preview, and demo
checkout for Ubud).

Uses `helm_api_client` from `packages/api-client-dart` (generated — do not hand-edit).

## API base URL

Configurable at launch:

```bash
flutter run --dart-define=HELM_API_BASE_URL=https://helm-staging-api-ujqa.onrender.com
```

Default (when unset): `https://helm-staging-api-ujqa.onrender.com`.

## Traveler Build auth

Build uses Supabase email/password (anon key only). Pass:

```bash
flutter run \
  --dart-define=HELM_API_BASE_URL=https://helm-staging-api-ujqa.onrender.com \
  --dart-define=HELM_SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  --dart-define=HELM_SUPABASE_ANON_KEY=your-anon-key
```

## Develop

```bash
flutter pub get
flutter analyze
flutter test
```

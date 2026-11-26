# helm_mobile

Flutter app for **Helm حلم**.

Five-tab shell (Discover / Build / Packages / Trips / Profile). Discover loads
published destinations via the generated `helm_api_client` (`listDestinations`),
with search, pagination, and an interactive globe. Build lists and edits private
trip drafts after traveler sign-in (questionnaire, planner, preview, and demo
checkout for Ubud).

Uses `helm_api_client` from `packages/api-client-dart` (generated — do not hand-edit).

## Local demo

From `apps/helm_mobile`, use Flutter 3.27 or newer with Dart 3.6 or newer.

```bash
flutter pub get
flutter run -d chrome --target tool/demo_main.dart
```

Open **Ubud → Build my trip**. Use `demo@example.com` and `demo1234` on the
demo sign-in screen. The demo uses a local catalog and keeps drafts and demo
bookings in memory until reload. Checkout is simulated. It needs no Supabase
project or API credentials. For Android, replace `-d chrome` with your device
ID from `flutter devices`.

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

## Staging web preview (GitHub Pages)

After CI is green on `main`, Actions builds `lib/main.dart` for web against the
staging API and Supabase anon credentials, then publishes a single shared
preview:

**https://helmyshehab.github.io/HelmAPP/**

The AppBar shows `Preview · <shortSha>` for the deployed commit.

One-time setup (repo admins):

1. **Settings → Pages → Source:** GitHub Actions.
2. **Settings → Secrets and variables → Actions** — add:
   - `HELM_SUPABASE_URL` — staging project URL
   - `HELM_SUPABASE_ANON_KEY` — anon/publishable key only (never the service role)
3. In Supabase Auth URL config, allow `https://helmyshehab.github.io` (and the
   `/HelmAPP/` path as needed) for traveler email/password redirects.

Local builds omit the commit badge unless you pass
`--dart-define=HELM_GIT_SHA=...`.

## Develop

```bash
flutter pub get
flutter analyze
flutter test
```

CI uses Flutter **3.27.4** (see `.github/workflows/ci.yml`). Match that SDK
locally when verifying analyze/tests against GitHub.

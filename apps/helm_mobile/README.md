# helm_mobile

Flutter app for **Helm حلم**.

Discover-first shell with no bottom navigation. Discover loads published
destinations via the generated `helm_api_client` (`listDestinations`). The
placeholder Build, Packages, Trips, and Profile tabs in `lib/tabs/` are not
wired into the app until their features exist.

Uses `helm_api_client` from `packages/api-client-dart` (generated — do not hand-edit).

## API base URL

Configurable at launch:

```bash
flutter run --dart-define=HELM_API_BASE_URL=https://helm-staging-api-ujqa.onrender.com
```

Default (when unset): `https://helm-staging-api-ujqa.onrender.com`.

## Develop

```bash
flutter pub get
flutter analyze
flutter test
```

# helm_mobile

Flutter app for **Helm حلم**.

Five-tab shell (Discover / Build / Packages / Trips / Profile). Discover loads
published destinations via the generated `helm_api_client` (`listDestinations`).

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

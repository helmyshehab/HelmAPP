# helm_mobile

Flutter shell for **Helm حلم**.

Step 2: app title branding + five empty tab destinations only. No product features.
Uses `helm_api_client` from `packages/api-client-dart` (generated — do not hand-edit).

## Platform notes (Step 2)

Android/iOS shells include Manifest, MainActivity, Gradle stubs, and AppDelegate.
After installing the Flutter SDK, run once from this directory if tooling asks to regenerate platform projects:

```bash
flutter create --project-name helm_mobile --org app.helm .
flutter pub get
flutter analyze
flutter test
```

Do not implement product features in Step 2.

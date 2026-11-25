/// Supabase anon configuration for traveler sign-in.
///
/// Override at launch with:
/// `flutter run --dart-define=HELM_SUPABASE_URL=... --dart-define=HELM_SUPABASE_ANON_KEY=...`
class SupabaseConfig {
  const SupabaseConfig._();

  static const String url = String.fromEnvironment('HELM_SUPABASE_URL');

  static const String anonKey = String.fromEnvironment('HELM_SUPABASE_ANON_KEY');

  static bool get isConfigured =>
      url.trim().isNotEmpty && anonKey.trim().isNotEmpty;
}

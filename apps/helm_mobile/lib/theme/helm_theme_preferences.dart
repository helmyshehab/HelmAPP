import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persistence for the traveler appearance preference.
///
/// Uses [shared_preferences], already present via Supabase; declared directly
/// so production and demo share one store contract.
abstract interface class HelmThemePreferenceStore {
  Future<String?> read();

  Future<void> write(String value);
}

/// SharedPreferences-backed store for device / browser local prefs.
final class SharedPreferencesThemeStore implements HelmThemePreferenceStore {
  SharedPreferencesThemeStore(this._prefs);

  static const String key = 'helm.themeMode';

  final SharedPreferences _prefs;

  static Future<SharedPreferencesThemeStore> open() async {
    final prefs = await SharedPreferences.getInstance();
    return SharedPreferencesThemeStore(prefs);
  }

  @override
  Future<String?> read() async => _prefs.getString(key);

  @override
  Future<void> write(String value) async {
    await _prefs.setString(key, value);
  }
}

/// In-memory store for tests and ephemeral sessions.
final class MemoryThemePreferenceStore implements HelmThemePreferenceStore {
  MemoryThemePreferenceStore([this._value]);

  String? _value;

  @override
  Future<String?> read() async => _value;

  @override
  Future<void> write(String value) async {
    _value = value;
  }
}

/// Encodes / decodes [ThemeMode] for local storage.
abstract final class HelmThemeModeCodec {
  static const String system = 'system';
  static const String light = 'light';
  static const String dark = 'dark';

  static String encode(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return light;
      case ThemeMode.dark:
        return dark;
      case ThemeMode.system:
        return system;
    }
  }

  /// Missing or unknown values fall back to [ThemeMode.system].
  static ThemeMode decode(String? raw) {
    switch (raw) {
      case light:
        return ThemeMode.light;
      case dark:
        return ThemeMode.dark;
      case system:
        return ThemeMode.system;
      default:
        return ThemeMode.system;
    }
  }
}

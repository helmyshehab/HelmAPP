import 'package:flutter/material.dart';

import 'helm_theme_preferences.dart';

/// Holds the active [ThemeMode] and persists changes locally.
///
/// Load once before [runApp] so the first frame uses the restored preference.
final class HelmThemeController extends ChangeNotifier {
  HelmThemeController({
    required HelmThemePreferenceStore store,
    ThemeMode initialMode = ThemeMode.system,
  })  : _store = store,
        _mode = initialMode;

  final HelmThemePreferenceStore _store;
  ThemeMode _mode;

  ThemeMode get mode => _mode;

  /// Opens SharedPreferences, restores a valid mode (default system), and
  /// returns a ready controller. Store failures fall back to system.
  static Future<HelmThemeController> load() async {
    try {
      final store = await SharedPreferencesThemeStore.open();
      final raw = await store.read();
      return HelmThemeController(
        store: store,
        initialMode: HelmThemeModeCodec.decode(raw),
      );
    } catch (_) {
      return HelmThemeController(store: MemoryThemePreferenceStore());
    }
  }

  /// Ephemeral controller for widget tests (optional seed + in-memory store).
  static HelmThemeController memory({
    ThemeMode mode = ThemeMode.system,
    MemoryThemePreferenceStore? store,
  }) {
    return HelmThemeController(
      store: store ?? MemoryThemePreferenceStore(HelmThemeModeCodec.encode(mode)),
      initialMode: mode,
    );
  }

  Future<void> setMode(ThemeMode mode) async {
    if (mode == _mode) return;
    _mode = mode;
    notifyListeners();
    try {
      await _store.write(HelmThemeModeCodec.encode(mode));
    } catch (_) {
      // Keep the in-memory mode; persistence is best-effort.
    }
  }
}

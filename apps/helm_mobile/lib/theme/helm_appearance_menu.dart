import 'package:flutter/material.dart';

import 'helm_theme_controller.dart';
import 'helm_tokens.dart';

/// Compact AppBar toggle: moon (→ dark) on light surfaces, sun (→ light) on dark.
///
/// [ThemeMode.system] remains the default until the first tap writes an explicit
/// light/dark preference. System mode stays available on the controller for a
/// future Profile setting.
class HelmAppearanceMenu extends StatelessWidget {
  const HelmAppearanceMenu({super.key, required this.controller});

  static const Key buttonKey = Key('helm-appearance-menu');

  final HelmThemeController controller;

  /// Labels for explicit [ThemeMode] values (Profile / future settings).
  static String labelFor(ThemeMode mode, {Locale? locale}) {
    final ar = locale?.languageCode.toLowerCase() == 'ar';
    switch (mode) {
      case ThemeMode.light:
        return ar ? 'فاتح' : 'Light';
      case ThemeMode.dark:
        return ar ? 'داكن' : 'Dark';
      case ThemeMode.system:
        return ar ? 'النظام' : 'System';
    }
  }

  static String tooltipForBrightness(Brightness brightness, Locale locale) {
    final ar = locale.languageCode.toLowerCase() == 'ar';
    if (brightness == Brightness.light) {
      return ar ? 'التبديل إلى المظهر الداكن' : 'Switch to dark appearance';
    }
    return ar ? 'التبديل إلى المظهر الفاتح' : 'Switch to light appearance';
  }

  static ThemeMode nextModeFor(Brightness brightness) {
    return brightness == Brightness.light ? ThemeMode.dark : ThemeMode.light;
  }

  static IconData iconForBrightness(Brightness brightness) {
    return brightness == Brightness.light
        ? Icons.dark_mode_outlined
        : Icons.light_mode_outlined;
  }

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final scheme = Theme.of(context).colorScheme;

    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        // Resolve against the painted theme so System still shows the right
        // moon/sun affordance before the first explicit selection.
        final brightness = Theme.of(context).brightness;
        final tooltip = tooltipForBrightness(brightness, locale);
        return IconButton(
          key: buttonKey,
          tooltip: tooltip,
          onPressed: () => controller.setMode(nextModeFor(brightness)),
          style: IconButton.styleFrom(
            foregroundColor: scheme.onSurface,
            minimumSize: const Size(HelmSpacing.xxxl, HelmSpacing.xxxl),
            maximumSize: const Size(HelmSpacing.xxxl, HelmSpacing.xxxl),
            padding: EdgeInsets.zero,
            tapTargetSize: MaterialTapTargetSize.padded,
            visualDensity: VisualDensity.standard,
            shape: const CircleBorder(),
            side: BorderSide.none,
            elevation: 0,
            shadowColor: Colors.transparent,
            backgroundColor: Colors.transparent,
            highlightColor: scheme.onSurface.withValues(alpha: 0.08),
          ),
          icon: Icon(iconForBrightness(brightness)),
        );
      },
    );
  }
}

import 'package:flutter/material.dart';

import 'helm_colors.dart';
import 'helm_tokens.dart';

/// HELM light and dark [ThemeData]; the app picks one from the system mode.
abstract final class HelmTheme {
  static ThemeData light() => _build(lightScheme);

  static ThemeData dark() => _build(darkScheme);

  static const ColorScheme lightScheme = ColorScheme(
    brightness: Brightness.light,
    primary: HelmColors.teal,
    onPrimary: HelmColors.white,
    secondary: HelmColors.deepOcean,
    onSecondary: HelmColors.ivory,
    tertiary: HelmColors.coral,
    onTertiary: HelmColors.midnight,
    error: HelmErrorColors.lightError,
    onError: HelmErrorColors.lightOnError,
    errorContainer: HelmErrorColors.lightErrorContainer,
    onErrorContainer: HelmErrorColors.lightOnErrorContainer,
    surface: HelmColors.ivory,
    onSurface: HelmColors.midnight,
    onSurfaceVariant: HelmColors.midnightMuted,
    surfaceContainerLowest: HelmColors.white,
    surfaceContainerLow: HelmColors.white,
    surfaceContainer: HelmColors.white,
    surfaceContainerHigh: HelmColors.white,
    surfaceContainerHighest: HelmColors.white,
    outline: HelmColors.teal,
    outlineVariant: HelmColors.midnightDivider,
    inverseSurface: HelmColors.midnight,
    onInverseSurface: HelmColors.ivory,
    inversePrimary: HelmColors.coral,
    surfaceTint: Color(0x00000000),
  );

  /// Teal is 2.6:1 on Deep Ocean, so dark control boundaries use muted Ivory.
  static const ColorScheme darkScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: HelmColors.teal,
    onPrimary: HelmColors.white,
    secondary: HelmColors.ivory,
    onSecondary: HelmColors.midnight,
    secondaryContainer: HelmColors.deepOcean,
    onSecondaryContainer: HelmColors.ivory,
    tertiary: HelmColors.coral,
    onTertiary: HelmColors.midnight,
    error: HelmErrorColors.darkError,
    onError: HelmErrorColors.darkOnError,
    errorContainer: HelmErrorColors.darkErrorContainer,
    onErrorContainer: HelmErrorColors.darkOnErrorContainer,
    surface: HelmColors.midnight,
    onSurface: HelmColors.ivory,
    onSurfaceVariant: HelmColors.ivoryMuted,
    surfaceContainerLowest: HelmColors.midnight,
    surfaceContainerLow: HelmColors.deepOcean,
    surfaceContainer: HelmColors.deepOcean,
    surfaceContainerHigh: HelmColors.deepOcean,
    surfaceContainerHighest: HelmColors.deepOcean,
    outline: HelmColors.ivoryMuted,
    outlineVariant: HelmColors.ivoryDivider,
    inverseSurface: HelmColors.ivory,
    onInverseSurface: HelmColors.midnight,
    inversePrimary: HelmColors.deepOcean,
    surfaceTint: Color(0x00000000),
  );

  static ThemeData _build(ColorScheme scheme) {
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      dividerTheme: DividerThemeData(color: scheme.outlineVariant),
      // Material defaults these labels to `primary` (Teal), which fails AA as
      // normal-size text on both Ivory and Midnight.
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(foregroundColor: scheme.onSurface),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: scheme.onSurface),
      ),
      cardTheme: const CardThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(HelmRadius.lg)),
        ),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(HelmRadius.md)),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(HelmRadius.sheet),
          ),
        ),
      ),
    );
  }
}

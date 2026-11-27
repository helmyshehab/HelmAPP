import 'package:flutter/material.dart';

import 'helm_colors.dart';
import 'helm_tokens.dart';
import 'helm_typography.dart';

/// HELM light and dark [ThemeData]; the app picks one from the system mode.
abstract final class HelmTheme {
  static ThemeData light() => _build(lightScheme);

  static ThemeData dark() => _build(darkScheme);

  /// Luxury editorial light scheme from the Phase 1A palette.
  ///
  /// Sage is decorative only (fails AA as text/outline on light surfaces).
  /// Champagne is tertiary fill with [HelmColors.lightPrimary] labels.
  static const ColorScheme lightScheme = ColorScheme(
    brightness: Brightness.light,
    primary: HelmColors.lightPrimary,
    onPrimary: HelmColors.lightSurface,
    primaryContainer: HelmColors.sand,
    onPrimaryContainer: HelmColors.lightPrimary,
    secondary: HelmColors.sand,
    onSecondary: HelmColors.lightPrimary,
    secondaryContainer: HelmColors.sand,
    onSecondaryContainer: HelmColors.lightPrimary,
    tertiary: HelmColors.champagne,
    onTertiary: HelmColors.lightPrimary,
    tertiaryContainer: HelmColors.champagne,
    onTertiaryContainer: HelmColors.lightPrimary,
    error: HelmErrorColors.lightError,
    onError: HelmErrorColors.lightOnError,
    errorContainer: HelmErrorColors.lightErrorContainer,
    onErrorContainer: HelmErrorColors.lightOnErrorContainer,
    surface: HelmColors.lightBackground,
    onSurface: HelmColors.lightPrimary,
    onSurfaceVariant: HelmColors.lightMuted,
    surfaceContainerLowest: HelmColors.lightSurface,
    surfaceContainerLow: HelmColors.lightSurface,
    surfaceContainer: HelmColors.lightSurface,
    surfaceContainerHigh: HelmColors.lightSurface,
    surfaceContainerHighest: HelmColors.sand,
    outline: HelmColors.lightPrimary,
    outlineVariant: HelmColors.lightDivider,
    inverseSurface: HelmColors.darkBackground,
    onInverseSurface: HelmColors.darkText,
    inversePrimary: HelmColors.darkPrimary,
    surfaceTint: Color(0x00000000),
  );

  /// Cinematic dark scheme from the Phase 1A palette.
  ///
  /// Selected surface is [ColorScheme.primaryContainer] / secondary container,
  /// not a general `surface*` slot, so muted text is never required on it.
  static const ColorScheme darkScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: HelmColors.darkPrimary,
    onPrimary: HelmColors.darkBackground,
    primaryContainer: HelmColors.darkSelected,
    onPrimaryContainer: HelmColors.darkText,
    secondary: HelmColors.darkMuted,
    onSecondary: HelmColors.darkBackground,
    secondaryContainer: HelmColors.darkSelected,
    onSecondaryContainer: HelmColors.darkText,
    tertiary: HelmColors.champagne,
    onTertiary: HelmColors.darkBackground,
    tertiaryContainer: HelmColors.darkSelected,
    onTertiaryContainer: HelmColors.darkText,
    error: HelmErrorColors.darkError,
    onError: HelmErrorColors.darkOnError,
    errorContainer: HelmErrorColors.darkErrorContainer,
    onErrorContainer: HelmErrorColors.darkOnErrorContainer,
    surface: HelmColors.darkBackground,
    onSurface: HelmColors.darkText,
    onSurfaceVariant: HelmColors.darkMuted,
    surfaceContainerLowest: HelmColors.darkBackground,
    surfaceContainerLow: HelmColors.darkSurface,
    surfaceContainer: HelmColors.darkSurface,
    surfaceContainerHigh: HelmColors.darkSurface,
    surfaceContainerHighest: HelmColors.darkSurface,
    outline: HelmColors.darkPrimary,
    outlineVariant: HelmColors.darkDivider,
    inverseSurface: HelmColors.lightBackground,
    onInverseSurface: HelmColors.lightPrimary,
    inversePrimary: HelmColors.lightPrimary,
    surfaceTint: Color(0x00000000),
  );

  static ThemeData _build(ColorScheme scheme) {
    final draft = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: HelmFonts.outfit,
      fontFamilyFallback: HelmFonts.arabicFallback,
      scaffoldBackgroundColor: scheme.surface,
      dividerTheme: DividerThemeData(color: scheme.outlineVariant),
      // Material defaults these labels to `primary`, which is not always AA
      // as normal-size text on every surface.
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
    return draft.copyWith(
      textTheme: HelmTypography.apply(draft.textTheme),
      primaryTextTheme: HelmTypography.apply(draft.primaryTextTheme),
    );
  }
}

import 'package:flutter/material.dart';

/// Family names declared in `pubspec.yaml`.
///
/// Fraunces is the foundry's static 9pt optical-size cut (version 1.003).
/// The name table says `Fraunces 9pt`; Flutter selects the files through
/// [fraunces]. Outfit and IBM Plex Sans Arabic are the static faces from
/// their foundries. SemiBold is bundled for a later wordmark and is not
/// applied to a Material role here.
abstract final class HelmFonts {
  static const String fraunces = 'Fraunces';
  static const String outfit = 'Outfit';
  static const String plexArabic = 'IBM Plex Sans Arabic';

  /// Arabic letters are absent from Fraunces and Outfit. This is the UI
  /// fallback, not the Naskh wordmark.
  static const List<String> arabicFallback = <String>[plexArabic];
}

/// Approved HELM type scale (logical pixels).
abstract final class HelmTypeSize {
  /// Fraunces page title.
  static const double page = 32;

  /// Fraunces section heading.
  static const double section = 24;

  /// Fraunces card title.
  static const double card = 20;

  /// Outfit body (comfortable).
  static const double body = 16;

  /// Outfit body (compact) and action labels.
  static const double bodySmall = 14;
  static const double action = 14;

  /// Outfit metadata.
  static const double meta = 12;
}

/// Maps Material 3 roles onto the HELM families and Phase 1A sizes.
abstract final class HelmTypography {
  static TextTheme apply(TextTheme base) {
    return base.copyWith(
      displayLarge: _fraunces(base.displayLarge, HelmTypeSize.page),
      displayMedium: _fraunces(base.displayMedium, HelmTypeSize.page),
      displaySmall: _fraunces(base.displaySmall, HelmTypeSize.page),
      headlineLarge: _fraunces(base.headlineLarge, HelmTypeSize.page),
      headlineMedium: _fraunces(base.headlineMedium, HelmTypeSize.section),
      headlineSmall: _fraunces(base.headlineSmall, HelmTypeSize.section),
      titleLarge: _fraunces(base.titleLarge, HelmTypeSize.card),
      titleMedium: _outfit(base.titleMedium, HelmTypeSize.body),
      titleSmall: _outfit(base.titleSmall, HelmTypeSize.bodySmall),
      bodyLarge: _outfit(base.bodyLarge, HelmTypeSize.body),
      bodyMedium: _outfit(base.bodyMedium, HelmTypeSize.bodySmall),
      bodySmall: _outfit(base.bodySmall, HelmTypeSize.meta),
      labelLarge: _outfit(base.labelLarge, HelmTypeSize.action),
      labelMedium: _outfit(base.labelMedium, HelmTypeSize.meta),
      labelSmall: _outfit(base.labelSmall, HelmTypeSize.meta),
    );
  }

  static TextStyle? _fraunces(TextStyle? style, double size) => style?.copyWith(
        fontFamily: HelmFonts.fraunces,
        fontFamilyFallback: HelmFonts.arabicFallback,
        fontSize: size,
      );

  static TextStyle? _outfit(TextStyle? style, double size) => style?.copyWith(
        fontFamily: HelmFonts.outfit,
        fontFamilyFallback: HelmFonts.arabicFallback,
        fontSize: size,
      );
}

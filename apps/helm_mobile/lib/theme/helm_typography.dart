import 'package:flutter/material.dart';

/// Family names declared in `pubspec.yaml`.
///
/// Fraunces is the foundry's static 9pt optical-size cut (version 1.003).
/// The name table says `Fraunces 9pt`; Flutter selects the files through
/// [fraunces]. That cut matches the heading sizes already in use (about
/// 22–24px). Outfit and IBM Plex Sans Arabic are the static faces from
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

/// Maps Material 3 roles onto the HELM families.
///
/// Sizes, weights, and line heights stay on the values already in [base].
abstract final class HelmTypography {
  static TextTheme apply(TextTheme base) {
    return base.copyWith(
      displayLarge: _fraunces(base.displayLarge),
      displayMedium: _fraunces(base.displayMedium),
      displaySmall: _fraunces(base.displaySmall),
      headlineLarge: _fraunces(base.headlineLarge),
      headlineMedium: _fraunces(base.headlineMedium),
      headlineSmall: _fraunces(base.headlineSmall),
      titleLarge: _fraunces(base.titleLarge),
      titleMedium: _outfit(base.titleMedium),
      titleSmall: _outfit(base.titleSmall),
      bodyLarge: _outfit(base.bodyLarge),
      bodyMedium: _outfit(base.bodyMedium),
      bodySmall: _outfit(base.bodySmall),
      labelLarge: _outfit(base.labelLarge),
      labelMedium: _outfit(base.labelMedium),
      labelSmall: _outfit(base.labelSmall),
    );
  }

  static TextStyle? _fraunces(TextStyle? style) => style?.copyWith(
        fontFamily: HelmFonts.fraunces,
        fontFamilyFallback: HelmFonts.arabicFallback,
      );

  static TextStyle? _outfit(TextStyle? style) => style?.copyWith(
        fontFamily: HelmFonts.outfit,
        fontFamilyFallback: HelmFonts.arabicFallback,
      );
}

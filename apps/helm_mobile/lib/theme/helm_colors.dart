import 'package:flutter/painting.dart';

/// Approved HELM Phase 1A palette plus semantic roles derived from it.
///
/// Light Sage and Champagne are decorative accents only — neither is normal
/// text or a standalone control boundary on light surfaces.
/// Dark muted text is not placed on the selected surface (fails AA by ~0.01).
/// `test/theme_test.dart` enforces these pairings.
abstract final class HelmColors {
  // —— Light (luxury editorial) ——
  static const Color lightBackground = Color(0xFFF7F4ED);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color sand = Color(0xFFE5DED2);
  static const Color lightPrimary = Color(0xFF173D35);
  static const Color sage = Color(0xFF789D8C);
  static const Color champagne = Color(0xFFBCA47E);

  // —— Dark (cinematic) ——
  static const Color darkBackground = Color(0xFF0B151C);
  static const Color darkSurface = Color(0xFF142831);
  static const Color darkSelected = Color(0xFF24534F);
  static const Color darkPrimary = Color(0xFF68B5A5);
  static const Color darkText = Color(0xFFF3EFE6);
  static const Color darkMuted = Color(0xFFA6C0BC);

  /// Secondary text on light surfaces (light primary at 75%).
  static const Color lightMuted = Color(0xBF173D35);

  /// Decorative dividers on light surfaces; never a control boundary.
  static const Color lightDivider = Color(0x26173D35);

  /// Decorative dividers on dark surfaces; never a control boundary.
  static const Color darkDivider = Color(0x26F3EFE6);

  // —— Legacy aliases (pre–Phase 1A names still referenced by screens) ——
  static const Color ivory = lightBackground;
  static const Color white = lightSurface;
  static const Color midnight = darkBackground;
  static const Color deepOcean = darkSurface;
  static const Color teal = lightPrimary;
  static const Color coral = champagne;

  /// Legacy muted / divider aliases.
  static const Color ivoryMuted = darkMuted;
  static const Color midnightMuted = lightMuted;
  static const Color ivoryDivider = darkDivider;
  static const Color midnightDivider = lightDivider;
}

/// Material 3 baseline error roles; not HELM brand colors.
abstract final class HelmErrorColors {
  static const Color lightError = Color(0xFFB3261E);
  static const Color lightOnError = Color(0xFFFFFFFF);
  static const Color lightErrorContainer = Color(0xFFF9DEDC);
  static const Color lightOnErrorContainer = Color(0xFF410E0B);

  static const Color darkError = Color(0xFFF2B8B5);
  static const Color darkOnError = Color(0xFF601410);
  static const Color darkErrorContainer = Color(0xFF8C1D18);
  static const Color darkOnErrorContainer = Color(0xFFF9DEDC);
}

/// Semantic success roles; not HELM brand colors. Contrast-checked on Phase 1A
/// surfaces in `test/theme_test.dart`.
abstract final class HelmSuccessColors {
  static const Color lightSuccess = Color(0xFF1B6B45);
  static const Color lightOnSuccess = Color(0xFFFFFFFF);
  static const Color lightSuccessContainer = Color(0xFFD5EFE3);
  static const Color lightOnSuccessContainer = Color(0xFF0F3D28);

  static const Color darkSuccess = Color(0xFF7DCCA0);
  static const Color darkOnSuccess = Color(0xFF0B151C);
  static const Color darkSuccessContainer = Color(0xFF1B4D38);
  static const Color darkOnSuccessContainer = Color(0xFFD5EFE3);
}

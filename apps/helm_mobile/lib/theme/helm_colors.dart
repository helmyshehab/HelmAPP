import 'package:flutter/painting.dart';

/// Approved HELM palette plus the semantic roles derived from it.
///
/// Teal is not normal-size text on Ivory or Midnight, and Coral is never text
/// or a standalone boundary on Ivory. `test/theme_test.dart` enforces these.
abstract final class HelmColors {
  static const Color midnight = Color(0xFF0C1B2A);
  static const Color deepOcean = Color(0xFF163747);
  static const Color teal = Color(0xFF177F83);
  static const Color coral = Color(0xFFF1A38D);
  static const Color ivory = Color(0xFFF7F5F0);
  static const Color white = Color(0xFFFFFFFF);

  /// Secondary text on dark surfaces (Ivory at 72%).
  static const Color ivoryMuted = Color(0xB8F7F5F0);

  /// Secondary text on light surfaces (Midnight at 72%).
  static const Color midnightMuted = Color(0xB80C1B2A);

  /// Decorative dividers on dark surfaces; never a control boundary.
  static const Color ivoryDivider = Color(0x26F7F5F0);

  /// Decorative dividers on light surfaces; never a control boundary.
  static const Color midnightDivider = Color(0x1F0C1B2A);
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

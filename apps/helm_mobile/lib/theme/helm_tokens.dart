/// Spacing scale in logical pixels.
abstract final class HelmSpacing {
  /// Legacy micro gap; prefer [xs] for new layout.
  static const double xxs = 2;
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;

  /// Standard horizontal/vertical screen inset.
  static const double screen = 20;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 48;
}

/// Corner radii for softly rounded controls and surfaces.
abstract final class HelmRadius {
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double sheet = 24;
}

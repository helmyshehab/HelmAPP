import 'package:flutter/material.dart';

import 'helm_colors.dart';
import 'helm_tokens.dart';
import 'helm_typography.dart';

/// HELM light and dark [ThemeData]; the app picks one from the system mode.
abstract final class HelmTheme {
  static ThemeData light() => _build(lightScheme);

  static ThemeData dark() => _build(darkScheme);

  /// Minimum interactive control extent (WCAG / traveler touch target).
  static const Size minTapTarget = Size(HelmSpacing.xxxl, HelmSpacing.xxxl);

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
    final radiusMd = BorderRadius.circular(HelmRadius.md);
    final radiusLg = BorderRadius.circular(HelmRadius.lg);
    final controlShape = RoundedRectangleBorder(borderRadius: radiusMd);
    final cardShape = RoundedRectangleBorder(
      borderRadius: radiusLg,
      side: BorderSide(color: scheme.outlineVariant),
    );

    final textTheme = HelmTypography.apply(
      ThemeData(useMaterial3: true, colorScheme: scheme).textTheme,
    );

    final draft = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: HelmFonts.outfit,
      fontFamilyFallback: HelmFonts.arabicFallback,
      scaffoldBackgroundColor: scheme.surface,
      textTheme: textTheme,
      primaryTextTheme: textTheme,
      dividerTheme: DividerThemeData(color: scheme.outlineVariant),
      filledButtonTheme: FilledButtonThemeData(
        style: _filledButtonStyle(scheme, controlShape),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: _elevatedButtonStyle(scheme, controlShape),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: _outlinedButtonStyle(scheme, controlShape),
      ),
      textButtonTheme: TextButtonThemeData(
        style: _textButtonStyle(scheme, controlShape),
      ),
      inputDecorationTheme: _inputDecorationTheme(scheme, radiusMd),
      dropdownMenuTheme: DropdownMenuThemeData(
        inputDecorationTheme: _inputDecorationTheme(scheme, radiusMd),
        menuStyle: MenuStyle(
          backgroundColor: WidgetStatePropertyAll(scheme.surfaceContainerLow),
          elevation: const WidgetStatePropertyAll(1),
          shape: WidgetStatePropertyAll(
            RoundedRectangleBorder(borderRadius: radiusMd),
          ),
        ),
        textStyle: textTheme.bodyLarge?.copyWith(color: scheme.onSurface),
      ),
      menuTheme: MenuThemeData(
        style: MenuStyle(
          backgroundColor: WidgetStatePropertyAll(scheme.surfaceContainerLow),
          elevation: const WidgetStatePropertyAll(1),
          shape: WidgetStatePropertyAll(
            RoundedRectangleBorder(borderRadius: radiusMd),
          ),
        ),
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: scheme.surfaceContainerLow,
        elevation: 1,
        textStyle: textTheme.bodyMedium?.copyWith(color: scheme.onSurface),
        shape: RoundedRectangleBorder(borderRadius: radiusMd),
      ),
      cardTheme: CardThemeData(
        color: scheme.surfaceContainerLow,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: cardShape,
        clipBehavior: Clip.antiAlias,
      ),
      chipTheme: _chipTheme(scheme, textTheme, radiusMd),
      dialogTheme: DialogThemeData(
        backgroundColor: scheme.surfaceContainerLow,
        surfaceTintColor: Colors.transparent,
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: radiusLg),
        titleTextStyle: textTheme.headlineSmall?.copyWith(
          color: scheme.onSurface,
        ),
        contentTextStyle: textTheme.bodyMedium?.copyWith(
          color: scheme.onSurfaceVariant,
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surfaceContainerLow,
        surfaceTintColor: Colors.transparent,
        elevation: 1,
        modalElevation: 1,
        clipBehavior: Clip.antiAlias,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(HelmRadius.sheet),
          ),
        ),
      ),
    );

    return draft;
  }

  static ButtonStyle _baseButtonStyle({
    required ColorScheme scheme,
    required OutlinedBorder shape,
    required Color foreground,
    required Color disabledForeground,
    required Color background,
    required Color disabledBackground,
    required Color overlay,
    BorderSide? side,
    double elevation = 0,
  }) {
    return ButtonStyle(
      minimumSize: const WidgetStatePropertyAll(minTapTarget),
      tapTargetSize: MaterialTapTargetSize.padded,
      padding: const WidgetStatePropertyAll(
        EdgeInsets.symmetric(
          horizontal: HelmSpacing.lg,
          vertical: HelmSpacing.md,
        ),
      ),
      shape: WidgetStatePropertyAll(shape),
      side: side == null ? null : WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) {
          return BorderSide(color: scheme.onSurface.withValues(alpha: 0.12));
        }
        if (states.contains(WidgetState.focused)) {
          return BorderSide(color: scheme.primary, width: 2);
        }
        return side;
      }),
      foregroundColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) return disabledForeground;
        return foreground;
      }),
      backgroundColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) return disabledBackground;
        if (states.contains(WidgetState.selected)) {
          return scheme.primaryContainer;
        }
        return background;
      }),
      overlayColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.pressed)) {
          return overlay.withValues(alpha: 0.16);
        }
        if (states.contains(WidgetState.hovered)) {
          return overlay.withValues(alpha: 0.08);
        }
        if (states.contains(WidgetState.focused)) {
          return overlay.withValues(alpha: 0.12);
        }
        return null;
      }),
      elevation: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) return 0;
        if (states.contains(WidgetState.pressed)) {
          return elevation > 0 ? elevation : 0;
        }
        return elevation;
      }),
      shadowColor: const WidgetStatePropertyAll(Colors.transparent),
      surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
      textStyle: WidgetStatePropertyAll(
        TextStyle(
          fontFamily: HelmFonts.outfit,
          fontFamilyFallback: HelmFonts.arabicFallback,
          fontSize: HelmTypeSize.action,
        ),
      ),
    );
  }

  static ButtonStyle _filledButtonStyle(
    ColorScheme scheme,
    OutlinedBorder shape,
  ) {
    return _baseButtonStyle(
      scheme: scheme,
      shape: shape,
      foreground: scheme.onPrimary,
      disabledForeground: scheme.onSurface.withValues(alpha: 0.38),
      background: scheme.primary,
      disabledBackground: scheme.onSurface.withValues(alpha: 0.12),
      overlay: scheme.onPrimary,
    );
  }

  static ButtonStyle _elevatedButtonStyle(
    ColorScheme scheme,
    OutlinedBorder shape,
  ) {
    return _baseButtonStyle(
      scheme: scheme,
      shape: shape,
      foreground: scheme.onPrimary,
      disabledForeground: scheme.onSurface.withValues(alpha: 0.38),
      background: scheme.primary,
      disabledBackground: scheme.onSurface.withValues(alpha: 0.12),
      overlay: scheme.onPrimary,
      elevation: 1,
    );
  }

  static ButtonStyle _outlinedButtonStyle(
    ColorScheme scheme,
    OutlinedBorder shape,
  ) {
    return _baseButtonStyle(
      scheme: scheme,
      shape: shape,
      foreground: scheme.onSurface,
      disabledForeground: scheme.onSurface.withValues(alpha: 0.38),
      background: Colors.transparent,
      disabledBackground: Colors.transparent,
      overlay: scheme.onSurface,
      side: BorderSide(color: scheme.outline),
    );
  }

  static ButtonStyle _textButtonStyle(
    ColorScheme scheme,
    OutlinedBorder shape,
  ) {
    return _baseButtonStyle(
      scheme: scheme,
      shape: shape,
      foreground: scheme.onSurface,
      disabledForeground: scheme.onSurface.withValues(alpha: 0.38),
      background: Colors.transparent,
      disabledBackground: Colors.transparent,
      overlay: scheme.onSurface,
    );
  }

  static InputDecorationTheme _inputDecorationTheme(
    ColorScheme scheme,
    BorderRadius radius,
  ) {
    OutlineInputBorder border(Color color, {double width = 1}) =>
        OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: color, width: width),
        );

    return InputDecorationTheme(
      filled: true,
      fillColor: scheme.surfaceContainerLow,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: HelmSpacing.lg,
        vertical: HelmSpacing.md,
      ),
      hintStyle: TextStyle(
        color: scheme.onSurfaceVariant,
        fontFamily: HelmFonts.outfit,
        fontFamilyFallback: HelmFonts.arabicFallback,
        fontSize: HelmTypeSize.body,
      ),
      labelStyle: TextStyle(
        color: scheme.onSurfaceVariant,
        fontFamily: HelmFonts.outfit,
        fontFamilyFallback: HelmFonts.arabicFallback,
        fontSize: HelmTypeSize.bodySmall,
      ),
      floatingLabelStyle: WidgetStateTextStyle.resolveWith((states) {
        final color = states.contains(WidgetState.error)
            ? scheme.error
            : states.contains(WidgetState.focused)
                ? scheme.primary
                : scheme.onSurfaceVariant;
        return TextStyle(
          color: color,
          fontFamily: HelmFonts.outfit,
          fontFamilyFallback: HelmFonts.arabicFallback,
          fontSize: HelmTypeSize.meta,
        );
      }),
      border: border(scheme.outlineVariant),
      enabledBorder: border(scheme.outlineVariant),
      disabledBorder: border(scheme.onSurface.withValues(alpha: 0.12)),
      focusedBorder: border(scheme.primary, width: 2),
      errorBorder: border(scheme.error),
      focusedErrorBorder: border(scheme.error, width: 2),
    );
  }

  static ChipThemeData _chipTheme(
    ColorScheme scheme,
    TextTheme textTheme,
    BorderRadius radius,
  ) {
    return ChipThemeData(
      backgroundColor: scheme.surfaceContainerLow,
      selectedColor: scheme.primaryContainer,
      disabledColor: scheme.onSurface.withValues(alpha: 0.12),
      deleteIconColor: scheme.onSurfaceVariant,
      selectedShadowColor: Colors.transparent,
      secondarySelectedColor: scheme.primaryContainer,
      labelStyle: textTheme.labelLarge?.copyWith(color: scheme.onSurface),
      secondaryLabelStyle: textTheme.labelLarge?.copyWith(
        color: scheme.onPrimaryContainer,
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: HelmSpacing.md,
        vertical: HelmSpacing.sm,
      ),
      labelPadding: const EdgeInsets.symmetric(horizontal: HelmSpacing.sm),
      shape: RoundedRectangleBorder(
        borderRadius: radius,
        side: BorderSide(color: scheme.outlineVariant),
      ),
      side: BorderSide(color: scheme.outlineVariant),
      elevation: 0,
      pressElevation: 0,
      showCheckmark: true,
      checkmarkColor: scheme.onPrimaryContainer,
    );
  }
}

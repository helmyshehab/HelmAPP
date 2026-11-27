import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/main.dart';
import 'package:helm_mobile/theme/helm_colors.dart';
import 'package:helm_mobile/theme/helm_theme.dart';

const double _textAA = 4.5;
const double _nonTextAA = 3.0;

/// WCAG 2.x contrast ratio; a translucent [foreground] is composited onto
/// [background] first.
double contrast(Color foreground, Color background) {
  final fg = Color.alphaBlend(foreground, background).computeLuminance();
  final bg = background.computeLuminance();
  final lighter = fg > bg ? fg : bg;
  final darker = fg > bg ? bg : fg;
  return (lighter + 0.05) / (darker + 0.05);
}

List<Color> _surfaces(ColorScheme s) => [
      s.surface,
      s.surfaceContainerLowest,
      s.surfaceContainerLow,
      s.surfaceContainer,
      s.surfaceContainerHigh,
      s.surfaceContainerHighest,
    ];

void main() {
  group('palette', () {
    test('matches the approved Phase 1A hex values', () {
      expect(HelmColors.lightBackground, const Color(0xFFF7F4ED));
      expect(HelmColors.lightSurface, const Color(0xFFFFFFFF));
      expect(HelmColors.sand, const Color(0xFFE5DED2));
      expect(HelmColors.lightPrimary, const Color(0xFF173D35));
      expect(HelmColors.sage, const Color(0xFF789D8C));
      expect(HelmColors.champagne, const Color(0xFFBCA47E));

      expect(HelmColors.darkBackground, const Color(0xFF0B151C));
      expect(HelmColors.darkSurface, const Color(0xFF142831));
      expect(HelmColors.darkSelected, const Color(0xFF24534F));
      expect(HelmColors.darkPrimary, const Color(0xFF68B5A5));
      expect(HelmColors.darkText, const Color(0xFFF3EFE6));
      expect(HelmColors.darkMuted, const Color(0xFFA6C0BC));
    });

    test('keeps legacy aliases pointed at Phase 1A tokens', () {
      expect(HelmColors.ivory, HelmColors.lightBackground);
      expect(HelmColors.white, HelmColors.lightSurface);
      expect(HelmColors.midnight, HelmColors.darkBackground);
      expect(HelmColors.deepOcean, HelmColors.darkSurface);
      expect(HelmColors.teal, HelmColors.lightPrimary);
      expect(HelmColors.coral, HelmColors.champagne);
      expect(HelmColors.midnightMuted, HelmColors.lightMuted);
      expect(HelmColors.ivoryMuted, HelmColors.darkMuted);
      expect(HelmColors.midnightDivider, HelmColors.lightDivider);
      expect(HelmColors.ivoryDivider, HelmColors.darkDivider);
    });

    test('documents approved contrast figures', () {
      expect(
        contrast(HelmColors.lightPrimary, HelmColors.lightBackground),
        closeTo(10.89, 0.05),
      );
      expect(
        contrast(HelmColors.lightPrimary, HelmColors.lightSurface),
        closeTo(11.96, 0.05),
      );
      expect(
        contrast(HelmColors.lightSurface, HelmColors.lightPrimary),
        closeTo(11.96, 0.05),
      );
      expect(
        contrast(HelmColors.darkText, HelmColors.darkBackground),
        closeTo(16.08, 0.05),
      );
      expect(
        contrast(HelmColors.darkMuted, HelmColors.darkSurface),
        closeTo(7.90, 0.05),
      );
      expect(
        contrast(HelmColors.darkPrimary, HelmColors.darkBackground),
        closeTo(7.68, 0.05),
      );
      // Sage and Champagne fail as light text / boundaries.
      expect(
        contrast(HelmColors.sage, HelmColors.lightSurface),
        lessThan(_nonTextAA),
      );
      expect(
        contrast(HelmColors.champagne, HelmColors.lightBackground),
        lessThan(_nonTextAA),
      );
    });
  });

  for (final (name, theme) in [
    ('light', HelmTheme.light()),
    ('dark', HelmTheme.dark()),
  ]) {
    final scheme = theme.colorScheme;

    group('$name theme', () {
      test('body and muted text meet AA on every surface', () {
        for (final surface in _surfaces(scheme)) {
          expect(contrast(scheme.onSurface, surface),
              greaterThanOrEqualTo(_textAA));
          expect(contrast(scheme.onSurfaceVariant, surface),
              greaterThanOrEqualTo(_textAA));
        }
      });

      test('on-colors meet AA on their fills', () {
        final pairs = <(Color, Color)>[
          (scheme.onPrimary, scheme.primary),
          (scheme.onPrimaryContainer, scheme.primaryContainer),
          (scheme.onSecondary, scheme.secondary),
          (scheme.onSecondaryContainer, scheme.secondaryContainer),
          (scheme.onTertiary, scheme.tertiary),
          (scheme.onTertiaryContainer, scheme.tertiaryContainer),
          (scheme.onInverseSurface, scheme.inverseSurface),
          (scheme.inversePrimary, scheme.inverseSurface),
        ];
        for (final (fg, bg) in pairs) {
          expect(contrast(fg, bg), greaterThanOrEqualTo(_textAA));
        }
      });

      test('Material 3 error roles meet AA', () {
        expect(contrast(scheme.error, scheme.surface),
            greaterThanOrEqualTo(_textAA));
        expect(contrast(scheme.onError, scheme.error),
            greaterThanOrEqualTo(_textAA));
        expect(contrast(scheme.onErrorContainer, scheme.errorContainer),
            greaterThanOrEqualTo(_textAA));
      });

      test('control boundaries meet 3:1 on every surface', () {
        for (final surface in _surfaces(scheme)) {
          expect(contrast(scheme.outline, surface),
              greaterThanOrEqualTo(_nonTextAA));
        }
      });

      test('primary indicators and focus meet 3:1 on the base surface', () {
        expect(contrast(scheme.primary, scheme.surface),
            greaterThanOrEqualTo(_nonTextAA));
      });

      test('text and outlined button labels meet AA, not Sage', () {
        final labels = [
          theme.textButtonTheme.style!.foregroundColor!.resolve({}),
          theme.outlinedButtonTheme.style!.foregroundColor!.resolve({}),
        ];
        for (final label in labels) {
          expect(label, isNotNull);
          expect(label, isNot(HelmColors.sage));
          expect(contrast(label!, scheme.surface),
              greaterThanOrEqualTo(_textAA));
        }
      });

      test('dividers are decorative and separate from boundaries', () {
        final divider = scheme.outlineVariant;
        expect(divider.a, inInclusiveRange(0.10, 0.20));
        expect(divider, isNot(scheme.outline));
        expect(theme.dividerTheme.color, divider);
      });
    });
  }

  group('Champagne', () {
    test('is legible as an accent on dark surfaces', () {
      expect(contrast(HelmColors.champagne, HelmColors.darkBackground),
          greaterThanOrEqualTo(_textAA));
      expect(contrast(HelmColors.champagne, HelmColors.darkSurface),
          greaterThanOrEqualTo(_textAA));
    });

    test('fills carry primary or dark-background text', () {
      expect(contrast(HelmColors.lightPrimary, HelmColors.champagne),
          greaterThanOrEqualTo(_textAA));
      expect(contrast(HelmColors.darkBackground, HelmColors.champagne),
          greaterThanOrEqualTo(_textAA));
      expect(HelmTheme.lightScheme.tertiary, HelmColors.champagne);
      expect(HelmTheme.lightScheme.onTertiary, HelmColors.lightPrimary);
      expect(HelmTheme.darkScheme.tertiary, HelmColors.champagne);
      expect(HelmTheme.darkScheme.onTertiary, HelmColors.darkBackground);
    });

    test('is never text or a boundary on light surfaces', () {
      expect(contrast(HelmColors.champagne, HelmColors.lightBackground),
          lessThan(_nonTextAA));
      const light = HelmTheme.lightScheme;
      for (final role in [
        light.primary,
        light.onSurface,
        light.onSurfaceVariant,
        light.outline,
        light.error,
      ]) {
        expect(role, isNot(HelmColors.champagne));
      }
    });
  });

  group('Sage', () {
    test('is decorative on light surfaces, not text or outline', () {
      expect(contrast(HelmColors.sage, HelmColors.lightSurface),
          lessThan(_nonTextAA));
      const light = HelmTheme.lightScheme;
      for (final role in [
        light.primary,
        light.onSurface,
        light.onSurfaceVariant,
        light.outline,
        light.tertiary,
      ]) {
        expect(role, isNot(HelmColors.sage));
      }
    });
  });

  group('success', () {
    test('light and dark success pairs meet AA on Phase 1A surfaces', () {
      expect(
        contrast(HelmSuccessColors.lightSuccess, HelmColors.lightBackground),
        greaterThanOrEqualTo(_textAA),
      );
      expect(
        contrast(
          HelmSuccessColors.lightOnSuccess,
          HelmSuccessColors.lightSuccess,
        ),
        greaterThanOrEqualTo(_textAA),
      );
      expect(
        contrast(
          HelmSuccessColors.lightOnSuccessContainer,
          HelmSuccessColors.lightSuccessContainer,
        ),
        greaterThanOrEqualTo(_textAA),
      );
      expect(
        contrast(HelmSuccessColors.darkSuccess, HelmColors.darkBackground),
        greaterThanOrEqualTo(_textAA),
      );
      expect(
        contrast(
          HelmSuccessColors.darkOnSuccess,
          HelmSuccessColors.darkSuccess,
        ),
        greaterThanOrEqualTo(_textAA),
      );
      expect(
        contrast(
          HelmSuccessColors.darkOnSuccessContainer,
          HelmSuccessColors.darkSuccessContainer,
        ),
        greaterThanOrEqualTo(_textAA),
      );
    });
  });

  group('HelmApp', () {
    testWidgets('follows the system brightness', (tester) async {
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);

      tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
      await tester.pumpWidget(HelmApp());
      final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
      expect(app.themeMode, ThemeMode.system);
      expect(
        Theme.of(tester.element(find.byType(Scaffold))).colorScheme.surface,
        HelmColors.darkBackground,
      );

      // Discover's spinner never settles without a mock client, so pump only
      // through MaterialApp's theme transition.
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.light;
      await tester.pump();
      await tester.pump(kThemeAnimationDuration);
      expect(
        Theme.of(tester.element(find.byType(Scaffold))).colorScheme.surface,
        HelmColors.lightBackground,
      );
    });
  });
}

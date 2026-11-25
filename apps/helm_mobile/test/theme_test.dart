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
    test('matches the approved hex values', () {
      expect(HelmColors.midnight, const Color(0xFF0C1B2A));
      expect(HelmColors.deepOcean, const Color(0xFF163747));
      expect(HelmColors.teal, const Color(0xFF177F83));
      expect(HelmColors.coral, const Color(0xFFF1A38D));
      expect(HelmColors.ivory, const Color(0xFFF7F5F0));
    });

    test('reproduces the approved contrast figures', () {
      expect(contrast(HelmColors.ivory, HelmColors.midnight), closeTo(15.98, 0.05));
      expect(contrast(HelmColors.ivory, HelmColors.deepOcean), closeTo(11.53, 0.05));
      expect(contrast(HelmColors.white, HelmColors.teal), closeTo(4.77, 0.05));
      expect(contrast(HelmColors.teal, HelmColors.ivory), closeTo(4.38, 0.05));
      expect(contrast(HelmColors.teal, HelmColors.midnight), closeTo(3.65, 0.05));
      expect(contrast(HelmColors.coral, HelmColors.ivory), closeTo(1.86, 0.05));
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

      test('Teal indicators and focus meet 3:1 on the base surface', () {
        expect(contrast(scheme.primary, scheme.surface),
            greaterThanOrEqualTo(_nonTextAA));
      });

      test('text and outlined button labels meet AA, not Teal', () {
        final labels = [
          theme.textButtonTheme.style!.foregroundColor!.resolve({}),
          theme.outlinedButtonTheme.style!.foregroundColor!.resolve({}),
        ];
        for (final label in labels) {
          expect(label, isNotNull);
          expect(label, isNot(HelmColors.teal));
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

  group('Coral', () {
    test('is legible as an accent on dark surfaces', () {
      expect(contrast(HelmColors.coral, HelmColors.midnight),
          greaterThanOrEqualTo(_textAA));
      expect(contrast(HelmColors.coral, HelmColors.deepOcean),
          greaterThanOrEqualTo(_textAA));
    });

    test('fills carry Midnight or Deep Ocean text', () {
      expect(contrast(HelmColors.midnight, HelmColors.coral),
          greaterThanOrEqualTo(_textAA));
      expect(contrast(HelmColors.deepOcean, HelmColors.coral),
          greaterThanOrEqualTo(_textAA));
      for (final scheme in [HelmTheme.lightScheme, HelmTheme.darkScheme]) {
        expect(scheme.tertiary, HelmColors.coral);
        expect(scheme.onTertiary, HelmColors.midnight);
      }
    });

    test('is never text or a boundary on light surfaces', () {
      expect(contrast(HelmColors.coral, HelmColors.ivory),
          lessThan(_nonTextAA));
      const light = HelmTheme.lightScheme;
      for (final role in [
        light.primary,
        light.secondary,
        light.onSurface,
        light.onSurfaceVariant,
        light.outline,
        light.error,
      ]) {
        expect(role, isNot(HelmColors.coral));
      }
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
        HelmColors.midnight,
      );

      // Discover's spinner never settles without a mock client, so pump only
      // through MaterialApp's theme transition.
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.light;
      await tester.pump();
      await tester.pump(kThemeAnimationDuration);
      expect(
        Theme.of(tester.element(find.byType(Scaffold))).colorScheme.surface,
        HelmColors.ivory,
      );
    });
  });
}

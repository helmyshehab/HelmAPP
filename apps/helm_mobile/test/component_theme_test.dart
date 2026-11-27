import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/theme/helm_theme.dart';
import 'package:helm_mobile/theme/helm_tokens.dart';
import 'package:helm_mobile/theme/helm_typography.dart';

RoundedRectangleBorder? _round(ShapeBorder? shape) {
  return shape is RoundedRectangleBorder ? shape : null;
}

void main() {
  for (final (name, theme) in [
    ('light', HelmTheme.light()),
    ('dark', HelmTheme.dark()),
  ]) {
    final scheme = theme.colorScheme;

    group('$name component themes', () {
      test('buttons share 12dp radius and 48dp minimum targets', () {
        final styles = <ButtonStyle?>[
          theme.filledButtonTheme.style,
          theme.elevatedButtonTheme.style,
          theme.outlinedButtonTheme.style,
          theme.textButtonTheme.style,
        ];
        for (final style in styles) {
          expect(style, isNotNull);
          final min = style!.minimumSize!.resolve({});
          expect(min, HelmTheme.minTapTarget);
          expect(min!.height, HelmSpacing.xxxl);
          expect(min.width, HelmSpacing.xxxl);

          final shape = _round(style.shape!.resolve({}));
          expect(shape, isNotNull);
          expect(shape!.borderRadius, BorderRadius.circular(HelmRadius.md));
        }
      });

      test('filled and elevated buttons use primary fills and onPrimary labels',
          () {
        for (final style in [
          theme.filledButtonTheme.style!,
          theme.elevatedButtonTheme.style!,
        ]) {
          expect(style.backgroundColor!.resolve({}), scheme.primary);
          expect(style.foregroundColor!.resolve({}), scheme.onPrimary);
          expect(
            style.backgroundColor!.resolve({WidgetState.disabled}),
            scheme.onSurface.withValues(alpha: 0.12),
          );
          expect(
            style.foregroundColor!.resolve({WidgetState.disabled}),
            scheme.onSurface.withValues(alpha: 0.38),
          );
          expect(
            style.overlayColor!.resolve({WidgetState.hovered}),
            isNotNull,
          );
          expect(
            style.overlayColor!.resolve({WidgetState.pressed}),
            isNotNull,
          );
          expect(
            style.overlayColor!.resolve({WidgetState.focused}),
            isNotNull,
          );
        }
        expect(theme.elevatedButtonTheme.style!.elevation!.resolve({}), 1);
        expect(theme.filledButtonTheme.style!.elevation!.resolve({}), 0);
      });

      test('outlined and text buttons use onSurface labels with state overlays',
          () {
        for (final style in [
          theme.outlinedButtonTheme.style!,
          theme.textButtonTheme.style!,
        ]) {
          // Light onSurface equals primary by design; labels still resolve
          // through onSurface so they stay AA on every surface*.
          expect(style.foregroundColor!.resolve({}), scheme.onSurface);
          expect(
            style.foregroundColor!.resolve({WidgetState.disabled}),
            scheme.onSurface.withValues(alpha: 0.38),
          );
          expect(
            style.overlayColor!.resolve({WidgetState.hovered}),
            isNotNull,
          );
        }
        final outlinedSide =
            theme.outlinedButtonTheme.style!.side!.resolve({});
        expect(outlinedSide!.color, scheme.outline);
        final focusedSide = theme.outlinedButtonTheme.style!.side!
            .resolve({WidgetState.focused});
        expect(focusedSide!.width, 2);
        expect(focusedSide.color, scheme.primary);
      });

      test('inputs use 12dp radius with focus and error borders', () {
        final input = theme.inputDecorationTheme;
        expect(input.filled, isTrue);
        expect(input.fillColor, scheme.surfaceContainerLow);

        final enabled = input.enabledBorder! as OutlineInputBorder;
        final focused = input.focusedBorder! as OutlineInputBorder;
        final error = input.errorBorder! as OutlineInputBorder;
        expect(enabled.borderRadius, BorderRadius.circular(HelmRadius.md));
        expect(focused.borderRadius, BorderRadius.circular(HelmRadius.md));
        expect(focused.borderSide.width, 2);
        expect(focused.borderSide.color, scheme.primary);
        expect(error.borderSide.color, scheme.error);
      });

      test('dropdown menus inherit input chrome and low elevation surfaces', () {
        final dropdown = theme.dropdownMenuTheme;
        expect(dropdown.inputDecorationTheme, isNotNull);
        expect(
          dropdown.inputDecorationTheme!.focusedBorder,
          theme.inputDecorationTheme.focusedBorder,
        );
        final menuBg = dropdown.menuStyle!.backgroundColor!.resolve({});
        expect(menuBg, scheme.surfaceContainerLow);
        expect(dropdown.menuStyle!.elevation!.resolve({}), 1);
        expect(theme.popupMenuTheme.color, scheme.surfaceContainerLow);
        expect(theme.popupMenuTheme.elevation, 1);
      });

      test('cards use 16dp radius, subtle border, and no elevation', () {
        final card = theme.cardTheme;
        expect(card.elevation, 0);
        expect(card.color, scheme.surfaceContainerLow);
        expect(card.surfaceTintColor, Colors.transparent);
        final shape = _round(card.shape);
        expect(shape, isNotNull);
        expect(shape!.borderRadius, BorderRadius.circular(HelmRadius.lg));
        expect(shape.side.color, scheme.outlineVariant);
      });

      test('chips encode idle and selected surfaces', () {
        final chip = theme.chipTheme;
        expect(chip.backgroundColor, scheme.surfaceContainerLow);
        expect(chip.selectedColor, scheme.primaryContainer);
        expect(chip.secondarySelectedColor, scheme.primaryContainer);
        expect(chip.disabledColor, scheme.onSurface.withValues(alpha: 0.12));
        expect(chip.elevation, 0);
        expect(chip.checkmarkColor, scheme.onPrimaryContainer);
        final shape = _round(chip.shape);
        expect(shape!.borderRadius, BorderRadius.circular(HelmRadius.md));
      });

      test('dialogs and sheets use surface containers with soft radii', () {
        final dialog = theme.dialogTheme;
        expect(dialog.backgroundColor, scheme.surfaceContainerLow);
        expect(dialog.elevation, 1);
        final dialogShape = _round(dialog.shape);
        expect(dialogShape!.borderRadius, BorderRadius.circular(HelmRadius.lg));

        final sheet = theme.bottomSheetTheme;
        expect(sheet.backgroundColor, scheme.surfaceContainerLow);
        expect(sheet.elevation, 1);
        final sheetShape = sheet.shape! as RoundedRectangleBorder;
        expect(
          sheetShape.borderRadius,
          const BorderRadius.vertical(top: Radius.circular(HelmRadius.sheet)),
        );
      });

      test('action labels keep Outfit with Arabic fallback', () {
        final style = theme.filledButtonTheme.style!.textStyle!.resolve({});
        expect(style!.fontFamily, HelmFonts.outfit);
        expect(style.fontFamilyFallback, HelmFonts.arabicFallback);
        expect(style.fontSize, HelmTypeSize.action);
      });
    });
  }

  testWidgets('Material buttons inherit theme tap targets without overrides',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: HelmTheme.light(),
        home: Scaffold(
          body: Column(
            children: [
              FilledButton(onPressed: () {}, child: const Text('Filled')),
              OutlinedButton(onPressed: () {}, child: const Text('Outlined')),
              TextButton(onPressed: () {}, child: const Text('Text')),
            ],
          ),
        ),
      ),
    );

    for (final finder in [
      find.widgetWithText(FilledButton, 'Filled'),
      find.widgetWithText(OutlinedButton, 'Outlined'),
      find.widgetWithText(TextButton, 'Text'),
    ]) {
      expect(finder, findsOneWidget);
      expect(tester.getSize(finder).height, greaterThanOrEqualTo(48));
    }
  });
}

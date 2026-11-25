import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

import 'helm_typography.dart';

/// Accessible text placeholder for **HELM | حِلْم**.
///
/// This is not the custom Naskh wordmark. English uses Fraunces and the
/// Arabic word uses IBM Plex Sans Arabic, both at SemiBold, until an
/// approved calligraphy asset exists.
class HelmWordmark extends StatelessWidget {
  const HelmWordmark({super.key});

  static const String english = 'HELM';
  static const String separator = ' | ';

  /// حِلْم — ha, kasra, lam, sukun, meem.
  static const String arabic = '\u062D\u0650\u0644\u0652\u0645';
  static const String label = '$english$separator$arabic';

  static const List<int> arabicCodePoints = <int>[
    0x062D,
    0x0650,
    0x0644,
    0x0652,
    0x0645,
  ];

  /// Extra line box so the kasra and sukun stay inside the text bounds.
  static const double lineHeight = 1.5;

  /// Room around the line box so the app bar clip does not shave the marks.
  static const double clipClearance = 8;

  /// Material 3's small app bar. The shell keeps this until the lockup,
  /// including diacritic clearance, no longer fits.
  static const double materialToolbarHeight = 64;

  static const Key englishKey = Key('helm-wordmark-en');
  static const Key separatorKey = Key('helm-wordmark-separator');
  static const Key arabicKey = Key('helm-wordmark-ar');

  static TextRange get arabicRange {
    final start = english.length + separator.length;
    return TextRange(start: start, end: start + arabic.length);
  }

  /// Width of the centered title slot when the bar has no leading or actions.
  static double titleSlotWidth(double screenWidth) {
    if (!screenWidth.isFinite) return double.infinity;
    final slot = screenWidth - 2 * NavigationToolbar.kMiddleSpacing;
    if (!slot.isFinite) return double.infinity;
    return slot > 0 ? slot : 0;
  }

  static TextStyle runStyle({
    required double fontSize,
    required String fontFamily,
    Color? color,
  }) {
    return TextStyle(
      color: color,
      fontSize: fontSize,
      fontFamily: fontFamily,
      fontWeight: FontWeight.w600,
      height: lineHeight,
      letterSpacing: 0,
    );
  }

  /// Width of `HELM | حِلْم` on one line at [fontSize] and [textScaler].
  static double oneLineWidth({
    required double fontSize,
    required TextScaler textScaler,
  }) {
    return leadingLineWidth(fontSize: fontSize, textScaler: textScaler) +
        arabicLineWidth(fontSize: fontSize, textScaler: textScaler);
  }

  /// Width of `HELM |` before the Arabic word drops to its own line.
  static double leadingLineWidth({
    required double fontSize,
    required TextScaler textScaler,
  }) {
    final style = runStyle(fontSize: fontSize, fontFamily: HelmFonts.fraunces);
    return _spanWidth(
          text: english,
          style: style,
          textDirection: TextDirection.ltr,
          textScaler: textScaler,
        ) +
        _spanWidth(
          text: separator,
          style: style,
          textDirection: TextDirection.ltr,
          textScaler: textScaler,
        );
  }

  /// Width of `حِلْم` on its own line.
  static double arabicLineWidth({
    required double fontSize,
    required TextScaler textScaler,
  }) {
    return _spanWidth(
      text: arabic,
      style: runStyle(fontSize: fontSize, fontFamily: HelmFonts.plexArabic),
      textDirection: TextDirection.rtl,
      textScaler: textScaler,
    );
  }

  /// True when the one-line lockup fits. An unbounded width keeps one line.
  static bool fitsOnOneLine({
    required double maxWidth,
    required double fontSize,
    required TextScaler textScaler,
  }) {
    if (!maxWidth.isFinite) return true;
    return oneLineWidth(fontSize: fontSize, textScaler: textScaler) <= maxWidth;
  }

  /// How many lines a run needs when it may wrap inside [maxWidth].
  static int wrappedLineCount({
    required double width,
    required double maxWidth,
  }) {
    if (!maxWidth.isFinite || maxWidth <= 0 || width <= maxWidth) return 1;
    final lines = (width / maxWidth).ceil();
    return lines < 1 ? 1 : lines;
  }

  /// Toolbar height for one line, or more when the title slot is too narrow.
  static double toolbarHeight({
    required double maxWidth,
    required double fontSize,
    required TextScaler textScaler,
  }) {
    final lines = fitsOnOneLine(
      maxWidth: maxWidth,
      fontSize: fontSize,
      textScaler: textScaler,
    )
        ? 1
        : wrappedLineCount(
              width: leadingLineWidth(
                fontSize: fontSize,
                textScaler: textScaler,
              ),
              maxWidth: maxWidth,
            ) +
            wrappedLineCount(
              width: arabicLineWidth(
                fontSize: fontSize,
                textScaler: textScaler,
              ),
              maxWidth: maxWidth,
            );
    final needed =
        textScaler.scale(fontSize) * lineHeight * lines + clipClearance;
    return needed > materialToolbarHeight ? needed : materialToolbarHeight;
  }

  static double _spanWidth({
    required String text,
    required TextStyle style,
    required TextDirection textDirection,
    required TextScaler textScaler,
  }) {
    final painter = TextPainter(
      text: TextSpan(text: text, style: style),
      textDirection: textDirection,
      textScaler: textScaler,
      textWidthBasis: TextWidthBasis.longestLine,
      maxLines: 1,
    )..layout();
    // width drops trailing spaces. The separator ends with one, and the
    // rendered Text keeps it, so the row is wider than width alone.
    final width = painter.maxIntrinsicWidth;
    painter.dispose();
    return width;
  }

  @override
  Widget build(BuildContext context) {
    final inherited = DefaultTextStyle.of(context).style;
    final color = inherited.color ?? Theme.of(context).colorScheme.onSurface;
    final fontSize = inherited.fontSize ??
        Theme.of(context).textTheme.titleLarge?.fontSize ??
        22;
    final textScaler = MediaQuery.textScalerOf(context);
    final englishStyle = runStyle(
      fontSize: fontSize,
      fontFamily: HelmFonts.fraunces,
      color: color,
    );
    final arabicStyle = runStyle(
      fontSize: fontSize,
      fontFamily: HelmFonts.plexArabic,
      color: color,
    );

    return Semantics(
      attributedLabel: AttributedString(
        label,
        attributes: [
          LocaleStringAttribute(
            range: arabicRange,
            locale: const Locale('ar'),
          ),
        ],
      ),
      textDirection: TextDirection.ltr,
      excludeSemantics: true,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final oneLine = fitsOnOneLine(
            maxWidth: constraints.maxWidth,
            fontSize: fontSize,
            textScaler: textScaler,
          );
          if (oneLine) {
            return _oneLine(englishStyle, arabicStyle);
          }
          final maxWidth = constraints.maxWidth;
          final leadingFits = !maxWidth.isFinite ||
              leadingLineWidth(fontSize: fontSize, textScaler: textScaler) <=
                  maxWidth;
          final arabicFits = !maxWidth.isFinite ||
              arabicLineWidth(fontSize: fontSize, textScaler: textScaler) <=
                  maxWidth;
          return _stacked(
            englishStyle,
            arabicStyle,
            leadingFits: leadingFits,
            arabicFits: arabicFits,
          );
        },
      ),
    );
  }

  Widget _oneLine(TextStyle englishStyle, TextStyle arabicStyle) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      textDirection: TextDirection.ltr,
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      spacing: 0,
      children: <Widget>[
        _english(englishStyle),
        _separator(englishStyle),
        _arabic(arabicStyle),
      ],
    );
  }

  /// `HELM |` above `حِلْم`. The leading run wraps only when it exceeds the slot.
  Widget _stacked(
    TextStyle englishStyle,
    TextStyle arabicStyle, {
    required bool leadingFits,
    required bool arabicFits,
  }) {
    final leading = leadingFits
        ? Row(
            mainAxisSize: MainAxisSize.min,
            textDirection: TextDirection.ltr,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            spacing: 0,
            children: <Widget>[
              _run(english, englishKey, englishStyle, TextDirection.ltr, false),
              _run(
                separator,
                separatorKey,
                englishStyle,
                TextDirection.ltr,
                false,
              ),
            ],
          )
        : Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 0,
            runSpacing: 0,
            textDirection: TextDirection.ltr,
            children: <Widget>[
              _run(english, englishKey, englishStyle, TextDirection.ltr, true),
              _run(
                separator,
                separatorKey,
                englishStyle,
                TextDirection.ltr,
                true,
              ),
            ],
          );
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      spacing: 0,
      children: <Widget>[
        leading,
        _run(arabic, arabicKey, arabicStyle, TextDirection.rtl, !arabicFits),
      ],
    );
  }

  Widget _english(TextStyle style) =>
      _run(english, englishKey, style, TextDirection.ltr, false);

  Widget _separator(TextStyle style) =>
      _run(separator, separatorKey, style, TextDirection.ltr, false);

  Widget _arabic(TextStyle style) =>
      _run(arabic, arabicKey, style, TextDirection.rtl, false);

  Widget _run(
    String text,
    Key key,
    TextStyle style,
    TextDirection direction,
    bool wrap,
  ) {
    return Text(
      text,
      key: key,
      style: style,
      textDirection: direction,
      overflow: TextOverflow.visible,
      softWrap: wrap,
    );
  }
}

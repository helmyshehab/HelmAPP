import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/geo/country_label.dart';
import 'package:helm_mobile/theme/helm_wrapping_text.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('country labels fall back to the trimmed ISO code', () {
    expect(helmCountryLabel('ID'), 'ID');
    expect(helmCountryLabel('  TH  '), 'TH');
    expect(helmCountryLabel('XX'), 'XX');
    expect(helmCountryLabel(''), isNull);
    expect(helmCountryLabel('   '), isNull);
    expect(helmCountryLabel(null), isNull);
  });

  test('country labels prefer cached English names by ISO code', () {
    const names = {'ID': 'Indonesia', 'TH': 'Thailand'};
    expect(helmCountryLabel('ID', namesByCode: names), 'Indonesia');
    expect(helmCountryLabel(' th ', namesByCode: names), 'Thailand');
    expect(helmCountryLabel('XX', namesByCode: names), 'XX');
  });

  test('wide tokens gain break opportunities and short words do not', () {
    const style = TextStyle(fontSize: 40, height: 1.25);
    const scaler = TextScaler.linear(3.12);

    final discover = helmWrapWideTokens(
      'Discover',
      style: style,
      maxWidth: 120,
      textScaler: scaler,
      textDirection: TextDirection.ltr,
    );
    expect(discover.replaceAll(helmBreakOpportunity, ''), 'Discover');
    expect(discover.contains(helmBreakOpportunity), isTrue);

    final spaced = helmWrapWideTokens(
      'Browse published destinations.',
      style: const TextStyle(fontSize: 16),
      maxWidth: 800,
      textScaler: const TextScaler.linear(1),
      textDirection: TextDirection.ltr,
    );
    expect(spaced, 'Browse published destinations.');

    const mixedStyle = TextStyle(fontSize: 40, height: 1.25);
    final shortWidth = _width('Short', mixedStyle);
    final longWidth = _width('Supercalifragilistic', mixedStyle);
    final maxWidth = shortWidth + 4;
    expect(longWidth, greaterThan(maxWidth));

    final mixed = helmWrapWideTokens(
      'Short Supercalifragilistic',
      style: mixedStyle,
      maxWidth: maxWidth,
      textScaler: const TextScaler.linear(1),
      textDirection: TextDirection.ltr,
    );
    expect(mixed.startsWith('Short '), isTrue);
    expect(mixed.contains(helmBreakOpportunity), isTrue);

    final untouched = helmWrapWideTokens(
      'Harbor',
      style: const TextStyle(fontSize: 22),
      maxWidth: 800,
      textScaler: const TextScaler.linear(1),
      textDirection: TextDirection.ltr,
    );
    expect(untouched, 'Harbor');
  });
}

double _width(String text, TextStyle style) {
  final painter = TextPainter(
    text: TextSpan(text: text, style: style),
    textDirection: TextDirection.ltr,
  )..layout();
  final width = painter.width;
  painter.dispose();
  return width;
}

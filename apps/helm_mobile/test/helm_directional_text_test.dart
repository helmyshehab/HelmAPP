import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/theme/helm_directional_text.dart';

void main() {
  test('paragraph direction follows the first strong letter', () {
    expect(helmParagraphDirection('حلم'), TextDirection.rtl);
    expect(helmParagraphDirection('حِلْم'), TextDirection.rtl);
    expect(helmParagraphDirection('Hello'), TextDirection.ltr);
    expect(helmParagraphDirection('حلم Harbor'), TextDirection.rtl);
    expect(helmParagraphDirection('Harbor حلم'), TextDirection.ltr);
    expect(helmParagraphDirection('123 حلم'), TextDirection.rtl);
    expect(helmParagraphDirection('...حلم'), TextDirection.rtl);
    expect(helmParagraphDirection('(42) حلم'), TextDirection.rtl);
    expect(helmParagraphDirection('\u0650Hello'), TextDirection.ltr);
    expect(helmParagraphDirection('\u0650'), TextDirection.ltr);
    expect(helmParagraphDirection('\u0650\u062D\u0644\u0645'), TextDirection.rtl);
    expect(helmParagraphDirection(''), TextDirection.ltr);
    expect(helmParagraphDirection('   '), TextDirection.ltr);
    expect(helmParagraphDirection('...'), TextDirection.ltr);
    expect(helmParagraphDirection('123'), TextDirection.ltr);
    expect(helmParagraphDirection('\uFE8D'), TextDirection.rtl);
    expect(helmParagraphDirection('\uFB50'), TextDirection.rtl);
    expect(helmParagraphDirection('  \uFE8D Harbor'), TextDirection.rtl);
  });

  testWidgets('widget uses the detected direction and start alignment',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: HelmDirectionalText('حِلْم', key: Key('copy')),
        ),
      ),
    );

    final text = tester.widget<Text>(
      find.descendant(
        of: find.byKey(const Key('copy')),
        matching: find.byType(Text),
      ),
    );
    expect(text.data, 'حِلْم');
    expect(text.textDirection, TextDirection.rtl);
    expect(text.textAlign, TextAlign.start);
    expect(Directionality.of(tester.element(find.byType(Scaffold))), TextDirection.ltr);
  });

  testWidgets('English copy stays LTR inside an LTR scaffold', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: HelmDirectionalText('Harbor حلم', key: Key('copy')),
        ),
      ),
    );

    final text = tester.widget<Text>(
      find.descendant(
        of: find.byKey(const Key('copy')),
        matching: find.byType(Text),
      ),
    );
    expect(text.textDirection, TextDirection.ltr);
    expect(text.textAlign, TextAlign.start);
    expect(Directionality.of(tester.element(find.byType(Scaffold))), TextDirection.ltr);
  });

  testWidgets('large text does not throw', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) {
          return MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: TextScaler.linear(53 / 17),
            ),
            child: child!,
          );
        },
        home: const Scaffold(
          body: HelmDirectionalText(
            'حِلْم على سطر طويل للمعاينة البصرية مع التشكيل',
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(
      tester.widget<Text>(find.byType(Text)).textDirection,
      TextDirection.rtl,
    );
  });
}

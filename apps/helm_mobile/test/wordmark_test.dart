import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/main.dart';
import 'package:helm_mobile/tabs/discover_tab.dart';
import 'package:helm_mobile/theme/helm_colors.dart';
import 'package:helm_mobile/theme/helm_theme.dart';
import 'package:helm_mobile/theme/helm_typography.dart';
import 'package:helm_mobile/theme/helm_wordmark.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

HelmApiClient _emptyClient() {
  final mock = MockClient((request) async {
    return http.Response(
      jsonEncode({'items': [], 'total': 0, 'limit': 20, 'offset': 0}),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
  });
  return HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);
}

const Size _phoneSurface = Size(402, 874);

Future<void> _setSurface(WidgetTester tester, Size size) async {
  final view = tester.view;
  final ratio = view.devicePixelRatio;
  view.physicalSize = Size(size.width * ratio, size.height * ratio);
  addTearDown(view.resetPhysicalSize);
  await tester.binding.setSurfaceSize(size);
  addTearDown(() => tester.binding.setSurfaceSize(null));
}

Future<void> _pumpShell(
  WidgetTester tester, {
  required double scale,
  ThemeMode mode = ThemeMode.light,
}) {
  final auth = FakeTravelerAuth();
  addTearDown(auth.dispose);
  return tester.pumpWidget(
    MaterialApp(
      theme: HelmTheme.light(),
      darkTheme: HelmTheme.dark(),
      themeMode: mode,
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(scale),
          ),
          child: child!,
        );
      },
      home: HelmShell(auth: auth, apiClient: _emptyClient()),
    ),
  );
}

bool _isStacked(WidgetTester tester) {
  final english = tester.getRect(find.byKey(HelmWordmark.englishKey));
  final arabic = tester.getRect(find.byKey(HelmWordmark.arabicKey));
  return arabic.top >= english.bottom - 0.1;
}

void _expectInside(Rect inner, Rect outer) {
  expect(inner.left, greaterThanOrEqualTo(outer.left - 0.1));
  expect(inner.top, greaterThanOrEqualTo(outer.top - 0.1));
  expect(inner.right, lessThanOrEqualTo(outer.right + 0.1));
  expect(inner.bottom, lessThanOrEqualTo(outer.bottom + 0.1));
}

void _expectPaintedWithinBounds(WidgetTester tester, {required double scale}) {
  expect(tester.takeException(), isNull);

  final wordmark = tester.getRect(find.byType(HelmWordmark));
  final appBar = tester.getRect(find.byType(AppBar));
  final shellContext = tester.element(find.byType(HelmShell));
  _expectInside(wordmark, appBar);
  for (final key in <Key>[
    HelmWordmark.englishKey,
    HelmWordmark.separatorKey,
    HelmWordmark.arabicKey,
  ]) {
    _expectInside(tester.getRect(find.byKey(key)), wordmark);
  }

  final english = tester.widget<Text>(find.byKey(HelmWordmark.englishKey));
  final separator =
      tester.widget<Text>(find.byKey(HelmWordmark.separatorKey));
  final arabic = tester.widget<Text>(find.byKey(HelmWordmark.arabicKey));
  expect(english.data, 'HELM');
  expect(separator.data, HelmWordmark.separator);
  expect(arabic.data!.runes.toList(), HelmWordmark.arabicCodePoints);
  expect(english.style!.fontFamily, HelmFonts.fraunces);
  expect(separator.style!.fontFamily, HelmFonts.fraunces);
  expect(arabic.style!.fontFamily, HelmFonts.plexArabic);
  expect(english.style!.fontWeight, FontWeight.w600);
  expect(separator.style!.fontWeight, FontWeight.w600);
  expect(arabic.style!.fontWeight, FontWeight.w600);
  expect(english.textScaler, isNull);
  expect(separator.textScaler, isNull);
  expect(arabic.textScaler, isNull);

  final fontSize = Theme.of(shellContext).textTheme.titleLarge!.fontSize!;
  expect(english.style!.fontSize, fontSize);
  final slot = HelmWordmark.titleSlotWidth(MediaQuery.sizeOf(shellContext).width);
  final scaler = MediaQuery.textScalerOf(shellContext);
  expect(scaler.scale(1), closeTo(scale, 0.001));
  expect(
    MediaQuery.textScalerOf(tester.element(find.byType(HelmWordmark))).scale(1),
    closeTo(scale, 0.001),
  );
  expect(
    tester.getSize(find.byType(AppBar)).height,
    closeTo(
      HelmWordmark.toolbarHeight(
        maxWidth: slot,
        fontSize: fontSize,
        textScaler: scaler,
      ),
      0.5,
    ),
  );

  final stacked = _isStacked(tester);
  expect(
    stacked,
    isNot(
      HelmWordmark.fitsOnOneLine(
        maxWidth: slot,
        fontSize: fontSize,
        textScaler: scaler,
      ),
    ),
  );
  final englishRect = tester.getRect(find.byKey(HelmWordmark.englishKey));
  final separatorRect = tester.getRect(find.byKey(HelmWordmark.separatorKey));
  final arabicRect = tester.getRect(find.byKey(HelmWordmark.arabicKey));
  if (!stacked) {
    expect(englishRect.left, lessThan(separatorRect.left));
    expect(separatorRect.left, lessThan(arabicRect.left));
  } else {
    expect(arabicRect.top, greaterThanOrEqualTo(englishRect.bottom - 0.1));
    final leadingFits = HelmWordmark.leadingLineWidth(
          fontSize: fontSize,
          textScaler: scaler,
        ) <=
        slot;
    if (leadingFits) {
      expect((englishRect.top - separatorRect.top).abs(), lessThan(1));
    }
  }
}

void main() {
  test('brand string uses the approved Arabic code points', () {
    expect(
      HelmWordmark.arabic.runes.toList(),
      HelmWordmark.arabicCodePoints,
    );
    expect(HelmWordmark.arabicCodePoints, <int>[
      0x062D,
      0x0650,
      0x0644,
      0x0652,
      0x0645,
    ]);
    expect(HelmWordmark.label, 'HELM | ${HelmWordmark.arabic}');
    expect(HelmWordmark.arabic, isNot('حلم'));
    expect(HelmWordmark.arabic, isNot('حُلْم'));
  });

  testWidgets('lockup uses separate runs, weights, and directions',
      (tester) async {
    await _pumpShell(tester, scale: 1);
    await tester.pumpAndSettle();

    final english = tester.widget<Text>(find.byKey(HelmWordmark.englishKey));
    final separator =
        tester.widget<Text>(find.byKey(HelmWordmark.separatorKey));
    final arabic = tester.widget<Text>(find.byKey(HelmWordmark.arabicKey));
    final row = tester.widget<Row>(
      find.descendant(
        of: find.byType(HelmWordmark),
        matching: find.byType(Row),
      ),
    );

    expect(english.data, 'HELM');
    expect(english.textDirection, TextDirection.ltr);
    expect(english.style!.fontFamily, HelmFonts.fraunces);
    expect(english.style!.fontWeight, FontWeight.w600);

    expect(separator.data, ' | ');
    expect(separator.textDirection, TextDirection.ltr);
    expect(separator.style!.fontFamily, HelmFonts.fraunces);
    expect(separator.style!.fontWeight, FontWeight.w600);

    expect(arabic.data!.runes.toList(), HelmWordmark.arabicCodePoints);
    expect(arabic.textDirection, TextDirection.rtl);
    expect(arabic.style!.fontFamily, HelmFonts.plexArabic);
    expect(arabic.style!.fontWeight, FontWeight.w600);
    expect(arabic.style!.height, HelmWordmark.lineHeight);

    expect(row.textDirection, TextDirection.ltr);
    final englishX = tester.getTopLeft(find.byKey(HelmWordmark.englishKey)).dx;
    final separatorX =
        tester.getTopLeft(find.byKey(HelmWordmark.separatorKey)).dx;
    final arabicX = tester.getTopLeft(find.byKey(HelmWordmark.arabicKey)).dx;
    expect(englishX, lessThan(separatorX));
    expect(separatorX, lessThan(arabicX));
  });

  testWidgets('announces the lockup once, with Arabic identified',
      (tester) async {
    final handle = tester.ensureSemantics();
    try {
      await _pumpShell(tester, scale: 1);
      await tester.pumpAndSettle();

      expect(
        find.bySemanticsLabel(
          RegExp('^${RegExp.escape(HelmWordmark.label)}\$'),
        ),
        findsOneWidget,
      );
      expect(find.bySemanticsLabel(RegExp(r'^HELM$')), findsNothing);
      expect(
        find.bySemanticsLabel(
          RegExp('^${RegExp.escape(HelmWordmark.arabic)}\$'),
        ),
        findsNothing,
      );

      final node = tester.getSemantics(find.byType(HelmWordmark));
      expect(node.label, HelmWordmark.label);
      final locales = node.attributedLabel.attributes
          .whereType<LocaleStringAttribute>()
          .toList();
      expect(locales, hasLength(1));
      expect(locales.single.locale, const Locale('ar'));
      expect(locales.single.range, HelmWordmark.arabicRange);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('uses on-surface text in light and dark themes', (tester) async {
    await _pumpShell(tester, scale: 1);
    await tester.pumpAndSettle();
    for (final key in <Key>[
      HelmWordmark.englishKey,
      HelmWordmark.separatorKey,
      HelmWordmark.arabicKey,
    ]) {
      expect(
        tester.widget<Text>(find.byKey(key)).style!.color,
        HelmColors.midnight,
      );
    }

    await _pumpShell(tester, scale: 1, mode: ThemeMode.dark);
    await tester.pumpAndSettle();
    for (final key in <Key>[
      HelmWordmark.englishKey,
      HelmWordmark.separatorKey,
      HelmWordmark.arabicKey,
    ]) {
      expect(
        tester.widget<Text>(find.byKey(key)).style!.color,
        HelmColors.ivory,
      );
    }
  });

  testWidgets('scales without clipping and keeps Discover mounted',
      (tester) async {
    await _setSurface(tester, _phoneSurface);
    double? heightAtScale1;

    for (final scale in <double>[1, 1.3, 2]) {
      await _pumpShell(tester, scale: scale);
      await tester.pumpAndSettle();
      _expectPaintedWithinBounds(tester, scale: scale);
      expect(find.byType(DiscoverTab), findsOneWidget);
      expect(find.byType(NavigationBar), findsOneWidget);
      expect(find.text('Explore'), findsWidgets);
      expect(find.text('Build'), findsOneWidget);
      expect(find.text('Packages'), findsOneWidget);
      expect(find.text('Trips'), findsOneWidget);
      expect(find.text('Profile'), findsOneWidget);
      expect(
        MediaQuery.sizeOf(tester.element(find.byType(HelmShell))),
        _phoneSurface,
      );

      final shellContext = tester.element(find.byType(HelmShell));
      final fontSize = Theme.of(shellContext).textTheme.titleLarge!.fontSize!;
      final fits = HelmWordmark.fitsOnOneLine(
        maxWidth: HelmWordmark.titleSlotWidth(
          MediaQuery.sizeOf(shellContext).width,
        ),
        fontSize: fontSize,
        textScaler: TextScaler.linear(scale),
      );
      expect(_isStacked(tester), isNot(fits));

      final wordmark = tester.getRect(find.byType(HelmWordmark));
      final toolbar = tester.getSize(find.byType(AppBar)).height;
      if (fits && scale < 1.7) {
        expect(toolbar, HelmWordmark.materialToolbarHeight);
      } else {
        expect(toolbar, greaterThan(HelmWordmark.materialToolbarHeight));
      }

      if (scale == 1) {
        heightAtScale1 = wordmark.height;
      } else if (scale == 2 && fits) {
        expect(wordmark.height, closeTo(heightAtScale1! * 2, 0.5));
      }
    }
  });

  testWidgets('largest iOS accessibility size wraps instead of overflowing',
      (tester) async {
    const scale = 53 / 17;
    await _setSurface(tester, _phoneSurface);
    final handle = tester.ensureSemantics();
    try {
      for (final mode in <ThemeMode>[ThemeMode.light, ThemeMode.dark]) {
        await _pumpShell(tester, scale: scale, mode: mode);
        await tester.pumpAndSettle();
        _expectPaintedWithinBounds(tester, scale: scale);
        expect(_isStacked(tester), isTrue);
        expect(find.byType(DiscoverTab), findsOneWidget);

        final color =
            mode == ThemeMode.dark ? HelmColors.ivory : HelmColors.midnight;
        for (final key in <Key>[
          HelmWordmark.englishKey,
          HelmWordmark.separatorKey,
          HelmWordmark.arabicKey,
        ]) {
          expect(tester.widget<Text>(find.byKey(key)).style!.color, color);
        }

        expect(
          find.bySemanticsLabel(
            RegExp('^${RegExp.escape(HelmWordmark.label)}\$'),
          ),
          findsOneWidget,
        );
        final node = tester.getSemantics(find.byType(HelmWordmark));
        expect(node.label, HelmWordmark.label);
        final locales = node.attributedLabel.attributes
            .whereType<LocaleStringAttribute>()
            .toList();
        expect(locales, hasLength(1));
        expect(locales.single.locale, const Locale('ar'));
        expect(locales.single.range, HelmWordmark.arabicRange);

        final line = tester.getRect(find.byKey(HelmWordmark.englishKey)).height;
        final wordmark = tester.getRect(find.byType(HelmWordmark));
        expect(wordmark.height, greaterThan(line * 1.5));
        expect(
          tester.getSize(find.byType(AppBar)).height,
          greaterThan(wordmark.height),
        );
      }
    } finally {
      handle.dispose();
    }
  });

  testWidgets('narrow width at scale 2 stays within the title slot',
      (tester) async {
    await _setSurface(tester, const Size(320, 568));
    await _pumpShell(tester, scale: 2);
    await tester.pumpAndSettle();
    _expectPaintedWithinBounds(tester, scale: 2);
    expect(
      MediaQuery.sizeOf(tester.element(find.byType(HelmShell))).width,
      320,
    );
  });

  testWidgets('HelmApp keeps system theme mode and the brand title',
      (tester) async {
    await tester.pumpWidget(HelmApp());
    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.themeMode, ThemeMode.system);
    expect(app.title, HelmWordmark.label);
    expect(find.byType(HelmWordmark), findsOneWidget);
    expect(find.byType(DiscoverTab), findsOneWidget);
  });
}

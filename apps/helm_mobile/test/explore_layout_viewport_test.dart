import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/tabs/discover_tab.dart';
import 'package:helm_mobile/theme/helm_theme.dart';
import 'package:helm_mobile/widgets/helm_editorial_row.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'support/test_network_images.dart';

/// Phone viewport used for Explore layout checks.
const Size explorePhone = Size(390, 844);

http.Response _jsonOk(Object body) => http.Response(
      jsonEncode(body),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

HelmApiClient _client(MockClient mock) =>
    HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

Future<void> _pumpExplore(
  WidgetTester tester, {
  required ThemeData theme,
  required Size viewport,
  bool includeCover = false,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = viewport;
  addTearDown(tester.view.reset);
  final mock = MockClient((request) async {
    if (request.url.path.contains('/geo/countries')) {
      return _jsonOk({
        'items': [
          {'code': 'ID', 'nameEn': 'Indonesia'},
        ],
        'total': 1,
        'limit': 100,
        'offset': 0,
      });
    }
    // Omit coordinates so the globe stays empty and does not keep a ticker.
    return _jsonOk({
      'items': [
        {
          'id': '11111111-1111-1111-1111-111111111111',
          'slug': 'ubud',
          'nameEn': 'Ubud',
          'nameAr': 'أوبود',
          'summaryEn': 'Central Bali cultural heart with temples and terraces.',
          'countryCode': 'ID',
          'status': 'published',
          if (includeCover)
            'cover': {
              'url': 'https://cdn.example.com/ubud.jpg',
              'altTextEn': 'Rice terraces near Ubud',
              'altTextAr': 'مدرجات الأرز قرب أوبود',
            },
        },
        {
          'id': '22222222-2222-2222-2222-222222222222',
          'slug': 'canggu',
          'nameEn': 'Canggu',
          'summaryEn': 'Surf towns and cafes on Bali’s southwest coast.',
          'countryCode': 'ID',
          'status': 'published',
        },
      ],
      'total': 2,
      'limit': 20,
      'offset': 0,
    });
  });

  await tester.pumpWidget(
    MaterialApp(
      theme: theme,
      home: Scaffold(
        body: DiscoverTab(apiClient: _client(mock)),
      ),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  testWidgets('Explore 390x844 light: search integrated, no dropdown overflow',
      (tester) async {
    await _pumpExplore(
      tester,
      theme: HelmTheme.light(),
      viewport: explorePhone,
    );

    expect(tester.takeException(), isNull);
    expect(find.byKey(const Key('explore-heading')), findsOneWidget);
    expect(find.byKey(const Key('discover-search-field')), findsOneWidget);
    expect(find.byKey(const Key('discover-search-submit')), findsOneWidget);
    expect(find.text('Search'), findsNothing);
    expect(find.widgetWithText(FilledButton, 'Search'), findsNothing);
    expect(find.byKey(const Key('discover-globe-picker')), findsNothing);
    expect(find.text("Through HELM's eyes."), findsOneWidget);
    expect(
      tester
          .widget<Text>(find.byKey(const Key('explore-section-subtitle')))
          .style
          ?.fontStyle,
      FontStyle.italic,
    );

    final search = tester.getRect(find.byKey(const Key('discover-search-field')));
    expect(search.left, greaterThanOrEqualTo(0));
    expect(search.right, lessThanOrEqualTo(explorePhone.width));
    expect(search.width, greaterThan(200));

    final submitSize =
        tester.getSize(find.byKey(const Key('discover-search-submit')));
    expect(submitSize.width, greaterThanOrEqualTo(44));
    expect(submitSize.height, greaterThanOrEqualTo(44));
  });

  testWidgets('Explore 390x844 dark: rows use theme surface containers',
      (tester) async {
    await _pumpExplore(
      tester,
      theme: HelmTheme.dark(),
      viewport: explorePhone,
    );

    expect(tester.takeException(), isNull);
    final row = tester.widget<Material>(
      find.byKey(const Key('discover-item-ubud')),
    );
    expect(row.color, HelmTheme.darkScheme.surfaceContainer);

    expect(find.byKey(const Key('discover-search-field')), findsOneWidget);
    expect(find.byKey(const Key('discover-globe-picker')), findsNothing);
  });

  testWidgets('Explore 390x844 light: cover renders without breaking layout',
      (tester) async {
    await withTestNetworkImages(() async {
      await _pumpExplore(
        tester,
        theme: HelmTheme.light(),
        viewport: explorePhone,
        includeCover: true,
      );

      expect(tester.takeException(), isNull);
      expect(find.byType(Image), findsOneWidget);
      expect(
        tester.widget<Image>(find.byType(Image)).semanticLabel,
        'Rice terraces near Ubud',
      );

      final row = tester.getRect(find.byKey(const Key('discover-item-ubud')));
      expect(row.left, greaterThanOrEqualTo(0));
      expect(row.right, lessThanOrEqualTo(explorePhone.width + 0.5));
      expect(row.width, lessThanOrEqualTo(explorePhone.width));
      // Image floor is ~172; meta/title/body/action may grow slightly without clipping.
      expect(row.height, greaterThanOrEqualTo(156));
      expect(row.height, lessThanOrEqualTo(200));

      final imageSize = tester.getSize(find.byType(Image));
      expect(imageSize.width, HelmEditorialRow.thumbnailSize.width);
      expect(imageSize.height, HelmEditorialRow.thumbnailSize.height);

      // Destination without cover stays text-only.
      final canggu =
          tester.getRect(find.byKey(const Key('discover-item-canggu')));
      expect(canggu.width, lessThanOrEqualTo(explorePhone.width));
      expect(find.text('Explore'), findsWidgets);
    });
  });

  testWidgets('Explore 390x844 dark: cover + missing cover coexist',
      (tester) async {
    await withTestNetworkImages(() async {
      await _pumpExplore(
        tester,
        theme: HelmTheme.dark(),
        viewport: explorePhone,
        includeCover: true,
      );

      expect(tester.takeException(), isNull);
      expect(find.byType(Image), findsOneWidget);
      expect(
        tester
            .widget<Material>(find.byKey(const Key('discover-item-ubud')))
            .color,
        HelmTheme.darkScheme.surfaceContainer,
      );
      expect(
        tester
            .widget<Material>(find.byKey(const Key('discover-item-canggu')))
            .color,
        HelmTheme.darkScheme.surfaceContainer,
      );
    });
  });

  for (final width in const <double>[320, 390, 1024, 1440]) {
    testWidgets(
        'Explore ${width.toInt()}dp: content maxWidth and bounded cover row',
        (tester) async {
      await withTestNetworkImages(() async {
        final viewport = Size(width, 900);
        await _pumpExplore(
          tester,
          theme: HelmTheme.light(),
          viewport: viewport,
          includeCover: true,
        );

        expect(tester.takeException(), isNull);

        final column =
            tester.getRect(find.byKey(const Key('explore-content-column')));
        expect(column.width, lessThanOrEqualTo(DiscoverTab.contentMaxWidth + 0.5));
        if (width > DiscoverTab.contentMaxWidth + 40) {
          expect(column.width, closeTo(DiscoverTab.contentMaxWidth, 0.5));
        }

        final heading = tester.getRect(find.byKey(const Key('explore-heading')));
        final search =
            tester.getRect(find.byKey(const Key('discover-search-field')));
        final row = tester.getRect(find.byKey(const Key('discover-item-ubud')));
        expect(heading.left, closeTo(column.left, 1));
        expect(search.left, closeTo(column.left, 1));
        expect(row.left, closeTo(column.left, 1));
        expect(row.right, closeTo(column.right, 1));

        final imageSize = tester.getSize(find.byType(Image));
        final expectedThumb = width <= 320
            ? HelmEditorialRow.narrowThumbnailSize
            : HelmEditorialRow.thumbnailSize;
        // At 320 viewport, list padding leaves ~280 content → narrow thumb.
        expect(imageSize.width, expectedThumb.width);
        expect(imageSize.height, expectedThumb.height);

        expect(row.height, greaterThanOrEqualTo(140));
        expect(row.height, lessThanOrEqualTo(200));
      });
    });
  }
}

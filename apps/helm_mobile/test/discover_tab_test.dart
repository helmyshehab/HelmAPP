import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/tabs/discover_tab.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Widget _wrap(Widget child) {
  return MaterialApp(home: Scaffold(body: child));
}

HelmApiClient _client(MockClient mock) =>
    HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

/// UTF-8 JSON body — charset header selects utf8 (http 1.2.2 has no encoding:).
http.Response _jsonOk(Object body) => http.Response(
      jsonEncode(body),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

void main() {
  testWidgets('Discover shows loading while destinations request is in flight',
      (tester) async {
    final gate = Completer<void>();
    final mock = MockClient((request) async {
      await gate.future;
      return _jsonOk({'items': [], 'total': 0, 'limit': 20, 'offset': 0});
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    expect(find.byKey(const Key('discover-loading')), findsOneWidget);
    expect(find.byKey(const Key('discover-browse')), findsNothing);

    gate.complete();
    await tester.pumpAndSettle();
  });

  testWidgets('Discover shows empty state when API returns no items',
      (tester) async {
    final mock = MockClient((request) async {
      return _jsonOk({'items': [], 'total': 0, 'limit': 20, 'offset': 0});
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-empty')), findsOneWidget);
    expect(find.text('No destinations yet'), findsOneWidget);
    expect(find.byKey(const Key('discover-browse')), findsNothing);
  });

  testWidgets('Discover shows failure with Retry and reloads on tap',
      (tester) async {
    var calls = 0;
    final mock = MockClient((request) async {
      calls += 1;
      if (calls == 1) {
        return http.Response('boom', 500);
      }
      return _jsonOk({
        'items': [
          {
            'id': '11111111-1111-1111-1111-111111111111',
            'slug': 'ubud',
            'nameEn': 'Ubud',
            'nameAr': 'أبود',
            'summaryEn': 'Cultural heart of Bali',
            'summaryAr': null,
            'countryCode': 'ID',
            'status': 'published',
          },
        ],
        'total': 1,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-failure')), findsOneWidget);
    expect(find.byKey(const Key('discover-retry')), findsOneWidget);
    expect(find.byKey(const Key('discover-browse')), findsNothing);

    await tester.tap(find.byKey(const Key('discover-retry')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-list')), findsOneWidget);
    expect(find.text('Ubud'), findsOneWidget);
    expect(find.text('Cultural heart of Bali'), findsOneWidget);
    expect(calls, 2);
  });

  testWidgets('Discover lists destination names and available summaries',
      (tester) async {
    final mock = MockClient((request) async {
      expect(request.url.path, '/v1/destinations');
      return _jsonOk({
        'items': [
          {
            'id': '11111111-1111-1111-1111-111111111111',
            'slug': 'ubud',
            'nameEn': 'Ubud',
            'nameAr': 'أبود',
            'summaryEn': 'Cultural heart of Bali',
            'summaryAr': null,
            'countryCode': 'ID',
            'status': 'published',
          },
          {
            'id': '22222222-2222-2222-2222-222222222222',
            'slug': 'canggu',
            'nameEn': 'Canggu',
            'nameAr': 'تشانغو',
            'summaryEn': null,
            'summaryAr': null,
            'countryCode': 'ID',
            'status': 'published',
          },
        ],
        'total': 2,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-list')), findsOneWidget);
    expect(find.text('Ubud'), findsOneWidget);
    expect(find.text('Cultural heart of Bali'), findsOneWidget);
    expect(find.text('Canggu'), findsOneWidget);
  });

  testWidgets('Discover keeps English summaries and directs Arabic fallbacks',
      (tester) async {
    final mock = MockClient((request) async {
      return _jsonOk({
        'items': [
          {
            'id': '11111111-1111-1111-1111-111111111111',
            'slug': 'english-first',
            'nameEn': 'Harbor',
            'nameAr': 'ميناء',
            'summaryEn': 'English summary',
            'summaryAr': 'ملخص عربي',
            'countryCode': 'XX',
            'status': 'published',
          },
          {
            'id': '22222222-2222-2222-2222-222222222222',
            'slug': 'arabic-only',
            'nameEn': 'Coast',
            'nameAr': 'ساحل',
            'summaryEn': null,
            'summaryAr': 'ملخص عربي',
            'countryCode': 'XX',
            'status': 'published',
          },
        ],
        'total': 2,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    expect(find.text('English summary'), findsOneWidget);
    expect(find.text('ملخص عربي'), findsOneWidget);
    expect(
      tester.widget<Text>(find.text('English summary')).textDirection,
      TextDirection.ltr,
    );
    expect(
      tester.widget<Text>(find.text('ملخص عربي')).textDirection,
      TextDirection.rtl,
    );
    expect(tester.widget<Text>(find.text('Harbor')).textDirection, isNull);
    expect(
      Directionality.of(tester.element(find.byType(Scaffold))),
      TextDirection.ltr,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('Discover features only API-featured destinations and caps tags',
      (tester) async {
    final mock = MockClient((request) async {
      return _jsonOk({
        'items': [
          {
            'id': '11111111-1111-1111-1111-111111111111',
            'slug': 'harbor',
            'nameEn': 'Harbor',
            'nameAr': 'ميناء',
            'summaryEn': 'English harbor',
            'countryCode': 'ID',
            'isFeatured': false,
            'tags': ['harbor'],
            'status': 'published',
          },
          {
            'id': '22222222-2222-2222-2222-222222222222',
            'slug': 'ridge',
            'nameEn': 'Ridge',
            'nameAr': 'حافة',
            'summaryEn': 'First featured destination',
            'countryCode': 'TH',
            'isFeatured': true,
            'tags': ['rice_terrace', 'temple', 'walk', 'extra_tag'],
            'status': 'published',
          },
          {
            'id': '33333333-3333-3333-3333-333333333333',
            'slug': 'cove',
            'nameEn': 'Cove',
            'summaryEn': 'Second featured destination',
            'countryCode': 'GR',
            'isFeatured': true,
            'tags': ['cove'],
            'status': 'published',
          },
        ],
        'total': 3,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    expect(find.text('Featured'), findsNWidgets(2));
    expect(find.text('ID'), findsOneWidget);
    expect(find.text('TH'), findsOneWidget);
    expect(find.text('rice terrace'), findsOneWidget);
    expect(find.text('temple'), findsOneWidget);
    expect(find.text('walk'), findsOneWidget);
    expect(find.text('extra tag'), findsNothing);
    expect(find.text('extra_tag'), findsNothing);

    final harborSize = tester.widget<Text>(find.text('Harbor')).style?.fontSize;
    final ridgeSize = tester.widget<Text>(find.text('Ridge')).style?.fontSize;
    final coveSize = tester.widget<Text>(find.text('Cove')).style?.fontSize;
    expect(ridgeSize, greaterThan(harborSize!));
    expect(coveSize, harborSize);

    expect(
      tester.widget<Text>(find.text('ميناء')).textDirection,
      TextDirection.rtl,
    );
    expect(find.byKey(const Key('discover-browse')), findsOneWidget);
    expect(
      tester.getSize(find.byKey(const Key('discover-browse'))).height,
      greaterThanOrEqualTo(44),
    );
  });

  testWidgets('Browse destinations scrolls a later card into view',
      (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(400, 420);
    addTearDown(tester.view.reset);

    final mock = MockClient((request) async {
      return _jsonOk({
        'items': [
          for (var i = 0; i < 8; i++)
            {
              'id': '00000000-0000-0000-0000-${i.toString().padLeft(12, '0')}',
              'slug': 'place-$i',
              'nameEn': 'Place $i',
              'summaryEn': 'A published destination summary that fills the card. '
                  'More lines keep later places below the first screen.',
              'countryCode': 'ID',
              'status': 'published',
            },
        ],
        'total': 8,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    final laterBefore = tester.getTopLeft(find.text('Place 1')).dy;
    expect(laterBefore, greaterThan(420));

    await tester.tap(find.byKey(const Key('discover-browse')));
    await tester.pumpAndSettle();

    expect(
      PrimaryScrollController.of(
        tester.element(find.byKey(const Key('discover-list'))),
      ).offset,
      greaterThan(0),
    );
    expect(tester.getTopLeft(find.text('Place 1')).dy, lessThan(420));
  });

  testWidgets('Browse destinations jumps when motion is reduced',
      (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(400, 420);
    addTearDown(tester.view.reset);
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);

    final mock = MockClient((request) async {
      return _jsonOk({
        'items': [
          for (var i = 0; i < 8; i++)
            {
              'id': '00000000-0000-0000-0000-${i.toString().padLeft(12, '0')}',
              'slug': 'place-$i',
              'nameEn': 'Place $i',
              'summaryEn': 'A published destination summary that fills the card. '
                  'More lines keep later places below the first screen.',
              'countryCode': 'ID',
              'status': 'published',
            },
        ],
        'total': 8,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();
    expect(tester.getTopLeft(find.text('Place 1')).dy, greaterThan(420));

    await tester.tap(find.byKey(const Key('discover-browse')));
    await tester.pump();

    expect(
      PrimaryScrollController.of(
        tester.element(find.byKey(const Key('discover-list'))),
      ).offset,
      greaterThan(0),
    );
    expect(tester.getTopLeft(find.text('Place 1')).dy, lessThan(420));
  });

  testWidgets('Tapping a destination card opens the overview', (tester) async {
    final mock = MockClient((request) async {
      final path = request.url.path;
      if (path == '/v1/destinations/ubud') {
        return _jsonOk({
          'id': '11111111-1111-1111-1111-111111111111',
          'slug': 'ubud',
          'nameEn': 'Ubud',
          'nameAr': 'أبود',
          'summaryEn': 'Cultural heart of Bali',
          'countryCode': 'ID',
          'status': 'published',
        });
      }
      if (path == '/v1/catalog/places') {
        return _jsonOk({'items': [], 'total': 0, 'limit': 20, 'offset': 0});
      }
      return _jsonOk({
        'items': [
          {
            'id': '11111111-1111-1111-1111-111111111111',
            'slug': 'ubud',
            'nameEn': 'Ubud',
            'nameAr': 'أبود',
            'summaryEn': 'Cultural heart of Bali',
            'countryCode': 'ID',
            'status': 'published',
          },
        ],
        'total': 1,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('discover-item-ubud')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('destination-overview-back')), findsOneWidget);
    expect(find.text('Ubud'), findsWidgets);
  });

  testWidgets('maximum text scale keeps Discover and long names on screen',
      (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(402, 874);
    addTearDown(tester.view.reset);

    final mock = MockClient((request) async {
      return _jsonOk({
        'items': [
          {
            'id': '11111111-1111-1111-1111-111111111111',
            'slug': 'harbor',
            'nameEn': 'Demonstration',
            'nameAr': 'ميناء',
            'summaryEn': 'A regular preview card with an English summary.',
            'countryCode': 'ID',
            'isFeatured': false,
            'tags': ['harbor'],
            'status': 'published',
          },
          {
            'id': '22222222-2222-2222-2222-222222222222',
            'slug': 'ridge',
            'nameEn': 'Supercalifragilistic',
            'nameAr': 'حافة',
            'summaryEn': 'Featured destination',
            'countryCode': 'TH',
            'isFeatured': true,
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
        builder: (context, child) {
          return MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: const TextScaler.linear(3.12),
            ),
            child: child!,
          );
        },
        home: Scaffold(body: DiscoverTab(apiClient: _client(mock))),
      ),
    );
    await tester.pumpAndSettle();

    final discover = find.byWidgetPredicate(
      (widget) =>
          widget is Text &&
          (widget.data ?? '').replaceAll('\u200B', '') == 'Discover',
    );
    expect(discover, findsOneWidget);
    final discoverRect = tester.getRect(discover);
    expect(discoverRect.left, greaterThanOrEqualTo(0));
    expect(discoverRect.right, lessThanOrEqualTo(402));
    expect(discoverRect.height, greaterThan(0));
    final discoverText = tester.widget<Text>(discover);
    if ((discoverText.data ?? '').contains('\u200B')) {
      expect(discoverRect.height, greaterThan(40 * 3.12));
    }

    await tester.drag(
      find.byKey(const Key('discover-list')),
      const Offset(0, -2400),
    );
    await tester.pumpAndSettle();

    final longName = find.byWidgetPredicate(
      (widget) =>
          widget is Text &&
          (widget.data ?? '').replaceAll('\u200B', '') == 'Supercalifragilistic',
    );
    expect(longName, findsOneWidget);
    final nameRect = tester.getRect(longName);
    expect(nameRect.left, greaterThanOrEqualTo(0));
    expect(nameRect.right, lessThanOrEqualTo(402));
    expect(nameRect.height, greaterThan(0));

    final spaced = find.byWidgetPredicate(
      (widget) =>
          widget is Text &&
          (widget.data ?? '').replaceAll('\u200B', '') == 'Demonstration',
    );
    expect(spaced, findsOneWidget);
    expect(tester.getRect(spaced).right, lessThanOrEqualTo(402));

    final english = tester.getTopLeft(spaced);
    final arabic = tester.getTopLeft(find.text('ميناء'));
    expect(arabic.dx, closeTo(english.dx, 1));
    expect(arabic.dy, greaterThan(english.dy));

    expect(find.text('ID'), findsOneWidget);
    expect(find.text('TH'), findsOneWidget);
    expect(tester.takeException(), isNull);

    final ridge = tester.widget<Material>(
      find.byKey(const Key('discover-item-ridge')),
    );
    expect(ridge.color, const Color(0xFF0C1B2A));
    final harbor = tester.widget<Material>(
      find.byKey(const Key('discover-item-harbor')),
    );
    expect(harbor.color, const Color(0xFFFFFFFF));
  });

  testWidgets('dark featured card stays Deep Ocean', (tester) async {
    final mock = MockClient((request) async {
      return _jsonOk({
        'items': [
          {
            'id': '22222222-2222-2222-2222-222222222222',
            'slug': 'ridge',
            'nameEn': 'Ridge',
            'summaryEn': 'A featured place',
            'countryCode': 'XX',
            'isFeatured': true,
            'status': 'published',
          },
        ],
        'total': 1,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(brightness: Brightness.dark, useMaterial3: true),
        home: Scaffold(body: DiscoverTab(apiClient: _client(mock))),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      tester.widget<Material>(find.byKey(const Key('discover-item-ridge'))).color,
      const Color(0xFF163747),
    );
    expect(find.text('XX'), findsOneWidget);
    expect(find.text('Featured'), findsOneWidget);
  });

  testWidgets('Discover search keeps field mounted while results load',
      (tester) async {
    final gate = Completer<void>();
    var calls = 0;
    final mock = MockClient((request) async {
      calls += 1;
      if (calls == 1) {
        return _jsonOk({
          'items': [
            {
              'id': '11111111-1111-1111-1111-111111111111',
              'slug': 'harbor',
              'nameEn': 'Harbor',
              'summaryEn': 'A quiet harbor',
              'countryCode': 'ID',
              'status': 'published',
            },
          ],
          'total': 1,
          'limit': 20,
          'offset': 0,
        });
      }
      await gate.future;
      return _jsonOk({
        'items': [
          {
            'id': '22222222-2222-2222-2222-222222222222',
            'slug': 'ridge',
            'nameEn': 'Ridge',
            'summaryEn': 'Featured ridge',
            'countryCode': 'TH',
            'status': 'published',
          },
        ],
        'total': 1,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key('discover-search-field')),
      'Ridge',
    );
    await tester.tap(find.byKey(const Key('discover-search-submit')));
    await tester.pump();

    expect(find.byKey(const Key('discover-search-field')), findsOneWidget);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('discover-search-field')))
          .controller
          ?.text,
      'Ridge',
    );
    expect(find.byKey(const Key('discover-loading')), findsOneWidget);
    expect(find.byKey(const Key('discover-item-harbor')), findsNothing);

    gate.complete();
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-item-ridge')), findsOneWidget);
    expect(find.byKey(const Key('discover-loading')), findsNothing);
  });

  testWidgets('Discover search submits q and lists filtered results',
      (tester) async {
    final queries = <String?>[];
    final mock = MockClient((request) async {
      expect(request.url.path, '/v1/destinations');
      queries.add(request.url.queryParameters['q']);
      final q = request.url.queryParameters['q'];
      if (q == 'Ridge') {
        return _jsonOk({
          'items': [
            {
              'id': '22222222-2222-2222-2222-222222222222',
              'slug': 'ridge',
              'nameEn': 'Ridge',
              'summaryEn': 'Featured ridge',
              'countryCode': 'TH',
              'isFeatured': true,
              'status': 'published',
            },
          ],
          'total': 1,
          'limit': 20,
          'offset': 0,
        });
      }
      return _jsonOk({
        'items': [
          {
            'id': '11111111-1111-1111-1111-111111111111',
            'slug': 'harbor',
            'nameEn': 'Harbor',
            'summaryEn': 'A quiet harbor',
            'countryCode': 'ID',
            'status': 'published',
          },
          {
            'id': '22222222-2222-2222-2222-222222222222',
            'slug': 'ridge',
            'nameEn': 'Ridge',
            'summaryEn': 'Featured ridge',
            'countryCode': 'TH',
            'isFeatured': true,
            'status': 'published',
          },
        ],
        'total': 2,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    expect(queries, [null]);
    expect(find.text('Harbor'), findsOneWidget);
    expect(find.byKey(const Key('discover-search-clear')), findsNothing);

    await tester.enterText(
      find.byKey(const Key('discover-search-field')),
      '  Ridge  ',
    );
    await tester.tap(find.byKey(const Key('discover-search-submit')));
    await tester.pumpAndSettle();

    expect(queries, [null, 'Ridge']);
    expect(find.byKey(const Key('discover-item-ridge')), findsOneWidget);
    expect(find.byKey(const Key('discover-item-harbor')), findsNothing);
    expect(find.byKey(const Key('discover-search-clear')), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byKey(const Key('discover-search-field'))).controller?.text,
      'Ridge',
    );
  });

  testWidgets('Discover search clear restores the full list', (tester) async {
    final queries = <String?>[];
    final mock = MockClient((request) async {
      queries.add(request.url.queryParameters['q']);
      final q = request.url.queryParameters['q'];
      if (q == 'Ridge') {
        return _jsonOk({
          'items': [
            {
              'id': '22222222-2222-2222-2222-222222222222',
              'slug': 'ridge',
              'nameEn': 'Ridge',
              'summaryEn': 'Featured ridge',
              'countryCode': 'TH',
              'status': 'published',
            },
          ],
          'total': 1,
          'limit': 20,
          'offset': 0,
        });
      }
      return _jsonOk({
        'items': [
          {
            'id': '11111111-1111-1111-1111-111111111111',
            'slug': 'harbor',
            'nameEn': 'Harbor',
            'summaryEn': 'A quiet harbor',
            'countryCode': 'ID',
            'status': 'published',
          },
          {
            'id': '22222222-2222-2222-2222-222222222222',
            'slug': 'ridge',
            'nameEn': 'Ridge',
            'summaryEn': 'Featured ridge',
            'countryCode': 'TH',
            'status': 'published',
          },
        ],
        'total': 2,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key('discover-search-field')),
      'Ridge',
    );
    await tester.tap(find.byKey(const Key('discover-search-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Harbor'), findsNothing);

    await tester.tap(find.byKey(const Key('discover-search-clear')));
    await tester.pumpAndSettle();

    expect(queries, [null, 'Ridge', null]);
    expect(find.text('Harbor'), findsOneWidget);
    expect(find.text('Ridge'), findsOneWidget);
    expect(find.byKey(const Key('discover-search-clear')), findsNothing);
    expect(
      tester.widget<TextField>(find.byKey(const Key('discover-search-field'))).controller?.text,
      '',
    );
  });

  testWidgets('Discover search empty results keep search and explain the miss',
      (tester) async {
    final mock = MockClient((request) async {
      final q = request.url.queryParameters['q'];
      if (q == 'zzzznofit') {
        return _jsonOk({'items': [], 'total': 0, 'limit': 20, 'offset': 0});
      }
      return _jsonOk({
        'items': [
          {
            'id': '11111111-1111-1111-1111-111111111111',
            'slug': 'harbor',
            'nameEn': 'Harbor',
            'summaryEn': 'A quiet harbor',
            'countryCode': 'ID',
            'status': 'published',
          },
        ],
        'total': 1,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key('discover-search-field')),
      'zzzznofit',
    );
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-empty')), findsOneWidget);
    expect(find.text('No matching destinations'), findsOneWidget);
    expect(find.byKey(const Key('discover-empty-search')), findsOneWidget);
    expect(find.byKey(const Key('discover-search-field')), findsOneWidget);
    expect(find.byKey(const Key('discover-search-clear')), findsOneWidget);
    expect(find.byKey(const Key('discover-browse')), findsNothing);
    expect(find.text('Harbor'), findsNothing);
  });

  testWidgets('Discover search field uses RTL for Arabic input', (tester) async {
    final mock = MockClient((request) async {
      return _jsonOk({
        'items': [
          {
            'id': '11111111-1111-1111-1111-111111111111',
            'slug': 'harbor',
            'nameEn': 'Harbor',
            'nameAr': 'ميناء',
            'summaryEn': 'A quiet harbor',
            'countryCode': 'ID',
            'status': 'published',
          },
        ],
        'total': 1,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key('discover-search-field')),
      'ميناء',
    );
    await tester.pump();

    expect(
      tester.widget<TextField>(find.byKey(const Key('discover-search-field'))).textDirection,
      TextDirection.rtl,
    );
    expect(
      Directionality.of(tester.element(find.byType(Scaffold))),
      TextDirection.ltr,
    );
  });

  Map<String, dynamic> destinationJson(int index, {String? id}) {
    final n = index.toString().padLeft(12, '0');
    return {
      'id': id ?? '00000000-0000-0000-0000-$n',
      'slug': 'place-$index',
      'nameEn': 'Place $index',
      'summaryEn': 'Summary $index',
      'countryCode': 'ID',
      'status': 'published',
    };
  }

  List<Map<String, dynamic>> destinationPage(int start, int count) {
    return [for (var i = start; i < start + count; i++) destinationJson(i)];
  }

  /// Globe pages use limit=100; Discover list pages use 12.
  bool isGlobeCatalogRequest(http.BaseRequest request) =>
      request.url.queryParameters['limit'] == '100';

  http.Response emptyGlobeCatalog() => _jsonOk({
        'items': <Object>[],
        'total': 0,
        'limit': 100,
        'offset': 0,
      });

  Future<void> jumpToBottom(WidgetTester tester, {bool settle = true}) async {
    final listContext = tester.element(find.byKey(const Key('discover-list')));
    final controller = PrimaryScrollController.of(listContext);
    controller.jumpTo(controller.position.maxScrollExtent);
    if (settle) {
      await tester.pumpAndSettle();
    } else {
      await tester.pump();
    }
  }

  Future<void> jumpToTop(WidgetTester tester, {bool settle = true}) async {
    final listContext = tester.element(find.byKey(const Key('discover-list')));
    final controller = PrimaryScrollController.of(listContext);
    controller.jumpTo(0);
    if (settle) {
      await tester.pumpAndSettle();
    } else {
      await tester.pump();
    }
  }

  Future<void> revealAndTap(WidgetTester tester, Key key) async {
    await jumpToBottom(tester);
    final finder = find.byKey(key);
    expect(finder, findsOneWidget);
    final button = tester.widget<ButtonStyleButton>(finder);
    expect(button.onPressed, isNotNull);
    button.onPressed!();
  }

  testWidgets('Discover pagination loads first page of 12 from 25',
      (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(400, 900);
    addTearDown(tester.view.reset);

    final offsets = <String?>[];
    final mock = MockClient((request) async {
      if (isGlobeCatalogRequest(request)) return emptyGlobeCatalog();
      expect(request.url.queryParameters['limit'], '12');
      offsets.add(request.url.queryParameters['offset']);
      final offset = int.parse(request.url.queryParameters['offset'] ?? '0');
      return _jsonOk({
        'items': destinationPage(offset, 12),
        'total': 25,
        'limit': 12,
        'offset': offset,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    expect(offsets, ['0']);
    expect(find.text('Place 0'), findsOneWidget);
    expect(find.text('Place 12'), findsNothing);
    expect(find.byKey(const Key('discover-search-field')), findsOneWidget);
    expect(find.byKey(const Key('discover-browse')), findsOneWidget);

    await jumpToBottom(tester);
    expect(find.byKey(const Key('discover-load-more')), findsOneWidget);
    expect(find.text('Place 11'), findsOneWidget);
  });

  testWidgets('Discover pagination appends pages then hides Load more',
      (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(400, 900);
    addTearDown(tester.view.reset);

    final requests = <Map<String, String>>[];
    final mock = MockClient((request) async {
      if (isGlobeCatalogRequest(request)) return emptyGlobeCatalog();
      requests.add(Map<String, String>.from(request.url.queryParameters));
      final offset = int.parse(request.url.queryParameters['offset'] ?? '0');
      final remaining = 25 - offset;
      final count = remaining < 12 ? remaining : 12;
      return _jsonOk({
        'items': destinationPage(offset, count),
        'total': 25,
        'limit': 12,
        'offset': offset,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await revealAndTap(tester, const Key('discover-load-more'));
    await tester.pumpAndSettle();
    expect(find.text('Place 12'), findsWidgets);
    expect(find.text('Place 23'), findsWidgets);

    await revealAndTap(tester, const Key('discover-load-more'));
    await tester.pumpAndSettle();
    expect(find.text('Place 24'), findsWidgets);
    expect(find.byKey(const Key('discover-load-more')), findsNothing);

    expect(
      requests.map((r) => r['offset']).toList(),
      ['0', '12', '24'],
    );
    expect(requests.every((r) => r['limit'] == '12'), isTrue);
  });

  testWidgets('Discover pagination preserves q and resets on search',
      (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(400, 900);
    addTearDown(tester.view.reset);

    final requests = <Map<String, String>>[];
    final mock = MockClient((request) async {
      if (isGlobeCatalogRequest(request)) return emptyGlobeCatalog();
      final params = Map<String, String>.from(request.url.queryParameters);
      requests.add(params);
      final q = params['q'];
      final offset = int.parse(params['offset'] ?? '0');
      if (q == 'Ridge') {
        return _jsonOk({
          'items': [
            {
              'id': '22222222-2222-2222-2222-222222222222',
              'slug': 'ridge',
              'nameEn': 'Ridge',
              'summaryEn': 'Featured ridge',
              'countryCode': 'TH',
              'status': 'published',
            },
          ],
          'total': 1,
          'limit': 12,
          'offset': 0,
        });
      }
      final remaining = 25 - offset;
      final count = remaining < 12 ? remaining : 12;
      return _jsonOk({
        'items': destinationPage(offset, count),
        'total': 25,
        'limit': 12,
        'offset': offset,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await revealAndTap(tester, const Key('discover-load-more'));
    await tester.pumpAndSettle();
    expect(find.text('Place 12'), findsWidgets);

    await jumpToTop(tester);
    await tester.enterText(
      find.byKey(const Key('discover-search-field')),
      'Ridge',
    );
    tester
        .widget<ButtonStyleButton>(find.byKey(const Key('discover-search-submit')))
        .onPressed!();
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-item-ridge')), findsOneWidget);
    expect(find.text('Place 0'), findsNothing);
    expect(find.byKey(const Key('discover-load-more')), findsNothing);
    expect(requests.last['q'], 'Ridge');
    expect(requests.last['limit'], '12');
    expect(requests.last['offset'], '0');
    expect(requests[1]['q'], isNull);
    expect(requests[1]['offset'], '12');
  });

  testWidgets('Discover pagination advances offset past duplicate ids',
      (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(400, 900);
    addTearDown(tester.view.reset);

    final offsets = <String?>[];
    final mock = MockClient((request) async {
      if (isGlobeCatalogRequest(request)) return emptyGlobeCatalog();
      offsets.add(request.url.queryParameters['offset']);
      final offset = int.parse(request.url.queryParameters['offset'] ?? '0');
      if (offset == 0) {
        return _jsonOk({
          'items': destinationPage(0, 12),
          'total': 30,
          'limit': 12,
          'offset': 0,
        });
      }
      if (offset == 12) {
        // Overlap first page ids; raw page count is still 12.
        return _jsonOk({
          'items': [
            ...destinationPage(0, 6),
            ...destinationPage(12, 6),
          ],
          'total': 30,
          'limit': 12,
          'offset': 12,
        });
      }
      return _jsonOk({
        'items': destinationPage(24, 6),
        'total': 30,
        'limit': 12,
        'offset': 24,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await revealAndTap(tester, const Key('discover-load-more'));
    await tester.pumpAndSettle();
    expect(find.text('Place 12'), findsWidgets);
    expect(find.text('Place 17'), findsWidgets);

    await revealAndTap(tester, const Key('discover-load-more'));
    await tester.pumpAndSettle();
    expect(find.text('Place 24'), findsWidgets);
    expect(offsets, ['0', '12', '24']);
  });

  testWidgets('Discover pagination shows page error and retries',
      (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(400, 900);
    addTearDown(tester.view.reset);

    var listCalls = 0;
    final mock = MockClient((request) async {
      if (isGlobeCatalogRequest(request)) return emptyGlobeCatalog();
      listCalls += 1;
      final offset = int.parse(request.url.queryParameters['offset'] ?? '0');
      if (offset == 0) {
        return _jsonOk({
          'items': destinationPage(0, 12),
          'total': 25,
          'limit': 12,
          'offset': 0,
        });
      }
      if (listCalls == 2) {
        return http.Response('boom', 500);
      }
      return _jsonOk({
        'items': destinationPage(12, 12),
        'total': 25,
        'limit': 12,
        'offset': 12,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await revealAndTap(tester, const Key('discover-load-more'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-page-error')), findsOneWidget);
    expect(find.byKey(const Key('discover-page-retry')), findsOneWidget);
    expect(find.text('Place 0'), findsWidgets);

    tester
        .widget<ButtonStyleButton>(find.byKey(const Key('discover-page-retry')))
        .onPressed!();
    await tester.pumpAndSettle();

    expect(find.text('Place 12'), findsWidgets);
    expect(find.byKey(const Key('discover-page-error')), findsNothing);
    expect(listCalls, 3);
  });

  testWidgets('Discover pagination ignores stale page after search',
      (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(400, 900);
    addTearDown(tester.view.reset);

    final pageGate = Completer<void>();
    var listCalls = 0;
    final mock = MockClient((request) async {
      if (isGlobeCatalogRequest(request)) return emptyGlobeCatalog();
      listCalls += 1;
      final q = request.url.queryParameters['q'];
      final offset = int.parse(request.url.queryParameters['offset'] ?? '0');
      if (listCalls == 1) {
        return _jsonOk({
          'items': destinationPage(0, 12),
          'total': 25,
          'limit': 12,
          'offset': 0,
        });
      }
      if (q == 'Ridge') {
        return _jsonOk({
          'items': [
            {
              'id': '22222222-2222-2222-2222-222222222222',
              'slug': 'ridge',
              'nameEn': 'Ridge',
              'summaryEn': 'Featured ridge',
              'countryCode': 'TH',
              'status': 'published',
            },
          ],
          'total': 1,
          'limit': 12,
          'offset': 0,
        });
      }
      await pageGate.future;
      return _jsonOk({
        'items': destinationPage(offset, 12),
        'total': 25,
        'limit': 12,
        'offset': offset,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await revealAndTap(tester, const Key('discover-load-more'));
    await tester.pump();
    expect(find.byKey(const Key('discover-page-loading')), findsOneWidget);

    await jumpToTop(tester, settle: false);
    expect(find.byKey(const Key('discover-search-field')), findsOneWidget);
    await tester.enterText(
      find.byKey(const Key('discover-search-field')),
      'Ridge',
    );
    tester
        .widget<ButtonStyleButton>(find.byKey(const Key('discover-search-submit')))
        .onPressed!();
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-item-ridge')), findsOneWidget);
    expect(find.text('Place 12'), findsNothing);

    pageGate.complete();
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-item-ridge')), findsOneWidget);
    expect(find.text('Place 12'), findsNothing);
  });
}

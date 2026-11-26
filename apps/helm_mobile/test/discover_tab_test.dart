import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/tabs/discover_tab.dart';
import 'package:helm_mobile/theme/helm_theme.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: HelmTheme.light(),
    darkTheme: HelmTheme.dark(),
    home: Scaffold(body: child),
  );
}

HelmApiClient _client(MockClient mock) =>
    HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

/// UTF-8 JSON body — charset header selects utf8 (http 1.2.2 has no encoding:).
http.Response _jsonOk(Object body) => http.Response(
      jsonEncode(body),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

bool _isGeoCountries(http.BaseRequest request) =>
    request.url.path.contains('/geo/countries');

http.Response _emptyCountries() => _jsonOk({
      'items': <Object>[],
      'total': 0,
      'limit': 100,
      'offset': 0,
    });

void main() {
  testWidgets('Discover shows loading while destinations request is in flight',
      (tester) async {
    final gate = Completer<void>();
    final mock = MockClient((request) async {
      if (_isGeoCountries(request)) return _emptyCountries();
      await gate.future;
      return _jsonOk({'items': [], 'total': 0, 'limit': 20, 'offset': 0});
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    expect(find.byKey(const Key('discover-loading')), findsOneWidget);
    expect(find.byKey(const Key('discover-browse')), findsNothing);
    expect(find.byKey(const Key('explore-heading')), findsNothing);

    gate.complete();
    await tester.pumpAndSettle();
  });

  testWidgets('Discover shows empty state when API returns no items',
      (tester) async {
    final mock = MockClient((request) async {
      if (_isGeoCountries(request)) return _emptyCountries();
      return _jsonOk({'items': [], 'total': 0, 'limit': 20, 'offset': 0});
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-empty')), findsOneWidget);
    expect(find.text('No destinations yet'), findsOneWidget);
    expect(find.byKey(const Key('explore-heading')), findsOneWidget);
    expect(find.byKey(const Key('discover-browse')), findsNothing);
  });

  testWidgets('Discover shows failure with Retry and reloads on tap',
      (tester) async {
    var destinationCalls = 0;
    final mock = MockClient((request) async {
      if (_isGeoCountries(request)) return _emptyCountries();
      destinationCalls += 1;
      if (destinationCalls == 1) {
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
    expect(destinationCalls, 2);
  });

  testWidgets('Discover lists destination names and available summaries',
      (tester) async {
    final mock = MockClient((request) async {
      if (_isGeoCountries(request)) return _emptyCountries();
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
      if (_isGeoCountries(request)) return _emptyCountries();
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

  testWidgets('Explore rows are uniform without featured chips or tags',
      (tester) async {
    final mock = MockClient((request) async {
      if (_isGeoCountries(request)) {
        return _jsonOk({
          'items': [
            {'code': 'ID', 'nameEn': 'Indonesia'},
            {'code': 'TH', 'nameEn': 'Thailand'},
            {'code': 'GR', 'nameEn': 'Greece'},
          ],
          'total': 3,
          'limit': 100,
          'offset': 0,
        });
      }
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

    expect(find.text('Featured'), findsNothing);
    expect(find.text('Indonesia'), findsOneWidget);
    expect(find.text('Thailand'), findsOneWidget);
    expect(find.text('rice terrace'), findsNothing);
    expect(find.text('temple'), findsNothing);
    expect(find.text('walk'), findsNothing);
    expect(find.byKey(const Key('explore-heading')), findsOneWidget);
    expect(find.text('Explore with HELM'), findsOneWidget);
    expect(find.byKey(const Key('explore-section-heading')), findsOneWidget);
    expect(find.text('Where we take you'), findsOneWidget);
    expect(find.text("Through HELM's eyes."), findsOneWidget);
    expect(find.byKey(const Key('discover-browse')), findsNothing);

    double nameSize(String slug, String name) {
      return tester
          .widget<Text>(
            find.descendant(
              of: find.byKey(Key('discover-item-$slug'), skipOffstage: false),
              matching: find.text(name, skipOffstage: false),
            ),
          )
          .style!
          .fontSize!;
    }

    expect(nameSize('ridge', 'Ridge'), nameSize('harbor', 'Harbor'));
    expect(nameSize('cove', 'Cove'), nameSize('harbor', 'Harbor'));

    expect(
      tester
          .widget<Text>(
            find.descendant(
              of: find.byKey(const Key('discover-item-harbor'), skipOffstage: false),
              matching: find.text('ميناء', skipOffstage: false),
            ),
          )
          .textDirection,
      TextDirection.rtl,
    );
  });

  testWidgets('Explore layout places search above destinations section',
      (tester) async {
    final mock = MockClient((request) async {
      if (_isGeoCountries(request)) return _emptyCountries();
      return _jsonOk({
        'items': [
          {
            'id': '11111111-1111-1111-1111-111111111111',
            'slug': 'ubud',
            'nameEn': 'Ubud',
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

    final headingTop =
        tester.getTopLeft(find.byKey(const Key('explore-heading'))).dy;
    final searchTop =
        tester.getTopLeft(find.byKey(const Key('discover-search-field'))).dy;
    final sectionTop =
        tester.getTopLeft(find.byKey(const Key('explore-section-heading'))).dy;
    expect(headingTop, lessThan(searchTop));
    expect(searchTop, lessThan(sectionTop));
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('discover-search-field')))
          .decoration
          ?.hintText,
      'Find your next destination',
    );
  });

  testWidgets('Tapping a destination card opens the overview', (tester) async {
    final mock = MockClient((request) async {
      if (_isGeoCountries(request)) return _emptyCountries();
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
      if (_isGeoCountries(request)) return _emptyCountries();
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
        theme: HelmTheme.light(),
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

    final explore = find.byWidgetPredicate(
      (widget) =>
          widget is Text &&
          (widget.data ?? '').replaceAll('\u200B', '') == 'Explore with HELM',
    );
    expect(explore, findsOneWidget);
    final exploreRect = tester.getRect(explore);
    expect(exploreRect.left, greaterThanOrEqualTo(0));
    expect(exploreRect.right, lessThanOrEqualTo(402));
    expect(exploreRect.height, greaterThan(0));
    final exploreText = tester.widget<Text>(explore);
    if ((exploreText.data ?? '').contains('\u200B')) {
      expect(exploreRect.height, greaterThan(40 * 3.12));
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
    expect(ridge.color, HelmTheme.lightScheme.surfaceContainer);
    final harbor = tester.widget<Material>(
      find.byKey(const Key('discover-item-harbor')),
    );
    expect(harbor.color, HelmTheme.lightScheme.surfaceContainer);
  });

  testWidgets('dark destination rows use theme surface containers',
      (tester) async {
    final mock = MockClient((request) async {
      if (_isGeoCountries(request)) return _emptyCountries();
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
        theme: HelmTheme.dark(),
        home: Scaffold(body: DiscoverTab(apiClient: _client(mock))),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      tester.widget<Material>(find.byKey(const Key('discover-item-ridge'))).color,
      HelmTheme.darkScheme.surfaceContainer,
    );
    expect(find.text('XX'), findsOneWidget);
    expect(find.text('Featured'), findsNothing);
  });

  testWidgets('Discover search keeps field mounted while results load',
      (tester) async {
    final gate = Completer<void>();
    var calls = 0;
    final mock = MockClient((request) async {
      if (_isGeoCountries(request)) return _emptyCountries();
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
      if (_isGeoCountries(request)) return _emptyCountries();
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
      if (_isGeoCountries(request)) return _emptyCountries();
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
      if (_isGeoCountries(request)) return _emptyCountries();
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

  /// Globe pages use destinations limit=100; Explore list pages use 12.
  bool isGlobeCatalogRequest(http.BaseRequest request) =>
      request.url.path.contains('/destinations') &&
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

  Future<void> revealAndTap(
    WidgetTester tester,
    Key key, {
    bool settle = true,
  }) async {
    await jumpToBottom(tester);
    final finder = find.byKey(key);
    expect(finder, findsOneWidget);
    final button = tester.widget<ButtonStyleButton>(finder);
    expect(button.onPressed, isNotNull);
    button.onPressed!();
    if (!settle) {
      await tester.pump();
      return;
    }
    await tester.pumpAndSettle();
    // ListView builds lazily; return to the bottom so appended rows mount.
    await jumpToBottom(tester);
  }

  Finder placeItem(int index) =>
      find.byKey(Key('discover-item-place-$index'), skipOffstage: false);

  Finder searchField() =>
      find.byKey(const Key('discover-search-field'), skipOffstage: false);

  Finder searchSubmit() =>
      find.byKey(const Key('discover-search-submit'), skipOffstage: false);

  Future<void> submitSearchQuery(WidgetTester tester, String query) async {
    await jumpToTop(tester);
    final field = tester.widget<TextField>(searchField());
    field.controller!.value = TextEditingValue(
      text: query,
      selection: TextSelection.collapsed(offset: query.length),
    );
    await tester.pump();
    tester.widget<IconButton>(searchSubmit()).onPressed!();
  }

  testWidgets('Discover pagination loads first page of 12 from 25',
      (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(400, 900);
    addTearDown(tester.view.reset);

    final offsets = <String?>[];
    final mock = MockClient((request) async {
      if (_isGeoCountries(request)) return _emptyCountries();
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
    expect(find.text('Place 0', skipOffstage: false), findsOneWidget);
    expect(find.text('Place 12', skipOffstage: false), findsNothing);
    expect(find.byKey(const Key('discover-search-field')), findsOneWidget);
    expect(find.byKey(const Key('explore-heading')), findsOneWidget);
    expect(find.byKey(const Key('discover-browse')), findsNothing);

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
      if (_isGeoCountries(request)) return _emptyCountries();
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
    expect(placeItem(23), findsOneWidget);

    await revealAndTap(tester, const Key('discover-load-more'));
    expect(placeItem(24), findsOneWidget);
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
      if (_isGeoCountries(request)) return _emptyCountries();
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
    expect(placeItem(23), findsOneWidget);

    await submitSearchQuery(tester, 'Ridge');
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-item-ridge')), findsOneWidget);
    expect(placeItem(0), findsNothing);
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
      if (_isGeoCountries(request)) return _emptyCountries();
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
    expect(placeItem(17), findsOneWidget);

    await revealAndTap(tester, const Key('discover-load-more'));
    // After dedupe, page 3 starts at offset 24; confirm the request trail.
    expect(offsets, ['0', '12', '24']);
    expect(placeItem(24), findsOneWidget);
  });

  testWidgets('Discover pagination shows page error and retries',
      (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(400, 900);
    addTearDown(tester.view.reset);

    var listCalls = 0;
    final mock = MockClient((request) async {
      if (_isGeoCountries(request)) return _emptyCountries();
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

    expect(find.byKey(const Key('discover-page-error')), findsOneWidget);
    expect(find.byKey(const Key('discover-page-retry')), findsOneWidget);

    tester
        .widget<ButtonStyleButton>(find.byKey(const Key('discover-page-retry')))
        .onPressed!();
    await tester.pumpAndSettle();
    await jumpToBottom(tester);

    expect(placeItem(23), findsOneWidget);
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
      if (_isGeoCountries(request)) return _emptyCountries();
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

    await revealAndTap(tester, const Key('discover-load-more'), settle: false);
    expect(find.byKey(const Key('discover-page-loading')), findsOneWidget);

    await submitSearchQuery(tester, 'Ridge');
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-item-ridge')), findsOneWidget);
    expect(placeItem(12), findsNothing);

    pageGate.complete();
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-item-ridge')), findsOneWidget);
    expect(find.text('Place 12', skipOffstage: false), findsNothing);
  });
}

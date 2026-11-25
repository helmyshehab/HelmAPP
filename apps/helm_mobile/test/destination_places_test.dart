import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/discover/destination_overview_screen.dart';
import 'package:helm_mobile/discover/place_list_item.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Widget _wrap(Widget child) {
  return MaterialApp(home: child);
}

HelmApiClient _client(MockClient mock) =>
    HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

http.Response _jsonOk(Object body) => http.Response(
      jsonEncode(body),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

Map<String, dynamic> _detailPayload({
  required String slug,
  required String nameEn,
}) {
  return {
    'id': '11111111-1111-1111-1111-111111111111',
    'slug': slug,
    'nameEn': nameEn,
    'nameAr': 'أبود',
    'summaryEn': 'Cultural heart of Bali',
    'summaryAr': null,
    'descriptionEn': null,
    'descriptionAr': null,
    'countryCode': 'ID',
    'tags': const <String>['culture'],
    'status': 'published',
  };
}

Map<String, dynamic> _place({
  required String id,
  required String slug,
  required String nameEn,
  required String category,
  String? shortDescriptionEn,
  String? shortDescriptionAr,
}) {
  return {
    'id': id,
    'slug': slug,
    'nameEn': nameEn,
    'nameAr': nameEn,
    'category': category,
    'shortDescriptionEn': shortDescriptionEn,
    'shortDescriptionAr': shortDescriptionAr,
    'status': 'published',
  };
}

void main() {
  test('PlaceListItem parses fields and prefers English short description', () {
    final page = PlaceListPage.fromJson({
      'items': [
        _place(
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          slug: 'tirta-empul',
          nameEn: 'Tirta Empul',
          category: 'cultural_site',
          shortDescriptionEn: 'Holy spring temple',
        ),
      ],
      'total': 1,
      'limit': 20,
      'offset': 0,
    });

    expect(page.items, hasLength(1));
    expect(page.items.first.nameEn, 'Tirta Empul');
    expect(page.items.first.categoryLabel, 'cultural site');
    expect(page.items.first.availableShortDescription, 'Holy spring temple');
    expect(page.hasMore, isFalse);
  });

  testWidgets('Places request is scoped to destination slug with limit/offset',
      (tester) async {
    Uri? placesUri;
    final mock = MockClient((request) async {
      if (request.url.path == '/v1/destinations/ubud') {
        return _jsonOk(_detailPayload(slug: 'ubud', nameEn: 'Ubud'));
      }
      expect(request.url.path, '/v1/catalog/places');
      placesUri = request.url;
      return _jsonOk({
        'items': [],
        'total': 0,
        'limit': 10,
        'offset': 0,
      });
    });

    await tester.pumpWidget(
      _wrap(
        DestinationOverviewScreen(
          slug: 'ubud',
          apiClient: _client(mock),
          placesPageSize: 10,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(placesUri, isNotNull);
    expect(placesUri!.queryParameters['destinationSlug'], 'ubud');
    expect(placesUri!.queryParameters['limit'], '10');
    expect(placesUri!.queryParameters['offset'], '0');
    expect(find.byKey(const Key('destination-overview-ubud')), findsOneWidget);
    expect(find.byKey(const Key('destination-places-empty')), findsOneWidget);
  });

  testWidgets('Places render name, category, and short description',
      (tester) async {
    final mock = MockClient((request) async {
      if (request.url.path.startsWith('/v1/destinations/')) {
        return _jsonOk(_detailPayload(slug: 'ubud', nameEn: 'Ubud'));
      }
      return _jsonOk({
        'items': [
          _place(
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            slug: 'tirta-empul',
            nameEn: 'Tirta Empul',
            category: 'cultural_site',
            shortDescriptionEn: 'Holy spring temple',
          ),
          _place(
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            slug: 'warung-babi-guling',
            nameEn: 'Warung Babi Guling',
            category: 'restaurant',
          ),
        ],
        'total': 2,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(
      _wrap(
        DestinationOverviewScreen(
          slug: 'ubud',
          apiClient: _client(mock),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('destination-overview-name')), findsOneWidget);
    expect(find.text('Ubud'), findsWidgets);

    expect(find.byKey(const Key('destination-place-tirta-empul')), findsOneWidget);
    expect(find.text('Tirta Empul'), findsOneWidget);
    expect(find.text('cultural site'), findsOneWidget);
    expect(find.text('Holy spring temple'), findsOneWidget);

    expect(
      find.byKey(const Key('destination-place-warung-babi-guling')),
      findsOneWidget,
    );
    expect(find.text('Warung Babi Guling'), findsOneWidget);
    expect(find.text('restaurant'), findsOneWidget);
    expect(
      find.byKey(const Key('destination-place-short-warung-babi-guling')),
      findsNothing,
    );
  });

  testWidgets('empty Places keeps overview visible', (tester) async {
    final mock = MockClient((request) async {
      if (request.url.path.startsWith('/v1/destinations/')) {
        return _jsonOk(_detailPayload(slug: 'ubud', nameEn: 'Ubud'));
      }
      return _jsonOk({
        'items': [],
        'total': 0,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(
      _wrap(
        DestinationOverviewScreen(
          slug: 'ubud',
          apiClient: _client(mock),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('destination-overview-ubud')), findsOneWidget);
    expect(find.text('Cultural heart of Bali'), findsOneWidget);
    expect(find.byKey(const Key('destination-places-heading')), findsOneWidget);
    expect(find.byKey(const Key('destination-places-empty')), findsOneWidget);
    expect(
      find.text('No published places are listed for this destination yet.'),
      findsOneWidget,
    );
  });

  testWidgets('first-page Places failure keeps overview and Retry reloads',
      (tester) async {
    var placesCalls = 0;
    final mock = MockClient((request) async {
      if (request.url.path.startsWith('/v1/destinations/')) {
        return _jsonOk(_detailPayload(slug: 'ubud', nameEn: 'Ubud'));
      }
      placesCalls += 1;
      if (placesCalls == 1) {
        return http.Response('boom', 500);
      }
      return _jsonOk({
        'items': [
          _place(
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            slug: 'tirta-empul',
            nameEn: 'Tirta Empul',
            category: 'cultural_site',
            shortDescriptionEn: 'Holy spring temple',
          ),
        ],
        'total': 1,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(
      _wrap(
        DestinationOverviewScreen(
          slug: 'ubud',
          apiClient: _client(mock),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('destination-overview-ubud')), findsOneWidget);
    expect(find.text('Cultural heart of Bali'), findsOneWidget);
    expect(find.byKey(const Key('destination-places-failure')), findsOneWidget);
    expect(find.byKey(const Key('destination-places-retry')), findsOneWidget);

    await tester.tap(find.byKey(const Key('destination-places-retry')));
    await tester.pumpAndSettle();

    expect(find.text('Tirta Empul'), findsOneWidget);
    expect(placesCalls, 2);
  });

  testWidgets('Load more appends next page and blocks duplicate in-flight requests',
      (tester) async {
    final offsets = <String>[];
    final page2Gate = Completer<void>();
    var page2Started = 0;

    final mock = MockClient((request) async {
      if (request.url.path.startsWith('/v1/destinations/')) {
        return _jsonOk(_detailPayload(slug: 'ubud', nameEn: 'Ubud'));
      }
      final offset = request.url.queryParameters['offset'] ?? '0';
      offsets.add(offset);
      if (offset == '0') {
        return _jsonOk({
          'items': [
            _place(
              id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              slug: 'place-a',
              nameEn: 'Place A',
              category: 'restaurant',
            ),
          ],
          'total': 2,
          'limit': 1,
          'offset': 0,
        });
      }
      page2Started += 1;
      await page2Gate.future;
      return _jsonOk({
        'items': [
          _place(
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            slug: 'place-b',
            nameEn: 'Place B',
            category: 'cafe',
          ),
        ],
        'total': 2,
        'limit': 1,
        'offset': 1,
      });
    });

    await tester.pumpWidget(
      _wrap(
        DestinationOverviewScreen(
          slug: 'ubud',
          apiClient: _client(mock),
          placesPageSize: 1,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Place A'), findsOneWidget);
    expect(find.byKey(const Key('destination-places-load-more')), findsOneWidget);

    await tester.tap(find.byKey(const Key('destination-places-load-more')));
    await tester.pump();

    // While page 2 is in flight, Load more is replaced by a spinner (no second request).
    expect(page2Started, 1);
    expect(find.byKey(const Key('destination-places-loading-more')), findsOneWidget);
    expect(find.byKey(const Key('destination-places-load-more')), findsNothing);
    expect(find.text('Place A'), findsOneWidget);

    page2Gate.complete();
    await tester.pumpAndSettle();

    expect(find.text('Place A'), findsOneWidget);
    expect(find.text('Place B'), findsOneWidget);
    expect(find.byKey(const Key('destination-places-load-more')), findsNothing);
    expect(page2Started, 1);
    expect(offsets, ['0', '1']);
  });

  testWidgets('later page failure keeps rows and Retry requests same offset',
      (tester) async {
    final offsets = <String>[];
    var page2Attempts = 0;

    final mock = MockClient((request) async {
      if (request.url.path.startsWith('/v1/destinations/')) {
        return _jsonOk(_detailPayload(slug: 'ubud', nameEn: 'Ubud'));
      }
      final offset = request.url.queryParameters['offset'] ?? '0';
      offsets.add(offset);
      if (offset == '0') {
        return _jsonOk({
          'items': [
            _place(
              id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              slug: 'place-a',
              nameEn: 'Place A',
              category: 'restaurant',
              shortDescriptionEn: 'First page place',
            ),
          ],
          'total': 2,
          'limit': 1,
          'offset': 0,
        });
      }
      page2Attempts += 1;
      if (page2Attempts == 1) {
        return http.Response('boom', 500);
      }
      return _jsonOk({
        'items': [
          _place(
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            slug: 'place-b',
            nameEn: 'Place B',
            category: 'cafe',
          ),
        ],
        'total': 2,
        'limit': 1,
        'offset': 1,
      });
    });

    await tester.pumpWidget(
      _wrap(
        DestinationOverviewScreen(
          slug: 'ubud',
          apiClient: _client(mock),
          placesPageSize: 1,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('destination-places-load-more')));
    await tester.pumpAndSettle();

    expect(find.text('Place A'), findsOneWidget);
    expect(find.text('First page place'), findsOneWidget);
    expect(
      find.byKey(const Key('destination-places-load-more-failure')),
      findsOneWidget,
    );
    expect(
      find.byKey(const Key('destination-places-load-more-retry')),
      findsOneWidget,
    );

    await tester.tap(find.byKey(const Key('destination-places-load-more-retry')));
    await tester.pumpAndSettle();

    expect(find.text('Place A'), findsOneWidget);
    expect(find.text('Place B'), findsOneWidget);
    expect(page2Attempts, 2);
    expect(offsets, ['0', '1', '1']);
  });

  testWidgets('place short copy keeps English and directs Arabic fallback',
      (tester) async {
    final mock = MockClient((request) async {
      if (request.url.path.startsWith('/v1/destinations/')) {
        return _jsonOk(_detailPayload(slug: 'ubud', nameEn: 'Ubud'));
      }
      return _jsonOk({
        'items': [
          _place(
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            slug: 'english-place',
            nameEn: 'English Place',
            category: 'cultural_site',
            shortDescriptionEn: 'English short',
            shortDescriptionAr: 'وصف لا يُعرض',
          ),
          _place(
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            slug: 'arabic-place',
            nameEn: 'Arabic Place',
            category: 'restaurant',
            shortDescriptionEn: '  ',
            shortDescriptionAr: 'وصف عربي',
          ),
        ],
        'total': 2,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(
      _wrap(
        DestinationOverviewScreen(
          slug: 'ubud',
          apiClient: _client(mock),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('English short'), findsOneWidget);
    expect(find.text('وصف لا يُعرض'), findsNothing);
    expect(find.text('وصف عربي'), findsOneWidget);
    expect(
      tester.widget<Text>(find.text('English short')).textDirection,
      TextDirection.ltr,
    );
    expect(
      tester.widget<Text>(find.text('وصف عربي')).textDirection,
      TextDirection.rtl,
    );
    expect(
      tester.widget<Text>(find.text('English Place')).textDirection,
      isNull,
    );
    expect(
      Directionality.of(tester.element(find.byType(Scaffold))),
      TextDirection.ltr,
    );
    expect(tester.takeException(), isNull);
  });
}

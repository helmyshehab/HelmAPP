import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/auth/traveler_session.dart';
import 'package:helm_mobile/build/trip_gen/trip_answers.dart';
import 'package:helm_mobile/discover/destination_detail.dart';
import 'package:helm_mobile/main.dart';
import 'package:helm_mobile/tabs/discover_tab.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Widget _wrap(Widget child) {
  return MaterialApp(home: Scaffold(body: child));
}

HelmApiClient _client(MockClient mock) =>
    HelmApiClient(
      baseUrl: 'https://api.test',
      httpClient: MockClient((request) async {
        if (request.url.path == '/v1/geo/countries') {
          return _jsonOk({
            'items': [{'code': 'ID', 'nameEn': 'Indonesia'}],
            'total': 1,
          });
        }
        final forwarded = http.Request(request.method, request.url)
          ..headers.addAll(request.headers)
          ..bodyBytes = request.bodyBytes;
        return http.Response.fromStream(await mock.send(forwarded));
      }),
    );

Future<void> _openIndonesia(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('discover-country-ID')));
  await tester.pumpAndSettle();
}

/// UTF-8 JSON body — charset header selects utf8 (http 1.2.2 has no encoding:).
http.Response _jsonOk(Object body) => http.Response(
      jsonEncode(body),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

Map<String, dynamic> _listItem({
  required String slug,
  required String nameEn,
  String? summaryEn,
}) {
  return {
    'id': '11111111-1111-1111-1111-111111111111',
    'slug': slug,
    'nameEn': nameEn,
    'nameAr': 'أبود',
    'summaryEn': summaryEn,
    'summaryAr': null,
    'countryCode': 'ID',
    'status': 'published',
  };
}

Map<String, dynamic> _detailPayload({
  required String slug,
  required String nameEn,
  String? summaryEn,
  String? descriptionEn,
  List<String> tags = const [],
}) {
  return {
    'id': '11111111-1111-1111-1111-111111111111',
    'slug': slug,
    'nameEn': nameEn,
    'nameAr': 'أبود',
    'summaryEn': summaryEn,
    'summaryAr': null,
    'descriptionEn': descriptionEn,
    'descriptionAr': null,
    'countryCode': 'ID',
    'tags': tags,
    'status': 'published',
  };
}

void main() {
  test('DestinationDetail parses overview fields and dedupes copy', () {
    final detail = DestinationDetail.fromJson(
      _detailPayload(
        slug: 'ubud',
        nameEn: 'Ubud',
        summaryEn: 'Cultural heart',
        descriptionEn: 'Cultural heart',
        tags: const ['culture', 'rice_terrace'],
      ),
    );

    expect(detail.nameEn, 'Ubud');
    expect(detail.overviewCopy.summary, 'Cultural heart');
    expect(detail.overviewCopy.description, isNull);
    expect(detail.tags, ['culture', 'rice_terrace']);
    expect(isDestinationNotFoundError(Exception('/v1/destinations/x failed: 404')),
        isTrue);
    expect(isDestinationNotFoundError(Exception('/v1/destinations/x failed: 500')),
        isFalse);
  });

  http.Response emptyPlaces() => _jsonOk({
        'items': [],
        'total': 0,
        'limit': 20,
        'offset': 0,
      });

  testWidgets('Indonesia to Ubud resumes Build after sign-in',
      (tester) async {
    final auth = FakeTravelerAuth();
    addTearDown(auth.dispose);
    final client = _client(MockClient((request) async {
      switch (request.url.path) {
        case '/v1/destinations':
          return _jsonOk({
            'items': [_listItem(slug: 'ubud', nameEn: 'Ubud')],
            'total': 1,
            'limit': 20,
            'offset': 0,
          });
        case '/v1/destinations/ubud':
          return _jsonOk(_detailPayload(slug: 'ubud', nameEn: 'Ubud'));
        case '/v1/trips/drafts':
          return _jsonOk({'items': []});
        default:
          if (request.url.path.endsWith('/bootstrap')) return _jsonOk({});
          return emptyPlaces();
      }
    }));

    await tester.pumpWidget(
        MaterialApp(home: HelmShell(auth: auth, apiClient: client)));
    await tester.pumpAndSettle();
    await _openIndonesia(tester);
    await tester.tap(find.byKey(const Key('discover-item-ubud')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Build my trip'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('build-signed-out')), findsOneWidget);

    auth.setSession(
        const TravelerSession(userId: 'traveler', accessToken: 'token'));
    await tester.pumpAndSettle();
    final ubud = tester.widget<RadioListTile<TripDestinationChoice>>(
      find.byKey(const Key('trip-destination-ubud')),
    );
    expect(ubud.groupValue, TripDestinationChoice.ubud);

    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('trip-destination-ubud')), findsNothing);
    expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        1);
  });

  testWidgets('tapping a destination row opens overview and loads by slug',
      (tester) async {
    final gate = Completer<void>();
    final mock = MockClient((request) async {
      if (request.url.path == '/v1/destinations') {
        return _jsonOk({
          'items': [
            _listItem(slug: 'ubud', nameEn: 'Ubud', summaryEn: 'Cultural heart'),
          ],
          'total': 1,
          'limit': 20,
          'offset': 0,
        });
      }
      if (request.url.path == '/v1/catalog/places') {
        return emptyPlaces();
      }
      expect(request.url.path, '/v1/destinations/ubud');
      await gate.future;
      return _jsonOk(
        _detailPayload(
          slug: 'ubud',
          nameEn: 'Ubud',
          summaryEn: 'Cultural heart of Bali',
          descriptionEn: 'Temples, rice terraces, and crafts.',
          tags: const ['culture'],
        ),
      );
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await _openIndonesia(tester);
    await tester.tap(find.byKey(const Key('discover-item-ubud')));
    // Flush the tap, then advance the route transition so overview builds.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byKey(const Key('destination-overview-loading')), findsOneWidget);

    gate.complete();
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('destination-overview-ubud')), findsOneWidget);
    expect(find.byKey(const Key('destination-overview-name')), findsOneWidget);
    expect(find.text('Ubud'), findsWidgets);
    expect(find.text('Cultural heart of Bali'), findsOneWidget);
    expect(find.text('Temples, rice terraces, and crafts.'), findsOneWidget);
    expect(find.text('culture'), findsOneWidget);
  });

  testWidgets('overview shows not found when getDestination returns 404',
      (tester) async {
    final mock = MockClient((request) async {
      if (request.url.path == '/v1/destinations') {
        return _jsonOk({
          'items': [_listItem(slug: 'missing', nameEn: 'Missing')],
          'total': 1,
          'limit': 20,
          'offset': 0,
        });
      }
      if (request.url.path == '/v1/catalog/places') {
        return emptyPlaces();
      }
      return http.Response('{"error":"not found"}', 404);
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await _openIndonesia(tester);
    await tester.tap(find.byKey(const Key('discover-item-missing')));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const Key('destination-overview-not-found')),
      findsOneWidget,
    );
    expect(find.text('Destination not found'), findsOneWidget);
  });

  testWidgets('overview failure shows Retry and reloads on tap', (tester) async {
    var detailCalls = 0;
    final mock = MockClient((request) async {
      if (request.url.path == '/v1/destinations') {
        return _jsonOk({
          'items': [
            _listItem(slug: 'ubud', nameEn: 'Ubud', summaryEn: 'Cultural heart'),
          ],
          'total': 1,
          'limit': 20,
          'offset': 0,
        });
      }
      if (request.url.path == '/v1/catalog/places') {
        return emptyPlaces();
      }
      detailCalls += 1;
      if (detailCalls == 1) {
        return http.Response('boom', 500);
      }
      return _jsonOk(
        _detailPayload(
          slug: 'ubud',
          nameEn: 'Ubud',
          summaryEn: 'Cultural heart of Bali',
        ),
      );
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await _openIndonesia(tester);
    await tester.tap(find.byKey(const Key('discover-item-ubud')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('destination-overview-failure')), findsOneWidget);
    expect(find.byKey(const Key('destination-overview-retry')), findsOneWidget);

    await tester.tap(find.byKey(const Key('destination-overview-retry')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('destination-overview-ubud')), findsOneWidget);
    expect(find.text('Cultural heart of Bali'), findsOneWidget);
    expect(detailCalls, 2);
  });

  testWidgets('back from overview returns to Discover list', (tester) async {
    final mock = MockClient((request) async {
      if (request.url.path == '/v1/destinations') {
        return _jsonOk({
          'items': [
            _listItem(slug: 'ubud', nameEn: 'Ubud', summaryEn: 'Cultural heart'),
          ],
          'total': 1,
          'limit': 20,
          'offset': 0,
        });
      }
      if (request.url.path == '/v1/catalog/places') {
        return emptyPlaces();
      }
      return _jsonOk(
        _detailPayload(
          slug: 'ubud',
          nameEn: 'Ubud',
          summaryEn: 'Cultural heart of Bali',
        ),
      );
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    await _openIndonesia(tester);
    await tester.tap(find.byKey(const Key('discover-item-ubud')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('destination-overview-ubud')), findsOneWidget);

    await tester.tap(find.byKey(const Key('destination-overview-back')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-item-ubud')), findsOneWidget);
    expect(find.byKey(const Key('destination-overview-ubud')), findsNothing);

    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('discover-list')), findsOneWidget);
    expect(find.byKey(const Key('discover-country-ID')), findsOneWidget);
  });
}

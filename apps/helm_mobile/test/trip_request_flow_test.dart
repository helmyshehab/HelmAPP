import 'dart:convert';

import 'published_ubud_fixture.dart';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/auth/traveler_session.dart';
import 'package:helm_mobile/build/trip_gen/trip_answers.dart';
import 'package:helm_mobile/build/trip_gen/trip_planner.dart';
import 'package:helm_mobile/build/trip_gen/trip_preview_screen.dart';
import 'package:helm_mobile/tabs/trips_tab.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const _draftId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const _requestId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const _userId = 'user-a';

http.Response _json(Object body, {int status = 200}) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

Map<String, dynamic> _requestJson({
  String status = 'submitted',
  String draftId = _draftId,
}) =>
    {
      'id': _requestId,
      'draftId': draftId,
      'title': 'Ubud trip · 2 nights',
      'destinationSlug': 'ubud',
      'status': status,
      'constraints': {
        'kind': 'ubud_trip_preview',
        'version': 1,
        'answers': {
          'budgetEgp': 85000,
          'destination': 'ubud',
          'travelerCount': 2,
          'lifestyle': 'culture',
          'nights': 2,
          'amenities': <String>[],
        },
        'selections': {
          'flightId': 'economy-example',
          'hotelSlug': 'ubud-village-hotel',
          'includedActivitySlugs': ['ubud-sacred-monkey-forest'],
        },
        'itinerary': {
          'days': [
            {
              'dayNumber': 1,
              'stopSlugs': ['ubud-sacred-monkey-forest'],
            },
            {'dayNumber': 2, 'stopSlugs': <String>[]},
          ],
        },
      },
      'createdAt': '2026-01-01T00:00:00.000Z',
      'updatedAt': '2026-01-01T00:00:00.000Z',
    };

Finder _previewScrollable() => find
    .descendant(
      of: find.byKey(const Key('trip-preview')),
      matching: find.byType(Scrollable),
    )
    .first;

Future<void> _tapPreviewKey(WidgetTester tester, Key key) async {
  await tester.scrollUntilVisible(
    find.byKey(key),
    200,
    scrollable: _previewScrollable(),
  );
  await tester.tap(find.byKey(key));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'saved draft can request a trip and then shows status',
    (tester) async {
      final calls = <String>[];
      final api = HelmApiClient(
        baseUrl: 'https://api.test',
        httpClient: MockClient((request) async {
          final path = request.url.path;
          calls.add('${request.method} $path');
          if (path == '/v1/catalog/places') return publishedUbudFixture();
          if (path.endsWith('/bootstrap')) {
            return _json({
              'userId': _userId,
              'accountStatus': 'active',
              'preferredLocale': 'en',
              'preferredCurrency': 'EGP',
              'accountCreated': false,
              'profileCreated': false,
            });
          }
          if (path == '/v1/trips/requests' && request.method == 'GET') {
            return _json({'items': <Map<String, dynamic>>[]});
          }
          if (path == '/v1/trips/requests' && request.method == 'POST') {
            final body = jsonDecode(request.body) as Map<String, dynamic>;
            expect(body['draftId'], _draftId);
            return _json(_requestJson(), status: 201);
          }
          if (path == '/v1/trips/drafts' && request.method == 'POST') {
            final body = jsonDecode(request.body) as Map<String, dynamic>;
            return _json({
              'id': _draftId,
              'title': body['title'],
              'constraints': body['constraints'],
              'status': 'draft',
              'createdAt': '2026-01-01T00:00:00.000Z',
              'updatedAt': '2026-01-01T00:00:00.000Z',
            }, status: 201);
          }
          return http.Response('unexpected ${request.method} $path', 500);
        }),
      );
      final auth = FakeTravelerAuth(
        initial: const TravelerSession(userId: _userId, accessToken: 'token-a'),
      );
      await tester.pumpWidget(MaterialApp(
        home: TripPreviewScreen(
          plan: planDemoTrip(const TripAnswers(
            budgetEgp: 85000,
            travelerCount: 2,
            nights: 2,
          )),
          auth: auth,
          apiClient: api,
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('trip-preview-request')), findsNothing);
      await _tapPreviewKey(tester, const Key('trip-preview-save'));
      expect(find.byKey(const Key('trip-preview-request')), findsOneWidget);

      await _tapPreviewKey(tester, const Key('trip-preview-request'));
      expect(find.byKey(const Key('trip-preview-request')), findsNothing);
      expect(
        find.byKey(const Key('trip-preview-request-status')),
        findsOneWidget,
      );
      expect(find.textContaining('Submitted'), findsOneWidget);
      expect(
        calls.where((call) => call.contains('/v1/trips/requests')),
        ['POST /v1/trips/requests'],
      );

      await tester.pumpWidget(const SizedBox());
      auth.dispose();
    },
  );

  testWidgets(
    'existing request status loads and hides the request button',
    (tester) async {
      final api = HelmApiClient(
        baseUrl: 'https://api.test',
        httpClient: MockClient((request) async {
          final path = request.url.path;
          if (path == '/v1/catalog/places') return publishedUbudFixture();
          if (path == '/v1/trips/requests' && request.method == 'GET') {
            return _json({
              'items': [
                _requestJson(status: 'under_review'),
              ],
            });
          }
          return http.Response('unexpected ${request.method} $path', 500);
        }),
      );
      final auth = FakeTravelerAuth(
        initial: const TravelerSession(userId: _userId, accessToken: 'token-a'),
      );
      await tester.pumpWidget(MaterialApp(
        home: TripPreviewScreen(
          plan: planDemoTrip(const TripAnswers(
            budgetEgp: 85000,
            travelerCount: 2,
            nights: 2,
          )),
          auth: auth,
          apiClient: api,
          draftId: _draftId,
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('trip-preview-request')), findsNothing);
      expect(
        find.byKey(const Key('trip-preview-request-status')),
        findsOneWidget,
      );
      expect(find.textContaining('Under review'), findsOneWidget);

      await tester.pumpWidget(const SizedBox());
      auth.dispose();
    },
  );

  testWidgets('Trips tab shows submitted itinerary and status', (tester) async {
    final api = HelmApiClient(
      baseUrl: 'https://api.test',
      httpClient: MockClient((request) async {
        final path = request.url.path;
        if (path == '/v1/trips/demo-bookings') {
          return _json({'items': <Map<String, dynamic>>[]});
        }
        if (path == '/v1/trips/requests') {
          return _json({'items': [_requestJson()]});
        }
        return http.Response('unexpected ${request.method} $path', 500);
      }),
    );
    final auth = FakeTravelerAuth(
      initial: const TravelerSession(userId: _userId, accessToken: 'token-a'),
    );
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: TripsTab(auth: auth, apiClient: api),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('trips-request-$_requestId')), findsOneWidget);
    expect(find.textContaining('Submitted'), findsWidgets);

    await tester.tap(find.byKey(const Key('trips-request-$_requestId')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('trips-request-status')), findsOneWidget);
    expect(find.textContaining('Submitted'), findsWidgets);
    expect(find.textContaining('ubud-village-hotel'), findsOneWidget);

    await tester.pumpWidget(const SizedBox());
    auth.dispose();
  });
}

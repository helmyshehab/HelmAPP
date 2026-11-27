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
import 'package:helm_mobile/tabs/build_tab.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response _json(Object body, {int status = 200}) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

String _estimateTotal(WidgetTester tester) {
  return tester
      .widget<Text>(find.byKey(const Key('trip-preview-estimate-total')))
      .data!;
}

Finder _previewScrollable() => find
    .descendant(
      of: find.byKey(const Key('trip-preview')),
      matching: find.byType(Scrollable),
    )
    .first;

void main() {
  testWidgets('preview excludes unpublished stops and lodging', (tester) async {
    final api = HelmApiClient(
      baseUrl: 'https://api.test',
      httpClient: MockClient((request) async {
        expect(request.url.path, '/v1/catalog/places');
        expect(request.url.queryParameters['destinationSlug'], 'ubud');
        return publishedUbudFixture(slugs: {
          'ubud-village-hotel',
          'ubud-sacred-monkey-forest',
        });
      }),
    );
    final auth = FakeTravelerAuth(
      initial: const TravelerSession(userId: 'user-a', accessToken: 'token-a'),
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
        initialHotelSlug: 'ubud-swasti-eco-cottages',
      ),
    ));
    await tester.pumpAndSettle();
    expect(
        find.byKey(const Key('trip-hotel-ubud-village-hotel')), findsOneWidget);
    expect(find.byKey(const Key('trip-hotel-ubud-swasti-eco-cottages')),
        findsNothing);
    expect(find.byKey(const Key('trip-stop-ubud-sacred-monkey-forest')),
        findsOneWidget);
    expect(find.byKey(const Key('trip-stop-ubud-balinese-cooking-class')),
        findsNothing);
    final coverage = find.byKey(const Key('trip-preview-coverage'));
    expect(coverage, findsOneWidget);
    expect(find.descendant(of: coverage, matching: find.text('Trip Mode')),
        findsOneWidget);
    expect(find.text('• Domestic flights'), findsNothing);
    expect(find.byKey(const Key('trip-preview-day-1-food')), findsOneWidget);
    expect(find.byKey(const Key('trip-preview-day-2-food')), findsOneWidget);
    final picker = find.byKey(const Key('trip-day-add-activity-1'));
    await tester.ensureVisible(picker);
    await tester.tap(picker);
    await tester.pumpAndSettle();
    expect(find.text('No additional published activities are available.'),
        findsOneWidget);
  });

  testWidgets(
      'review saves before quoting, retains the draft on failure, and hides stale quotes',
      (tester) async {
    const draftId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    final requests = <String>[];
    var quoteAttempts = 0;
    Object? savedConstraints;
    final now = DateTime.now().toUtc();
    final api = HelmApiClient(
      baseUrl: 'https://api.test',
      httpClient: MockClient((request) async {
        if (request.url.path == '/v1/catalog/places') {
          return publishedUbudFixture();
        }
        final path = request.url.path;
        requests.add('${request.method} $path');
        expect(request.headers['authorization'], 'Bearer token-a');
        if (path.endsWith('/bootstrap')) {
          return _json({
            'userId': 'user-a',
            'accountStatus': 'active',
            'preferredLocale': 'en',
            'preferredCurrency': 'EGP',
            'accountCreated': false,
            'profileCreated': false,
          });
        }
        if (path.endsWith('/quote')) {
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(body['expectedConstraints'], savedConstraints);
          if (quoteAttempts++ == 0) return _json({}, status: 503);
          return _json({
            'id': 'quote-id',
            'draftId': draftId,
            'currency': 'EGP',
            'source': 'demo',
            'rateVersion': 'ubud-demo-v1',
            'travelerCount': 2,
            'nights': 2,
            'flightTotalEgp': 37000,
            'lodgingTotalEgp': 19600,
            'activitiesTotalEgp': 4400,
            'totalEgp': 61000,
            'createdAt': now.toIso8601String(),
            'expiresAt': now.add(const Duration(minutes: 30)).toIso8601String(),
          }, status: 201);
        }
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        savedConstraints = body['constraints'];
        return _json({
          'id': draftId,
          'title': body['title'],
          'constraints': body['constraints'],
          'status': 'draft',
          'createdAt': now.toIso8601String(),
          'updatedAt': now.toIso8601String(),
        }, status: request.method == 'POST' ? 201 : 200);
      }),
    );
    final auth = FakeTravelerAuth(
      initial: const TravelerSession(userId: 'user-a', accessToken: 'token-a'),
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

    Future<void> tapVisible(Finder finder) async {
      await tester.ensureVisible(finder);
      await tester.tap(finder);
      await tester.pumpAndSettle();
    }

    await tapVisible(find.text('Review your trip'));
    final requestQuote = find.byKey(const Key('trip-review-request-quote'));
    await tapVisible(requestQuote);
    expect(find.text('Could not get a quote. Your draft is saved. Try again.'),
        findsOneWidget);
    await tapVisible(requestQuote);
    expect(requests.where((request) => !request.endsWith('/bootstrap')), [
      'POST /v1/trips/drafts',
      'POST /v1/trips/drafts/$draftId/quote',
      'PATCH /v1/trips/drafts/$draftId',
      'POST /v1/trips/drafts/$draftId/quote',
    ]);
    final total = find.byKey(const Key('trip-review-server-quote-total'));
    expect(tester.widget<Text>(total).data, '61000 EGP');
    expect(find.textContaining('Expires '), findsOneWidget);
    expect(_estimateTotal(tester), '60500 EGP');

    await tapVisible(find.byKey(const Key('trip-flight-flexible-example')));
    expect(total, findsNothing);

    await tester.pumpWidget(const SizedBox());
    auth.dispose();
  });

  testWidgets(
    'preview estimate updates when flight hotel and activity change',
    (tester) async {
      final mock = MockClient((request) async {
        if (request.url.path == '/v1/catalog/places') {
          return publishedUbudFixture();
        }
        if (request.url.path.endsWith('/bootstrap')) {
          return _json({
            'userId': 'user-a',
            'accountStatus': 'active',
            'preferredLocale': 'en',
            'preferredCurrency': 'USD',
            'accountCreated': false,
            'profileCreated': false,
          });
        }
        if (request.url.path.endsWith('/drafts') && request.method == 'GET') {
          return _json({'items': <Map<String, dynamic>>[]});
        }
        return http.Response('unexpected', 500);
      });

      final auth = FakeTravelerAuth(
        initial:
            const TravelerSession(userId: 'user-a', accessToken: 'token-a'),
      );
      final client =
          HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BuildTab(auth: auth, apiClient: client),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('build-my-trip')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('trip-budget')), '85000');
      await tester.enterText(find.byKey(const Key('trip-travelers')), '2');
      await tester.enterText(find.byKey(const Key('trip-nights')), '2');
      await tester.tap(find.byKey(const Key('trip-preview-submit')));
      await tester.pumpAndSettle();

      expect(
          find.byKey(const Key('trip-preview-estimate-total')), findsOneWidget);
      expect(_estimateTotal(tester), '60500 EGP');

      String optionPrice(String key) {
        final tile = tester.widget<RadioListTile<String>>(find.byKey(Key(key)));
        return (tile.subtitle! as Text).data!;
      }

      expect(optionPrice('trip-flight-flexible-example'),
          contains('53000 EGP for the group · +16000 EGP to trip total'));
      expect(optionPrice('trip-hotel-ubud-swasti-eco-cottages'),
          contains('9000 EGP for the stay · −10600 EGP to trip total'));

      Future<void> tapPreviewKey(Key key) async {
        await tester.scrollUntilVisible(
          find.byKey(key),
          200,
          scrollable: _previewScrollable(),
        );
        await tester.tap(find.byKey(key));
        await tester.pumpAndSettle();
      }

      await tapPreviewKey(const Key('trip-flight-flexible-example'));
      expect(_estimateTotal(tester), '76500 EGP');
      expect(optionPrice('trip-flight-economy-example'),
          contains('37000 EGP for the group · −16000 EGP to trip total'));

      await tapPreviewKey(const Key('trip-hotel-ubud-swasti-eco-cottages'));
      // Flexible flight + base lodging for 2 nights.
      expect(_estimateTotal(tester), '65900 EGP');
      expect(optionPrice('trip-hotel-ubud-komaneka-bisma'),
          contains('19600 EGP for the stay · +10600 EGP to trip total'));
      expect(optionPrice('trip-hotel-ubud-village-hotel'),
          contains('9000 EGP for the stay · No change to trip total'));

      const activitySlug = 'ubud-sacred-monkey-forest';
      const detailsKey = Key('trip-activity-details-$activitySlug');
      await tapPreviewKey(detailsKey);
      expect(find.text('Padangtegal, Ubud'), findsOneWidget);
      expect(find.textContaining('long-tailed macaques'), findsOneWidget);
      expect(find.textContaining('Confirm the duration, meeting point'),
          findsOneWidget);
      expect(_estimateTotal(tester), '65900 EGP');
      await tapPreviewKey(detailsKey);
      await tapPreviewKey(Key('trip-activity-remove-$activitySlug'));
      expect(_estimateTotal(tester), '65200 EGP');

      await tapPreviewKey(Key('trip-activity-add-$activitySlug'));
      expect(_estimateTotal(tester), '65900 EGP');

      await tester.scrollUntilVisible(
        find.byKey(const Key('trip-preview-estimate-total')),
        -300,
        scrollable: _previewScrollable(),
      );
      expect(find.textContaining('Demo price estimate'), findsOneWidget);
      expect(find.textContaining('Excluded from this demo estimate'),
          findsOneWidget);

      auth.dispose();
    },
  );
}

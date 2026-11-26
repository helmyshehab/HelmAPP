import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/auth/traveler_session.dart';
import 'package:helm_mobile/build/trip_gen/trip_answers.dart';
import 'package:helm_mobile/build/trip_gen/trip_demo_checkout_screen.dart';
import 'package:helm_mobile/build/trip_gen/trip_planner.dart';
import 'package:helm_mobile/build/trip_gen/trip_preview_draft.dart';
import 'package:helm_mobile/main.dart' show HelmShell;
import 'package:helm_mobile/tabs/build_tab.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const _draftId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const _userId = 'user-a';

Map<String, dynamic> _quoteJson({String id = 'quote-a'}) {
  final now = DateTime.now().toUtc();
  return {
    'id': id,
    'draftId': _draftId,
    'currency': 'EGP',
    'source': 'demo',
    'rateVersion': 'ubud-demo-v1',
    'travelerCount': 3,
    'nights': 2,
    'flightTotalEgp': 79500,
    'lodgingTotalEgp': 9000,
    'activitiesTotalEgp': 6500,
    'totalEgp': 95000,
    'createdAt': now.toIso8601String(),
    'expiresAt': now.add(const Duration(minutes: 30)).toIso8601String(),
  };
}

http.Response _json(Object body, {int status = 200}) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

Map<String, dynamic> _bootstrap() => {
      'userId': _userId,
      'accountStatus': 'active',
      'preferredLocale': 'en',
      'preferredCurrency': 'USD',
      'accountCreated': false,
      'profileCreated': false,
    };

Map<String, dynamic> _draftJson({
  required Map<String, dynamic> constraints,
  String? title,
  String id = _draftId,
}) =>
    {
      'id': id,
      'destinationId': null,
      'title': title ?? 'Ubud trip · 2 nights',
      'constraints': constraints,
      'status': 'draft',
      'createdAt': '2026-01-01T00:00:00.000Z',
      'updatedAt': '2026-01-02T00:00:00.000Z',
    };

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

Future<void> _tapPreviewKey(WidgetTester tester, Key key) async {
  await tester.scrollUntilVisible(
    find.byKey(key),
    200,
    scrollable: _previewScrollable(),
  );
  await tester.tap(find.byKey(key));
  await tester.pumpAndSettle();
}

Future<void> _fillAndOpenPreview(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('build-my-trip')));
  await tester.pumpAndSettle();
  await tester.enterText(find.byKey(const Key('trip-budget')), '85000');
  await tester.enterText(find.byKey(const Key('trip-travelers')), '2');
  await tester.enterText(find.byKey(const Key('trip-nights')), '2');
  await tester.tap(find.byKey(const Key('trip-preview-submit')));
  await tester.pumpAndSettle();
}

TripPreviewPlan _samplePlan() {
  return planDemoTrip(
    const TripAnswers(
      budgetEgp: 85000,
      destination: TripDestinationChoice.ubud,
      travelerCount: 2,
      lifestyle: TripLifestyle.culture,
      nights: 2,
    ),
  );
}

void main() {
  testWidgets(
      'demo booking skips activity confirmation when activities cost nothing',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: TripDemoCheckoutScreen(
        tripLabel: 'Ubud trip',
        quote: TripDraftQuote.fromJson({
          ..._quoteJson(),
          'activitiesTotalEgp': 0,
          'totalEgp': 88500,
        }),
        destinationName: 'Ubud',
        days: _samplePlan().days,
        validateQuote: () async => true,
      ),
    ));
    await tester.tap(find.text('Simulate payment'));
    await tester.pumpAndSettle();
    expect(find.text('0 of 2 services confirmed'), findsOneWidget);
    expect(find.byKey(const Key('trip-demo-confirm-activities')), findsNothing);
  });

  testWidgets(
    'save and reopen restores edited day order, activities, and estimate',
    (tester) async {
      Map<String, dynamic>? storedConstraints;
      var createCalls = 0;
      var listPhase = 0;
      var quoteReadCalls = 0;
      var quoteWrites = 0;
      var quote = _quoteJson();

      final mock = MockClient((request) async {
        if (request.url.path.endsWith('/bootstrap')) {
          return _json(_bootstrap());
        }
        if (request.url.path.endsWith('/drafts/$_draftId/quote')) {
          if (request.method == 'POST') {
            quote = _quoteJson(id: 'quote-${++quoteWrites}');
            return _json(quote, status: 201);
          }
          quoteReadCalls++;
          return _json(
              quoteReadCalls == 1 ? {...quote, 'id': 'other-quote'} : quote);
        }
        if (request.url.path.endsWith('/drafts') && request.method == 'GET') {
          listPhase += 1;
          if (storedConstraints == null) {
            return _json({'items': <Map<String, dynamic>>[]});
          }
          return _json({
            'items': [
              _draftJson(constraints: storedConstraints!),
            ],
          });
        }
        if (request.url.path.endsWith('/drafts') && request.method == 'POST') {
          createCalls += 1;
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          storedConstraints =
              Map<String, dynamic>.from(body['constraints'] as Map);
          expect(body['title'], 'Ubud trip · 2 nights');
          expect(storedConstraints!['kind'], ubudTripPreviewConstraintKind);
          return _json(
            _draftJson(constraints: storedConstraints!),
            status: 201,
          );
        }
        if (request.method == 'PATCH' &&
            request.url.path.endsWith('/drafts/$_draftId')) {
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          storedConstraints = body['constraints'] as Map<String, dynamic>;
          return _json(_draftJson(constraints: storedConstraints!));
        }
        return http.Response('unexpected ${request.method}', 500);
      });

      final auth = FakeTravelerAuth(
        initial: const TravelerSession(userId: _userId, accessToken: 'token-a'),
      );
      final client =
          HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

      await tester.pumpWidget(
        MaterialApp(
          home: HelmShell(auth: auth, apiClient: client),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Trips'));
      await tester.pumpAndSettle();
      expect(find.text('No confirmed trips yet'), findsOneWidget);
      await tester.tap(find.text('Build'));
      await tester.pumpAndSettle();
      await _fillAndOpenPreview(tester);

      expect(_estimateTotal(tester), '60500 EGP');
      await _tapPreviewKey(tester, const Key('trip-flight-flexible-example'));
      await _tapPreviewKey(
        tester,
        const Key('trip-hotel-ubud-swasti-eco-cottages'),
      );
      const activitySlug = 'ubud-sacred-monkey-forest';
      final totalBeforeMove = _estimateTotal(tester);
      await _tapPreviewKey(tester, const Key('trip-stop-move-$activitySlug'));
      expect(
        find.byKey(const Key('trip-stop-move-to-1')),
        findsNothing,
      );
      await tester.tap(find.byKey(const Key('trip-stop-move-to-2')));
      await tester.pumpAndSettle();
      expect(_estimateTotal(tester), totalBeforeMove);
      await _tapPreviewKey(tester, Key('trip-activity-remove-$activitySlug'));
      expect(_estimateTotal(tester), '65200 EGP');

      const addedSlug = 'ubud-ayung-river-rafting';
      const addOnDayTwo = Key('trip-day-add-activity-2');
      final catalogTile =
          find.byKey(const Key('trip-catalog-activity-$addedSlug'));
      expect(find.byKey(const Key('trip-stop-$addedSlug')), findsNothing);
      await _tapPreviewKey(tester, addOnDayTwo);
      final option = tester.widget<ListTile>(catalogTile);
      expect(
          (option.subtitle! as Text).data, contains('Demo 3000 EGP for group'));
      expect(find.byKey(const Key('trip-catalog-activity-$activitySlug')),
          findsNothing);
      await _tapPreviewKey(
          tester, const Key('trip-catalog-activity-$addedSlug'));
      expect(_estimateTotal(tester), '68200 EGP');
      await _tapPreviewKey(tester, addOnDayTwo);
      expect(catalogTile, findsNothing);
      await _tapPreviewKey(tester, addOnDayTwo);
      final moveAddedDown = find.byKey(const Key('trip-stop-down-$addedSlug'));
      expect(tester.widget<IconButton>(moveAddedDown).onPressed, isNull);
      await _tapPreviewKey(tester, const Key('trip-stop-up-$addedSlug'));
      expect(_estimateTotal(tester), '68200 EGP');

      const removedSlug = 'ubud-balinese-cooking-class';
      final removedStop = find.byKey(const Key('trip-stop-$removedSlug'));
      expect(removedStop, findsOneWidget);
      await _tapPreviewKey(
        tester,
        const Key('trip-activity-remove-scheduled-$removedSlug'),
      );
      expect(removedStop, findsNothing);
      expect(_estimateTotal(tester), '65800 EGP');
      await _tapPreviewKey(tester, addOnDayTwo);
      expect(find.byKey(const Key('trip-catalog-activity-$removedSlug')),
          findsOneWidget);
      await _tapPreviewKey(tester, addOnDayTwo);

      await _tapPreviewKey(tester, const Key('trip-preview-edit'));
      await tester.enterText(find.byKey(const Key('trip-budget')), '90000');
      await tester.enterText(find.byKey(const Key('trip-travelers')), '3');
      await tester.tap(find.text('Update preview'));
      await tester.pumpAndSettle();
      final editedTotal = _estimateTotal(tester);
      expect(editedTotal, '94200 EGP');
      expect(removedStop, findsNothing);

      const reviewKey = Key('trip-review');
      await _tapPreviewKey(tester, reviewKey);
      final review = find.byKey(reviewKey);
      Finder reviewText(String text) =>
          find.descendant(of: review, matching: find.text(text));
      expect(reviewText('Ubud · 3 travelers · 2 nights'), findsOneWidget);
      expect(reviewText('Example flexible round-trip · 79500 EGP'),
          findsOneWidget);
      expect(reviewText('Swasti Eco Cottages · 9000 EGP'), findsOneWidget);
      expect(reviewText(editedTotal), findsOneWidget);
      expect(reviewText('Ayung River White-Water Rafting'), findsOneWidget);
      expect(
          reviewText('Sacred Monkey Forest Sanctuary (excluded from estimate)'),
          findsOneWidget);
      expect(reviewText('Balinese Cooking Class & Market Tour'), findsNothing);
      const checkoutKey = Key('trip-demo-checkout');
      expect(tester.widget<FilledButton>(find.byKey(checkoutKey)).onPressed,
          isNull);
      await _tapPreviewKey(tester, const Key('trip-review-request-quote'));
      await _tapPreviewKey(tester, checkoutKey);
      expect(find.text('Demo checkout'), findsOneWidget);
      expect(
        tester
            .widget<Text>(find.byKey(const Key('trip-demo-checkout-total')))
            .data,
        '95000 EGP',
      );
      expect(find.byType(TextField), findsNothing);
      await tester.tap(find.text('Simulate payment'));
      await tester.pumpAndSettle();
      expect(
          find.byKey(const Key('trip-checkout-quote-error')), findsOneWidget);
      expect(find.text('Demo payment complete'), findsNothing);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(tester.widget<FilledButton>(find.byKey(checkoutKey)).onPressed,
          isNull);
      await _tapPreviewKey(tester, const Key('trip-review-request-quote'));
      await _tapPreviewKey(tester, checkoutKey);
      await tester.tap(find.text('Simulate payment'));
      await tester.pumpAndSettle();
      expect(find.text('Demo payment complete'), findsOneWidget);
      expect(quoteReadCalls, 2);
      expect(createCalls, 1);
      final openTripMode =
          find.widgetWithText(FilledButton, 'Preview Trip Mode');
      expect(find.text('0 of 3 services confirmed'), findsOneWidget);
      expect(tester.widget<FilledButton>(openTripMode).onPressed, isNull);

      Future<void> confirmService(String service) async {
        final button = find.byKey(Key('trip-demo-confirm-$service'));
        await tester.ensureVisible(button);
        await tester.tap(button);
        await tester.pumpAndSettle();
        expect(tester.widget<TextButton>(button).onPressed, isNull);
      }

      await confirmService('flights');
      expect(find.text('1 of 3 services confirmed'), findsOneWidget);
      expect(tester.widget<FilledButton>(openTripMode).onPressed, isNull);
      await confirmService('stay');
      await confirmService('activities');
      expect(find.text('3 of 3 services confirmed'), findsOneWidget);
      await tester.ensureVisible(openTripMode);
      await tester.tap(openTripMode);
      await tester.pumpAndSettle();
      expect(find.text('Demo Trip Mode'), findsOneWidget);
      expect(find.text('Day 1 of 2'), findsOneWidget);
      expect(
          tester
              .widget<TextButton>(
                  find.widgetWithText(TextButton, 'Previous day'))
              .onPressed,
          isNull);
      await tester.tap(find.text('Next day'));
      await tester.pumpAndSettle();
      expect(find.text('Day 2 of 2'), findsOneWidget);
      expect(find.text('Ayung River White-Water Rafting'), findsOneWidget);
      expect(find.text('Sacred Monkey Forest Sanctuary'), findsNothing);
      expect(find.text('Balinese Cooking Class & Market Tour'), findsNothing);
      expect(
          tester
              .widget<TextButton>(find.widgetWithText(TextButton, 'Next day'))
              .onPressed,
          isNull);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Demo payment complete'), findsOneWidget);
      expect(find.text('3 of 3 services confirmed'), findsOneWidget);
      await tester.ensureVisible(find.text('Back to trip'));
      await tester.tap(find.text('Back to trip'));
      await tester.pumpAndSettle();
      expect(_estimateTotal(tester), editedTotal);
      final reviewTitle = find.text('Review your trip');
      await tester.ensureVisible(reviewTitle);
      await tester.tap(reviewTitle);
      await tester.pumpAndSettle();

      expect(
          find.byKey(const Key('trip-preview-save-success')), findsOneWidget);
      expect(createCalls, 1);
      final snapshot = tryParseUbudTripPreviewDraft(storedConstraints!)!;
      expect(snapshot.answers.budgetEgp, 90000);
      expect(snapshot.answers.travelerCount, 3);
      final originalDays = _samplePlan().days;
      final originalTarget = originalDays[1].stops;
      expect(snapshot.dayStopSlugs, [
        originalDays[0].stops.skip(1).map((stop) => stop.place.slug).toList(),
        [
          activitySlug,
          ...originalTarget
              .skip(1)
              .take(originalTarget.length - 2)
              .map((stop) => stop.place.slug),
          addedSlug,
          originalTarget.last.place.slug,
        ],
      ]);

      // Leave Build trip flow.
      Navigator.of(tester.element(find.byKey(const Key('trip-preview')))).pop();
      await tester.pumpAndSettle();
      Navigator.of(tester.element(find.byKey(const Key('trip-questionnaire'))))
          .pop();
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('build-draft-list')), findsOneWidget);
      expect(listPhase, greaterThanOrEqualTo(2));

      await tester.tap(find.byKey(Key('build-draft-$_draftId')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('trip-preview')), findsOneWidget);
      expect(_estimateTotal(tester), editedTotal);
      expect(removedStop, findsNothing);
      final flightTile = tester.widget<RadioListTile<String>>(
        find.byKey(const Key('trip-flight-flexible-example')),
      );
      expect(flightTile.groupValue, flightTile.value);
      final hotelTile = tester.widget<RadioListTile<String>>(
        find.byKey(const Key('trip-hotel-ubud-swasti-eco-cottages')),
      );
      expect(hotelTile.groupValue, hotelTile.value);
      expect(
        find.byKey(Key('trip-activity-add-$activitySlug')),
        findsOneWidget,
      );
      final movedStop = find.byKey(const Key('trip-stop-$activitySlug'));
      final addedStop = find.byKey(const Key('trip-stop-$addedSlug'));
      expect(movedStop, findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const Key('trip-preview-day-2')),
          matching: movedStop,
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byKey(const Key('trip-preview-day-2')),
          matching: addedStop,
        ),
        findsOneWidget,
      );
      expect(
        tester.getTopLeft(movedStop).dy,
        lessThan(tester
            .getTopLeft(find.byKey(
              Key('trip-stop-${originalTarget[1].place.slug}'),
            ))
            .dy),
      );
      final lastStop =
          find.byKey(Key('trip-stop-${originalTarget.last.place.slug}'));
      expect(tester.getTopLeft(addedStop).dy,
          lessThan(tester.getTopLeft(lastStop).dy));

      Navigator.of(tester.element(find.byKey(const Key('trip-preview')))).pop();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Trips'));
      await tester.pumpAndSettle();
      final confirmedTrip = find.byKey(const Key('trips-confirmed-demo'));
      expect(confirmedTrip, findsOneWidget);
      await tester.tap(confirmedTrip);
      await tester.pumpAndSettle();
      expect(find.text('Demo Trip Mode'), findsOneWidget);
      await tester.tap(find.text('Next day'));
      await tester.pumpAndSettle();
      expect(find.text('Ayung River White-Water Rafting'), findsOneWidget);

      auth.setSession(
          const TravelerSession(userId: 'user-b', accessToken: 'token-b'));
      await tester.pumpAndSettle();
      expect(find.text('Demo Trip Mode'), findsNothing);
      expect(confirmedTrip, findsNothing);
      expect(find.text('No confirmed trips yet'), findsOneWidget);

      auth.dispose();
    },
  );

  testWidgets('second save patches the same draft and list stays singular',
      (tester) async {
    Map<String, dynamic>? storedConstraints;
    var createCalls = 0;
    var patchCalls = 0;

    final mock = MockClient((request) async {
      if (request.url.path.endsWith('/bootstrap')) {
        return _json(_bootstrap());
      }
      if (request.url.path.endsWith('/drafts') && request.method == 'GET') {
        if (storedConstraints == null) {
          return _json({'items': <Map<String, dynamic>>[]});
        }
        return _json({
          'items': [_draftJson(constraints: storedConstraints!)],
        });
      }
      if (request.url.path.endsWith('/drafts') && request.method == 'POST') {
        createCalls += 1;
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        storedConstraints =
            Map<String, dynamic>.from(body['constraints'] as Map);
        return _json(
          _draftJson(constraints: storedConstraints!),
          status: 201,
        );
      }
      if (request.method == 'PATCH' &&
          request.url.path.endsWith('/drafts/$_draftId')) {
        patchCalls += 1;
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        storedConstraints =
            Map<String, dynamic>.from(body['constraints'] as Map);
        expect(body['title'], 'Ubud trip · 2 nights');
        return _json(_draftJson(constraints: storedConstraints!));
      }
      return http.Response('unexpected ${request.method} ${request.url}', 500);
    });

    final auth = FakeTravelerAuth(
      initial: const TravelerSession(userId: _userId, accessToken: 'token-a'),
    );
    final client = HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BuildTab(auth: auth, apiClient: client),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await _fillAndOpenPreview(tester);

    await _tapPreviewKey(tester, const Key('trip-preview-save'));
    expect(createCalls, 1);

    await _tapPreviewKey(tester, const Key('trip-flight-flexible-example'));
    await _tapPreviewKey(tester, const Key('trip-preview-save'));
    expect(createCalls, 1);
    expect(patchCalls, 1);

    Navigator.of(tester.element(find.byKey(const Key('trip-preview')))).pop();
    await tester.pumpAndSettle();
    Navigator.of(tester.element(find.byKey(const Key('trip-questionnaire'))))
        .pop();
    await tester.pumpAndSettle();

    expect(find.byKey(Key('build-draft-$_draftId')), findsOneWidget);
    expect(find.byKey(const Key('build-draft-list')), findsOneWidget);
    expect(
      find.descendant(
        of: find.byKey(const Key('build-draft-list')),
        matching: find.byType(ListTile),
      ),
      findsOneWidget,
    );

    auth.dispose();
  });

  testWidgets('failed save keeps edits and retry does not duplicate create',
      (tester) async {
    var createCalls = 0;
    var failNextCreate = true;
    Map<String, dynamic>? storedConstraints;

    final mock = MockClient((request) async {
      if (request.url.path.endsWith('/bootstrap')) {
        return _json(_bootstrap());
      }
      if (request.url.path.endsWith('/drafts') && request.method == 'GET') {
        if (storedConstraints == null) {
          return _json({'items': <Map<String, dynamic>>[]});
        }
        return _json({
          'items': [_draftJson(constraints: storedConstraints!)],
        });
      }
      if (request.url.path.endsWith('/drafts') && request.method == 'POST') {
        createCalls += 1;
        if (failNextCreate) {
          failNextCreate = false;
          return http.Response('create failed', 500);
        }
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        storedConstraints =
            Map<String, dynamic>.from(body['constraints'] as Map);
        return _json(
          _draftJson(constraints: storedConstraints!),
          status: 201,
        );
      }
      return http.Response('unexpected', 500);
    });

    final auth = FakeTravelerAuth(
      initial: const TravelerSession(userId: _userId, accessToken: 'token-a'),
    );
    final client = HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BuildTab(auth: auth, apiClient: client),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await _fillAndOpenPreview(tester);

    await _tapPreviewKey(tester, const Key('trip-flight-flexible-example'));
    await _tapPreviewKey(
      tester,
      const Key('trip-hotel-ubud-swasti-eco-cottages'),
    );
    const activitySlug = 'ubud-sacred-monkey-forest';
    await _tapPreviewKey(tester, Key('trip-activity-remove-$activitySlug'));
    final editedTotal = _estimateTotal(tester);

    await _tapPreviewKey(tester, const Key('trip-preview-save'));
    expect(find.byKey(const Key('trip-preview-save-error')), findsOneWidget);
    expect(find.textContaining('Draft saved'), findsNothing);
    expect(_estimateTotal(tester), editedTotal);
    expect(createCalls, 1);
    expect(storedConstraints, isNull);

    await _tapPreviewKey(tester, const Key('trip-preview-save'));
    expect(createCalls, 2);
    expect(find.byKey(const Key('trip-preview-save-success')), findsOneWidget);
    expect(find.text('Draft saved.'), findsOneWidget);
    expect(_estimateTotal(tester), editedTotal);
    expect(storedConstraints, isNotNull);

    auth.dispose();
  });

  testWidgets(
    'account switch closes demo checkout and preview; legacy drafts still work',
    (tester) async {
      const titleDraftIdA = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
      const titleDraftIdB = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
      final previewConstraints = TripPreviewDraftSnapshot.fromPlan(
        plan: _samplePlan(),
        flightId: 'economy-example',
        hotelSlug: 'ubud-komaneka-bisma',
        includedActivitySlugs: const {'ubud-sacred-monkey-forest'},
      ).toConstraints();

      final mock = MockClient((request) async {
        final authHeader = request.headers['Authorization'] ?? '';
        final forUserB = authHeader.contains('token-b');

        if (request.url.path.endsWith('/bootstrap')) {
          return _json({
            ..._bootstrap(),
            'userId': forUserB ? 'user-b' : _userId,
          });
        }
        if (request.url.path.endsWith('/drafts') && request.method == 'GET') {
          if (forUserB) {
            return _json({
              'items': [
                {
                  'id': titleDraftIdB,
                  'destinationId': null,
                  'title': 'User B legacy draft',
                  'constraints': {'party': 1},
                  'status': 'draft',
                  'createdAt': '2026-01-01T00:00:00.000Z',
                  'updatedAt': '2026-01-01T12:00:00.000Z',
                },
              ],
            });
          }
          return _json({
            'items': [
              _draftJson(constraints: previewConstraints),
              {
                'id': titleDraftIdA,
                'destinationId': null,
                'title': 'Legacy title draft',
                'constraints': {'party': 2},
                'status': 'draft',
                'createdAt': '2026-01-01T00:00:00.000Z',
                'updatedAt': '2026-01-01T12:00:00.000Z',
              },
            ],
          });
        }
        if (request.method == 'GET' &&
            request.url.path.endsWith('/drafts/$titleDraftIdB')) {
          return _json({
            'id': titleDraftIdB,
            'destinationId': null,
            'title': 'User B legacy draft',
            'constraints': {'party': 1},
            'status': 'draft',
            'createdAt': '2026-01-01T00:00:00.000Z',
            'updatedAt': '2026-01-01T12:00:00.000Z',
          });
        }
        if (request.method == 'PATCH' &&
            request.url.path.endsWith('/drafts/$_draftId')) {
          return _json(_draftJson(constraints: previewConstraints));
        }
        if (request.method == 'POST' &&
            request.url.path.endsWith('/drafts/$_draftId/quote')) {
          return _json(_quoteJson(), status: 201);
        }
        return http.Response('unexpected ${request.url}', 500);
      });

      final auth = FakeTravelerAuth(
        initial: const TravelerSession(userId: _userId, accessToken: 'token-a'),
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

      expect(find.byKey(Key('build-draft-$_draftId')), findsOneWidget);
      expect(
          find.byKey(const Key('build-draft-$titleDraftIdA')), findsOneWidget);

      await tester.tap(find.byKey(Key('build-draft-$_draftId')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('trip-preview')), findsOneWidget);

      await _tapPreviewKey(tester, const Key('trip-review'));
      await _tapPreviewKey(tester, const Key('trip-review-request-quote'));
      await _tapPreviewKey(tester, const Key('trip-demo-checkout'));
      expect(find.text('Demo checkout'), findsOneWidget);
      auth.setSession(
        const TravelerSession(userId: 'user-b', accessToken: 'token-b'),
      );
      await tester.pumpAndSettle();
      expect(find.text('Demo checkout', skipOffstage: false), findsNothing);
      expect(
        find.byKey(const Key('trip-preview'), skipOffstage: false),
        findsNothing,
      );
      expect(find.byKey(Key('build-draft-$_draftId')), findsNothing);
      expect(find.byKey(const Key('build-draft-$titleDraftIdA')), findsNothing);
      expect(
          find.byKey(const Key('build-draft-$titleDraftIdB')), findsOneWidget);

      await tester.tap(find.byKey(const Key('build-draft-$titleDraftIdB')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('draft-title-field')), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('draft-title-field')))
            .controller
            ?.text,
        'User B legacy draft',
      );

      auth.dispose();
    },
  );

  testWidgets(
    'create commits but dropped response retries to one draft; newer edits patch',
    (tester) async {
      Map<String, dynamic>? storedConstraints;
      String? storedClientRequestKey;
      String? storedTitle;
      var createAttempts = 0;
      var committedCreates = 0;
      var patchCalls = 0;
      var dropNextCreateResponse = true;

      final mock = MockClient((request) async {
        if (request.url.path.endsWith('/bootstrap')) {
          return _json(_bootstrap());
        }
        if (request.url.path.endsWith('/drafts') && request.method == 'GET') {
          if (storedConstraints == null) {
            return _json({'items': <Map<String, dynamic>>[]});
          }
          return _json({
            'items': [
              _draftJson(
                constraints: storedConstraints!,
                title: storedTitle,
              ),
            ],
          });
        }
        if (request.url.path.endsWith('/drafts') && request.method == 'POST') {
          createAttempts += 1;
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          final key = body['clientRequestKey'] as String?;
          expect(key, isNotNull);

          if (storedClientRequestKey != null &&
              key == storedClientRequestKey &&
              storedConstraints != null) {
            // Idempotent replay — same owner key returns original draft.
            return _json(
              _draftJson(
                constraints: storedConstraints!,
                title: storedTitle,
              ),
              status: 201,
            );
          }

          committedCreates += 1;
          storedClientRequestKey = key;
          storedTitle = body['title'] as String?;
          storedConstraints =
              Map<String, dynamic>.from(body['constraints'] as Map);

          if (dropNextCreateResponse) {
            dropNextCreateResponse = false;
            throw http.ClientException('simulated dropped create response');
          }
          return _json(
            _draftJson(
              constraints: storedConstraints!,
              title: storedTitle,
            ),
            status: 201,
          );
        }
        if (request.method == 'PATCH' &&
            request.url.path.endsWith('/drafts/$_draftId')) {
          patchCalls += 1;
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          storedTitle = body['title'] as String? ?? storedTitle;
          storedConstraints =
              Map<String, dynamic>.from(body['constraints'] as Map);
          return _json(
            _draftJson(
              constraints: storedConstraints!,
              title: storedTitle,
            ),
          );
        }
        return http.Response('unexpected ${request.method}', 500);
      });

      final auth = FakeTravelerAuth(
        initial: const TravelerSession(userId: _userId, accessToken: 'token-a'),
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
      await _fillAndOpenPreview(tester);

      await _tapPreviewKey(tester, const Key('trip-preview-save'));
      expect(find.byKey(const Key('trip-preview-save-error')), findsOneWidget);
      expect(committedCreates, 1);
      expect(createAttempts, 1);

      // Traveler edits after the timed-out create.
      await _tapPreviewKey(tester, const Key('trip-flight-flexible-example'));
      final editedTotal = _estimateTotal(tester);

      await _tapPreviewKey(tester, const Key('trip-preview-save'));
      expect(
          find.byKey(const Key('trip-preview-save-success')), findsOneWidget);
      expect(createAttempts, 2);
      expect(committedCreates, 1);
      expect(patchCalls, 1);
      expect(_estimateTotal(tester), editedTotal);
      expect(
        (storedConstraints!['selections'] as Map)['flightId'],
        'flexible-example',
      );

      Navigator.of(tester.element(find.byKey(const Key('trip-preview')))).pop();
      await tester.pumpAndSettle();
      Navigator.of(tester.element(find.byKey(const Key('trip-questionnaire'))))
          .pop();
      await tester.pumpAndSettle();

      expect(
        find.descendant(
          of: find.byKey(const Key('build-draft-list')),
          matching: find.byType(ListTile),
        ),
        findsOneWidget,
      );
      expect(find.byKey(Key('build-draft-$_draftId')), findsOneWidget);

      auth.dispose();
    },
  );
}

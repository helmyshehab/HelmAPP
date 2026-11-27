import 'published_ubud_fixture.dart';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/auth/traveler_session.dart';
import 'package:helm_mobile/build/trip_gen/trip_answers.dart';
import 'package:helm_mobile/build/trip_gen/trip_demo_mode_screen.dart';
import 'package:helm_mobile/build/trip_gen/trip_planner.dart';
import 'package:helm_mobile/build/trip_gen/trip_preview_draft.dart';
import 'package:helm_mobile/build/trip_gen/trip_preview_screen.dart';
import 'package:helm_mobile/packages/istanbul_package_fixture.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Finder _previewScrollable() => find
    .descendant(
      of: find.byKey(const Key('trip-preview')),
      matching: find.byType(Scrollable),
    )
    .first;

Future<void> _tapPreviewKey(WidgetTester tester, Key key) async {
  final finder = find.byKey(key);
  await tester.scrollUntilVisible(
    finder,
    200,
    scrollable: _previewScrollable(),
  );
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

HelmApiClient _catalogClient({Set<String>? slugs}) => HelmApiClient(
      baseUrl: 'https://api.test',
      httpClient: MockClient((request) async {
        if (request.url.path == '/v1/catalog/places') {
          return publishedUbudFixture(slugs: slugs);
        }
        return http.Response('unexpected', 500);
      }),
    );

void main() {
  testWidgets(
    'Build opens Trip Mode before save, shows edits across days, and returns intact',
    (tester) async {
      final auth = FakeTravelerAuth(
        initial: const TravelerSession(userId: 'user-a', accessToken: 'token-a'),
      );
      final plan = planDemoTrip(const TripAnswers(
        budgetEgp: 85000,
        travelerCount: 2,
        nights: 2,
      ));
      const movedSlug = 'ubud-sacred-monkey-forest';

      await tester.pumpWidget(MaterialApp(
        home: TripPreviewScreen(
          plan: plan,
          auth: auth,
          apiClient: _catalogClient(),
        ),
      ));
      await tester.pumpAndSettle();

      // Unsaved itinerary edit: move Monkey Forest to day 2.
      await _tapPreviewKey(tester, const Key('trip-stop-move-$movedSlug'));
      await tester.tap(find.byKey(const Key('trip-stop-move-to-2')));
      await tester.pumpAndSettle();
      expect(
        find.descendant(
          of: find.byKey(const Key('trip-preview-day-2')),
          matching: find.byKey(const Key('trip-stop-$movedSlug')),
        ),
        findsOneWidget,
      );

      // No draft save, quote, or checkout — open Trip Mode from coverage.
      expect(find.byKey(const Key('trip-preview-save-success')), findsNothing);
      await _tapPreviewKey(tester, const Key('trip-preview-open-trip-mode'));
      expect(find.byType(TripDemoModeScreen), findsOneWidget);
      expect(find.text('Trip Mode preview'), findsOneWidget);
      expect(find.text('Demo Trip Mode'), findsNothing);
      expect(
        find.textContaining('Preview of your current Build itinerary'),
        findsOneWidget,
      );
      expect(find.text('Trip alerts'), findsOneWidget);
      expect(find.text('Travel chat'), findsOneWidget);
      expect(find.text('Planned feature'), findsNWidgets(2));
      expect(find.text('Day 1 of 2'), findsOneWidget);
      expect(find.text('Sacred Monkey Forest Sanctuary'), findsNothing);

      await tester.tap(find.text('Next day'));
      await tester.pumpAndSettle();
      expect(find.text('Day 2 of 2'), findsOneWidget);
      expect(find.text('Sacred Monkey Forest Sanctuary'), findsOneWidget);

      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.byType(TripDemoModeScreen), findsNothing);
      expect(find.byKey(const Key('trip-preview')), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const Key('trip-preview-day-2')),
          matching: find.byKey(const Key('trip-stop-$movedSlug')),
        ),
        findsOneWidget,
      );
      expect(find.byKey(const Key('trip-preview-open-trip-mode')), findsOneWidget);

      auth.dispose();
    },
  );

  testWidgets(
    'Istanbul Build preview opens Trip Mode with the current day plan',
    (tester) async {
      final auth = FakeTravelerAuth(
        initial: const TravelerSession(userId: 'user-a', accessToken: 'token-a'),
      );
      final snapshot = istanbulBosphorusPackageFixture.snapshot;
      final plan = planFromTripPreviewDraft(snapshot);

      await tester.pumpWidget(MaterialApp(
        home: TripPreviewScreen(
          plan: plan,
          auth: auth,
          apiClient: _catalogClient(slugs: {
            'istanbul-ajia-hotel',
            'hagia-sophia-exterior',
            'istanbul-grand-bazaar',
            'istanbul-galata-tower',
          }),
          initialFlightId: snapshot.flightId,
          initialHotelSlug: snapshot.hotelSlug,
          initialIncludedActivitySlugs: snapshot.includedActivitySlugs,
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Istanbul'), findsWidgets);
      await _tapPreviewKey(tester, const Key('trip-preview-open-trip-mode'));
      expect(find.text('Trip Mode preview'), findsOneWidget);
      expect(find.text('Istanbul'), findsWidgets);
      expect(find.text('Day 1 of 3'), findsOneWidget);
      expect(find.text('Hagia Sophia (exterior context)'), findsOneWidget);
      expect(find.text('Grand Bazaar'), findsOneWidget);

      await tester.tap(find.text('Next day'));
      await tester.pumpAndSettle();
      expect(find.text('Day 2 of 3'), findsOneWidget);
      expect(find.text('Galata Tower'), findsOneWidget);

      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('trip-hotel-istanbul-ajia-hotel')), findsOneWidget);
      expect(find.byKey(const Key('trip-stop-istanbul-galata-tower')), findsOneWidget);

      auth.dispose();
    },
  );

  testWidgets(
    'checkout Trip Mode keeps demo copy without Build planned-feature labels',
    (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: TripDemoModeScreen(
          destinationName: 'Ubud',
          days: [
            TripPreviewDay(dayNumber: 1, title: 'Day 1', stops: []),
            TripPreviewDay(dayNumber: 2, title: 'Day 2', stops: []),
          ],
        ),
      ));
      await tester.pumpAndSettle();
      expect(find.text('Demo Trip Mode'), findsOneWidget);
      expect(find.text('Sample itinerary from demo checkout'), findsOneWidget);
      expect(find.text('Trip Mode preview'), findsNothing);
      expect(find.text('Trip alerts'), findsNothing);
      expect(find.text('Travel chat'), findsNothing);
      expect(find.text('Planned feature'), findsNothing);
    },
  );
}

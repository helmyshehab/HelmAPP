import 'dart:convert';

import 'published_ubud_fixture.dart';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/auth/traveler_session.dart';
import 'package:helm_mobile/build/trip_gen/trip_answers.dart';
import 'package:helm_mobile/tabs/build_tab.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response _json(Object body, {int status = 200}) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

void main() {
  testWidgets('questionnaire to preview preserves answers on edit',
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
      return http.Response('unexpected ${request.method} ${request.url}', 500);
    });

    final auth = FakeTravelerAuth(
      initial: const TravelerSession(userId: 'user-a', accessToken: 'token-a'),
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

    expect(find.byKey(const Key('build-my-trip')), findsOneWidget);
    await tester.tap(find.byKey(const Key('build-my-trip')));
    await tester.pumpAndSettle();

    await tester.enterText(find.byKey(const Key('trip-budget')), '80000');
    await tester.enterText(find.byKey(const Key('trip-travelers')), '2');
    await tester.enterText(find.byKey(const Key('trip-nights')), '3');
    await tester
        .ensureVisible(find.byKey(const Key('trip-lifestyle-adventure')));
    await tester.tap(find.byKey(const Key('trip-lifestyle-adventure')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('trip-preview-submit')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('trip-preview')), findsOneWidget);
    expect(find.byKey(const Key('trip-preview-destination')), findsOneWidget);
    expect(find.text('Ubud'), findsWidgets);
    expect(find.byKey(const Key('trip-preview-day-1')), findsOneWidget);
    expect(find.byKey(const Key('trip-preview-day-3')), findsOneWidget);
    expect(find.byKey(const Key('trip-preview-day-4')), findsNothing);

    await tester.scrollUntilVisible(
      find.byKey(const Key('trip-preview-edit')),
      300,
      scrollable: find
          .descendant(
            of: find.byKey(const Key('trip-preview')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await tester.tap(find.byKey(const Key('trip-preview-edit')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('trip-questionnaire')), findsOneWidget);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('trip-budget')))
          .controller
          ?.text,
      '80000',
    );
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('trip-travelers')))
          .controller
          ?.text,
      '2',
    );
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('trip-nights')))
          .controller
          ?.text,
      '3',
    );

    // Inline validation when fields cleared.
    await tester.enterText(find.byKey(const Key('trip-budget')), '');
    await tester.tap(find.byKey(const Key('trip-preview-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Enter a total trip budget in EGP.'), findsOneWidget);
    expect(find.byKey(const Key('trip-preview')), findsNothing);

    auth.dispose();
  });

  testWidgets('account switch clears questionnaire answers for next open',
      (tester) async {
    var listCalls = 0;
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
        listCalls += 1;
        return _json({'items': <Map<String, dynamic>>[]});
      }
      return http.Response('unexpected', 500);
    });

    final auth = FakeTravelerAuth(
      initial: const TravelerSession(userId: 'user-a', accessToken: 'token-a'),
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

    await tester.tap(find.byKey(const Key('build-my-trip')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('trip-budget')), '90000');
    await tester.enterText(find.byKey(const Key('trip-travelers')), '3');
    await tester.enterText(find.byKey(const Key('trip-nights')), '2');
    Navigator.of(tester.element(find.byKey(const Key('trip-questionnaire'))))
        .pop();
    await tester.pumpAndSettle();

    auth.setSession(
      const TravelerSession(userId: 'user-b', accessToken: 'token-b'),
    );
    await tester.pumpAndSettle();
    expect(listCalls, greaterThanOrEqualTo(2));

    await tester.tap(find.byKey(const Key('build-my-trip')));
    await tester.pumpAndSettle();

    final budgetField =
        tester.widget<TextField>(find.byKey(const Key('trip-budget')));
    expect(budgetField.controller?.text ?? '', isEmpty);

    auth.dispose();
  });

  testWidgets(
    'account switch while preview is open closes Build screens and resets questionnaire',
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
      final generationBefore = auth.authGeneration;
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

      expect(find.byKey(const Key('trip-preview')), findsOneWidget);
      expect(
        find.byKey(const Key('trip-questionnaire'), skipOffstage: false),
        findsOneWidget,
      );

      // Token refresh must keep the preview open (same identity + generation).
      auth.setSession(
        const TravelerSession(
            userId: 'user-a', accessToken: 'token-a-refreshed'),
      );
      await tester.pumpAndSettle();
      expect(auth.authGeneration, generationBefore);
      expect(find.byKey(const Key('trip-preview')), findsOneWidget);

      auth.setSession(
        const TravelerSession(userId: 'user-b', accessToken: 'token-b'),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('trip-preview')), findsNothing);
      expect(find.byKey(const Key('trip-questionnaire')), findsNothing);
      expect(find.byKey(const Key('build-my-trip')), findsOneWidget);

      await tester.tap(find.byKey(const Key('build-my-trip')));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('trip-budget')))
            .controller
            ?.text,
        isEmpty,
      );
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('trip-travelers')))
            .controller
            ?.text,
        isEmpty,
      );
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('trip-nights')))
            .controller
            ?.text,
        isEmpty,
      );

      auth.dispose();
    },
  );

  testWidgets(
    'auth change removes trip routes under an unrelated cover; private screens stay gone',
    (tester) async {
      final navigatorKey = GlobalKey<NavigatorState>();
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
          navigatorKey: navigatorKey,
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
      expect(find.byKey(const Key('trip-preview')), findsOneWidget);

      final nav = navigatorKey.currentState!;
      // Do not await — Future completes only when the route is popped.
      nav.push<void>(
        MaterialPageRoute<void>(
          settings: const RouteSettings(name: 'unrelated'),
          builder: (_) => const Scaffold(
            key: Key('unrelated-screen'),
            body: Center(child: Text('Unrelated page')),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('unrelated-screen')), findsOneWidget);
      expect(
        find.byKey(const Key('trip-preview'), skipOffstage: false),
        findsOneWidget,
      );

      auth.setSession(
        const TravelerSession(userId: 'user-b', accessToken: 'token-b'),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('unrelated-screen')), findsOneWidget);
      expect(find.text('Unrelated page'), findsOneWidget);
      expect(
        find.byKey(const Key('trip-preview'), skipOffstage: false),
        findsNothing,
      );
      expect(
        find.byKey(const Key('trip-questionnaire'), skipOffstage: false),
        findsNothing,
      );

      nav.pop();
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('unrelated-screen')), findsNothing);
      expect(
        find.byKey(const Key('trip-preview'), skipOffstage: false),
        findsNothing,
      );
      expect(
        find.byKey(const Key('trip-questionnaire'), skipOffstage: false),
        findsNothing,
      );
      expect(find.byKey(const Key('build-my-trip')), findsOneWidget);

      await tester.tap(find.byKey(const Key('build-my-trip')));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('trip-budget')))
            .controller
            ?.text,
        isEmpty,
      );
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('trip-travelers')))
            .controller
            ?.text,
        isEmpty,
      );
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('trip-nights')))
            .controller
            ?.text,
        isEmpty,
      );

      auth.dispose();
    },
  );

  test('trip answers validation helpers', () {
    expect(
        destinationChoiceLabel(TripDestinationChoice.surprise), 'Surprise me');
    expect(lifestyleLabel(TripLifestyle.food), 'Food');
  });
}

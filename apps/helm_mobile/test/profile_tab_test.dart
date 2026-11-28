import 'dart:convert';

import 'published_ubud_fixture.dart';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/auth/traveler_session.dart';
import 'package:helm_mobile/main.dart' show HelmShell;
import 'package:helm_mobile/packages/ubud_package_fixture.dart';
import 'package:helm_mobile/theme/helm_theme_controller.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const _publishedSlugs = {
  'ubud-village-hotel',
  'ubud-capella-ubud',
  'ubud-moksa',
  'ubud-sacred-monkey-forest',
};

http.Response _json(Object body, {int status = 200}) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

HelmApiClient _emptyClient() => HelmApiClient(
      baseUrl: 'https://api.test',
      httpClient: MockClient((request) async {
        if (request.url.path.endsWith('/destinations')) {
          return _json({'items': [], 'total': 0, 'limit': 20, 'offset': 0});
        }
        if (request.url.path.endsWith('/packages')) {
          return _json({
            'items': [
              {
                'id': ubudCulturePackageFixture.id,
                'slug': ubudCulturePackageFixture.id,
                'titleEn': ubudCulturePackageFixture.title,
                'titleAr': ubudCulturePackageFixture.title,
                'summaryEn': ubudCulturePackageFixture.summary,
                'summaryAr': ubudCulturePackageFixture.summary,
                'durationDays': ubudCulturePackageFixture.snapshot.answers.nights,
                'destinationSlug': 'ubud',
                'content': ubudCulturePackageFixture.snapshot.toConstraints(),
              },
            ],
          });
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
          return _json({'items': []});
        }
        if (request.url.path.endsWith('/demo-bookings')) {
          return _json([]);
        }
        if (request.url.path.endsWith('/trips/requests') ||
            request.url.path.endsWith('/requests')) {
          return _json({'items': []});
        }
        if (request.url.path.contains('/catalog/places') ||
            request.url.path.contains('/places')) {
          return publishedUbudFixture(slugs: _publishedSlugs);
        }
        return http.Response('unexpected ${request.method} ${request.url}', 500);
      }),
    );

Future<void> _openProfile(WidgetTester tester) async {
  await tester.tap(find.text('Profile'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('Profile guest can sign in and see email plus Sign out',
      (tester) async {
    final auth = FakeTravelerAuth();
    final theme = HelmThemeController.memory();
    await tester.pumpWidget(
      MaterialApp(
        home: HelmShell(
          auth: auth,
          apiClient: _emptyClient(),
          themeController: theme,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await _openProfile(tester);

    expect(find.byKey(const Key('profile-guest')), findsOneWidget);
    expect(find.byKey(const Key('profile-appearance')), findsOneWidget);

    await tester.enterText(
      find.byKey(const Key('profile-sign-in-email')),
      'traveler@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('profile-sign-in-password')),
      'password123',
    );
    await tester.tap(find.byKey(const Key('profile-sign-in-submit')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('profile-signed-in')), findsOneWidget);
    expect(find.byKey(const Key('profile-email')), findsOneWidget);
    expect(find.text('traveler@example.com'), findsOneWidget);
    expect(find.byKey(const Key('profile-my-trips')), findsOneWidget);
    expect(find.byKey(const Key('profile-sign-out')), findsOneWidget);

    await tester.tap(find.byKey(const Key('profile-my-trips')));
    await tester.pumpAndSettle();
    expect(
      tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
      3,
    );

    await _openProfile(tester);
    await tester.tap(find.byKey(const Key('profile-sign-out')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('profile-guest')), findsOneWidget);
    expect(auth.session, isNull);
    auth.dispose();
  });

  testWidgets('Profile create account signs the traveler in', (tester) async {
    final auth = FakeTravelerAuth();
    await tester.pumpWidget(
      MaterialApp(
        home: HelmShell(auth: auth, apiClient: _emptyClient()),
      ),
    );
    await tester.pumpAndSettle();
    await _openProfile(tester);

    await tester.tap(find.byKey(const Key('profile-switch-to-create-account')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('profile-sign-in-email')),
      'new@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('profile-sign-in-password')),
      'password123',
    );
    await tester.tap(find.byKey(const Key('profile-create-account-submit')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('profile-signed-in')), findsOneWidget);
    expect(find.text('new@example.com'), findsOneWidget);
    auth.dispose();
  });

  testWidgets('returning session restores signed-in Profile', (tester) async {
    final auth = FakeTravelerAuth(
      initial: const TravelerSession(
        userId: 'user-a',
        accessToken: 'token-a',
        email: 'returning@example.com',
        displayName: 'Returning Traveler',
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: HelmShell(auth: auth, apiClient: _emptyClient()),
      ),
    );
    await tester.pumpAndSettle();
    await _openProfile(tester);

    expect(find.byKey(const Key('profile-signed-in')), findsOneWidget);
    expect(find.text('Returning Traveler'), findsOneWidget);
    expect(find.text('returning@example.com'), findsOneWidget);
    auth.dispose();
  });

  testWidgets('Build Sign in opens Profile without embedded form',
      (tester) async {
    final auth = FakeTravelerAuth();
    await tester.pumpWidget(
      MaterialApp(
        home: HelmShell(auth: auth, apiClient: _emptyClient()),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Build'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('build-signed-out')), findsOneWidget);
    expect(find.byKey(const Key('build-open-profile')), findsOneWidget);
    expect(find.byKey(const Key('profile-sign-in-email')), findsNothing);

    await tester.tap(find.byKey(const Key('build-open-profile')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('profile-guest')), findsOneWidget);
    expect(find.byKey(const Key('profile-sign-in-email')), findsOneWidget);
    auth.dispose();
  });

  testWidgets(
    'Packages Customize preserves package through Profile sign-in',
    (tester) async {
      final auth = FakeTravelerAuth();
      final client = _emptyClient();
      await tester.pumpWidget(
        MaterialApp(home: HelmShell(auth: auth, apiClient: client)),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Packages'));
      await tester.pumpAndSettle();
      await tester.tap(
        find.byKey(Key('package-customize-${ubudCulturePackageFixture.id}')),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('profile-pending-handoff')), findsOneWidget);
      expect(find.byKey(const Key('profile-sign-in-email')), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('profile-sign-in-email')),
        'traveler@example.com',
      );
      await tester.enterText(
        find.byKey(const Key('profile-sign-in-password')),
        'password123',
      );
      await tester.tap(find.byKey(const Key('profile-sign-in-submit')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('trip-preview')), findsOneWidget);
      expect(
        find.byKey(const Key('trip-hotel-ubud-village-hotel')),
        findsOneWidget,
      );
      auth.dispose();
    },
  );

  testWidgets('cancel handoff clears resume and returns to Explore',
      (tester) async {
    final auth = FakeTravelerAuth();
    await tester.pumpWidget(
      MaterialApp(
        home: HelmShell(auth: auth, apiClient: _emptyClient()),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Packages'));
    await tester.pumpAndSettle();
    await tester.tap(
      find.byKey(Key('package-customize-${ubudCulturePackageFixture.id}')),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('profile-cancel-handoff')));
    await tester.pumpAndSettle();

    expect(
      tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
      0,
    );

    await _openProfile(tester);
    await tester.enterText(
      find.byKey(const Key('profile-sign-in-email')),
      'traveler@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('profile-sign-in-password')),
      'password123',
    );
    await tester.tap(find.byKey(const Key('profile-sign-in-submit')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('profile-signed-in')), findsOneWidget);
    expect(find.byKey(const Key('trip-preview')), findsNothing);
    auth.dispose();
  });

  testWidgets('account switch clears private Build drafts', (tester) async {
    var listCalls = 0;
    final mock = MockClient((request) async {
      if (request.url.path.endsWith('/destinations')) {
        return _json({'items': [], 'total': 0, 'limit': 20, 'offset': 0});
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
        final title = listCalls == 1 ? 'Account A draft' : 'Account B draft';
        return _json({
          'items': [
            {
              'id': '11111111-1111-1111-1111-111111111111',
              'destinationId': null,
              'title': title,
              'constraints': <String, dynamic>{},
              'status': 'draft',
              'createdAt': '2026-01-01T00:00:00.000Z',
              'updatedAt': '2026-01-02T00:00:00.000Z',
            },
          ],
        });
      }
      return http.Response('unexpected ${request.method} ${request.url}', 500);
    });
    final auth = FakeTravelerAuth(
      initial: const TravelerSession(
        userId: 'user-a',
        accessToken: 'token-a',
        email: 'a@example.com',
      ),
    );
    final client = HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

    await tester.pumpWidget(
      MaterialApp(home: HelmShell(auth: auth, apiClient: client)),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Build'));
    await tester.pumpAndSettle();
    expect(find.text('Account A draft'), findsOneWidget);

    auth.setSession(
      const TravelerSession(
        userId: 'user-b',
        accessToken: 'token-b',
        email: 'b@example.com',
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Account A draft'), findsNothing);
    expect(find.text('Account B draft'), findsOneWidget);
    auth.dispose();
  });
}

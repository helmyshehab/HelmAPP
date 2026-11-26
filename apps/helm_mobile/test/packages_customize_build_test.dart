import 'dart:convert';

import 'published_ubud_fixture.dart';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/auth/traveler_session.dart';
import 'package:helm_mobile/build/trip_gen/trip_preview_draft.dart';
import 'package:helm_mobile/main.dart' show HelmShell;
import 'package:helm_mobile/packages/ubud_package_fixture.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const _draftId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const _userId = 'user-a';

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
      'title': title ?? 'Ubud trip · 3 nights',
      'constraints': constraints,
      'status': 'draft',
      'createdAt': '2026-01-01T00:00:00.000Z',
      'updatedAt': '2026-01-02T00:00:00.000Z',
    };

Map<String, dynamic> _packageJson({Map<String, dynamic>? content}) {
  final fixture = ubudCulturePackageFixture;
  return {
    'id': fixture.id,
    'slug': fixture.id,
    'titleEn': fixture.title,
    'titleAr': fixture.title,
    'summaryEn': fixture.summary,
    'summaryAr': fixture.summary,
    'durationDays': fixture.snapshot.answers.nights,
    'destinationSlug': 'ubud',
    'content': content ?? fixture.snapshot.toConstraints(),
  };
}

bool _isPackagesList(http.Request request) =>
    request.method == 'GET' && request.url.path.endsWith('/packages');

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

Future<void> _openCustomize(WidgetTester tester) async {
  await tester.tap(find.text('Packages'));
  await tester.pumpAndSettle();
  await tester.tap(
    find.byKey(Key('package-customize-${ubudCulturePackageFixture.id}')),
  );
  await tester.pumpAndSettle();
}

void main() {
  test('Ubud package fixture is ubud_trip_preview v1 without cooking class', () {
    final snapshot = ubudCulturePackageFixture.snapshot;
    final constraints = snapshot.toConstraints();
    expect(constraints['kind'], ubudTripPreviewConstraintKind);
    expect(constraints['version'], ubudTripPreviewConstraintVersion);
    expect(tryParseUbudTripPreviewDraft(constraints), isNotNull);

    final allStops = snapshot.dayStopSlugs.expand((day) => day).toSet();
    expect(allStops, isNot(contains('ubud-balinese-cooking-class')));
    expect(snapshot.includedActivitySlugs,
        isNot(contains('ubud-balinese-cooking-class')));
    expect(allStops, containsAll(['ubud-sacred-monkey-forest', 'ubud-moksa']));
    expect(snapshot.hotelSlug, 'ubud-village-hotel');
  });

  testWidgets('Packages lists the curated Ubud idea', (tester) async {
    final auth = FakeTravelerAuth();
    final client = HelmApiClient(
      baseUrl: 'https://api.test',
      httpClient: MockClient((request) async {
        if (_isPackagesList(request)) {
          return _json({'items': [_packageJson()]});
        }
        return http.Response('unexpected ${request.method} ${request.url}', 500);
      }),
    );

    await tester.pumpWidget(
      MaterialApp(home: HelmShell(auth: auth, apiClient: client)),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Packages'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('packages-list')), findsOneWidget);
    expect(
      find.byKey(Key('package-idea-${ubudCulturePackageFixture.id}')),
      findsOneWidget,
    );
    expect(find.text(ubudCulturePackageFixture.title), findsOneWidget);
    expect(find.textContaining('ubud-village-hotel'), findsOneWidget);
    expect(find.text('Customize in Build'), findsOneWidget);
    auth.dispose();
  });

  testWidgets(
    'Customize opens Build editor with package defaults after sign-in',
    (tester) async {
      final mock = MockClient((request) async {
        if (_isPackagesList(request)) {
          return _json({'items': [_packageJson()]});
        }
        if (request.url.path.endsWith('/bootstrap')) {
          return _json(_bootstrap());
        }
        if (request.url.path.endsWith('/drafts') && request.method == 'GET') {
          return _json({'items': <Object>[]});
        }
        if (request.url.path.contains('/catalog/places')) {
          return publishedUbudFixture(slugs: _publishedSlugs);
        }
        return http.Response('unexpected ${request.method} ${request.url}', 500);
      });
      final auth = FakeTravelerAuth();
      final client =
          HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

      await tester.pumpWidget(
        MaterialApp(home: HelmShell(auth: auth, apiClient: client)),
      );
      await tester.pumpAndSettle();
      await _openCustomize(tester);

      expect(find.byKey(const Key('build-signed-out')), findsOneWidget);
      await tester.enterText(
        find.byKey(const Key('build-sign-in-email')),
        'traveler@example.com',
      );
      await tester.enterText(
        find.byKey(const Key('build-sign-in-password')),
        'password123',
      );
      await tester.tap(find.byKey(const Key('build-sign-in-submit')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('trip-preview')), findsOneWidget);
      expect(
        find.byKey(const Key('trip-hotel-ubud-village-hotel')),
        findsOneWidget,
      );
      expect(
        find.byKey(const Key('trip-stop-ubud-sacred-monkey-forest')),
        findsWidgets,
      );
      expect(
        find.byKey(const Key('trip-stop-ubud-moksa')),
        findsWidgets,
      );
      expect(
        find.byKey(const Key('trip-stop-ubud-balinese-cooking-class')),
        findsNothing,
      );
      auth.dispose();
    },
  );

  testWidgets(
    'Saving a customized package creates a private draft; package defaults stay intact',
    (tester) async {
      Map<String, dynamic>? storedConstraints;
      var createCalls = 0;
      final mock = MockClient((request) async {
        if (_isPackagesList(request)) {
          return _json({'items': [_packageJson()]});
        }
        if (request.url.path.endsWith('/bootstrap')) {
          return _json(_bootstrap());
        }
        if (request.url.path.contains('/catalog/places')) {
          return publishedUbudFixture(slugs: _publishedSlugs);
        }
        if (request.url.path.endsWith('/drafts') && request.method == 'GET') {
          if (storedConstraints == null) {
            return _json({'items': <Object>[]});
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
          expect(storedConstraints!['kind'], ubudTripPreviewConstraintKind);
          return _json(
            _draftJson(constraints: storedConstraints!),
            status: 201,
          );
        }
        return http.Response('unexpected ${request.method} ${request.url}', 500);
      });

      final fixtureBefore = Map<String, dynamic>.from(
        ubudCulturePackageFixture.snapshot.toConstraints(),
      );
      final auth = FakeTravelerAuth(
        initial: const TravelerSession(userId: _userId, accessToken: 'token-a'),
      );
      final client =
          HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

      await tester.pumpWidget(
        MaterialApp(home: HelmShell(auth: auth, apiClient: client)),
      );
      await tester.pumpAndSettle();
      await _openCustomize(tester);

      expect(find.byKey(const Key('trip-preview')), findsOneWidget);
      await _tapPreviewKey(
        tester,
        const Key('trip-hotel-ubud-capella-ubud'),
      );
      await _tapPreviewKey(tester, const Key('trip-preview-save'));
      expect(find.byKey(const Key('trip-preview-save-success')), findsOneWidget);
      expect(createCalls, 1);
      expect(storedConstraints!['selections']['hotelSlug'], 'ubud-capella-ubud');

      // Curated package fixture is unchanged.
      expect(
        ubudCulturePackageFixture.snapshot.toConstraints(),
        fixtureBefore,
      );
      expect(
        ubudCulturePackageFixture.snapshot.hotelSlug,
        'ubud-village-hotel',
      );

      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Ubud trip · 3 nights'), findsOneWidget);

      await tester.tap(find.byKey(Key('build-draft-$_draftId')));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const Key('trip-hotel-ubud-capella-ubud')),
        findsOneWidget,
      );

      await tester.pageBack();
      await tester.pumpAndSettle();
      await _openCustomize(tester);
      expect(
        find.byKey(const Key('trip-hotel-ubud-village-hotel')),
        findsOneWidget,
      );
      expect(
        find.byKey(const Key('trip-stop-ubud-balinese-cooking-class')),
        findsNothing,
      );
      auth.dispose();
    },
  );
}

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/auth/traveler_session.dart';
import 'package:helm_mobile/build/draft_editor_screen.dart';
import 'package:helm_mobile/tabs/build_tab.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response _json(Object body, {int status = 200}) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

Map<String, dynamic> _draftJson({
  required String id,
  String? title,
}) =>
    {
      'id': id,
      'destinationId': null,
      'title': title,
      'constraints': <String, dynamic>{},
      'status': 'draft',
      'createdAt': '2026-01-01T00:00:00.000Z',
      'updatedAt': '2026-01-02T00:00:00.000Z',
    };

void main() {
  testWidgets('Build shows signed-out panel before authentication',
      (tester) async {
    final auth = FakeTravelerAuth();
    final mock = MockClient((_) async => http.Response('unused', 500));
    final client = HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BuildTab(auth: auth, apiClient: client),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('build-signed-out')), findsOneWidget);
    auth.dispose();
  });

  testWidgets('Build clears draft list when the account changes', (tester) async {
    var listCalls = 0;
    final mock = MockClient((request) async {
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
            _draftJson(
              id: '11111111-1111-1111-1111-111111111111',
              title: title,
            ),
          ],
        });
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

    expect(find.text('Account A draft'), findsOneWidget);

    auth.setSession(
      const TravelerSession(userId: 'user-b', accessToken: 'token-b'),
    );
    await tester.pumpAndSettle();

    expect(find.text('Account A draft'), findsNothing);
    expect(find.text('Account B draft'), findsOneWidget);
    expect(listCalls, 2);

    auth.dispose();
  });

  testWidgets(
    'stale create after sign-out and same-user sign-in does not open editor',
    (tester) async {
      final createGate = Completer<void>();
      var createCalls = 0;
      final mock = MockClient((request) async {
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
        if (request.url.path.endsWith('/drafts') && request.method == 'POST') {
          createCalls += 1;
          await createGate.future;
          return _json(
            _draftJson(
              id: '11111111-1111-1111-1111-111111111111',
              title: 'Stale create',
            ),
            status: 201,
          );
        }
        return http.Response(
          'unexpected ${request.method} ${request.url}',
          500,
        );
      });

      final auth = FakeTravelerAuth(
        initial: const TravelerSession(userId: 'user-a', accessToken: 'token-a'),
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
      expect(find.byKey(const Key('build-empty')), findsOneWidget);

      await tester.tap(find.byKey(const Key('build-create')));
      await tester.pump();

      await auth.signOut();
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('build-signed-out')), findsOneWidget);

      auth.setSession(
        const TravelerSession(userId: 'user-a', accessToken: 'token-a-again'),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('build-empty')), findsOneWidget);

      createGate.complete();
      await tester.pumpAndSettle();

      expect(createCalls, 1);
      expect(find.byType(DraftEditorScreen), findsNothing);
      expect(find.byKey(const Key('build-empty')), findsOneWidget);

      auth.dispose();
    },
  );
}

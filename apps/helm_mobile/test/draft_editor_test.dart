import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/auth/traveler_session.dart';
import 'package:helm_mobile/build/draft_editor_screen.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const _draftId = '11111111-1111-1111-1111-111111111111';
const _userId = 'user-a';

Map<String, dynamic> _draftJson({String? title = 'Saved title'}) => {
      'id': _draftId,
      'destinationId': '22222222-2222-2222-2222-222222222222',
      'title': title,
      'constraints': {'party': 2},
      'status': 'draft',
      'createdAt': '2026-01-01T00:00:00.000Z',
      'updatedAt': '2026-01-02T00:00:00.000Z',
    };

http.Response _json(Object body, {int status = 200}) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

void main() {
  testWidgets('retains typed title after a failed save', (tester) async {
    var patchCalls = 0;
    final mock = MockClient((request) async {
      if (request.method == 'GET') {
        return _json(_draftJson());
      }
      if (request.method == 'PATCH') {
        patchCalls += 1;
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body.containsKey('destinationId'), isFalse);
        expect(body.containsKey('constraints'), isFalse);
        expect(body['title'], 'Edited title');
        return http.Response('save failed', 500);
      }
      return http.Response('unexpected', 500);
    });

    final auth = FakeTravelerAuth(
      initial: const TravelerSession(userId: _userId, accessToken: 'token-a'),
    );
    final client = HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

    await tester.pumpWidget(
      MaterialApp(
        home: DraftEditorScreen(
          apiClient: client,
          auth: auth,
          draftId: _draftId,
          ownerUserId: _userId,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key('draft-title-field')),
      'Edited title',
    );
    await tester.tap(find.byKey(const Key('draft-save')));
    await tester.pumpAndSettle();

    expect(patchCalls, 1);
    expect(find.byKey(const Key('draft-save-error')), findsOneWidget);
    expect(find.text('Edited title'), findsOneWidget);

    auth.dispose();
  });

  testWidgets('clears private draft state when the account changes',
      (tester) async {
    final mock = MockClient((request) async {
      if (request.method == 'GET') {
        return _json(_draftJson());
      }
      return http.Response('unexpected', 500);
    });

    final auth = FakeTravelerAuth(
      initial: const TravelerSession(userId: _userId, accessToken: 'token-a'),
    );
    final client = HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

    await tester.pumpWidget(
      MaterialApp(
        home: DraftEditorScreen(
          apiClient: client,
          auth: auth,
          draftId: _draftId,
          ownerUserId: _userId,
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Saved title'), findsOneWidget);

    auth.setSession(
      const TravelerSession(userId: 'user-b', accessToken: 'token-b'),
    );
    await tester.pumpAndSettle();

    // Account change pops the editor route (only MaterialApp remains).
    expect(find.byKey(const Key('draft-title-field')), findsNothing);
    expect(find.text('Saved title'), findsNothing);

    auth.dispose();
  });

  testWidgets('ignores late load response after the account changes',
      (tester) async {
    final gate = Completer<void>();
    final mock = MockClient((request) async {
      if (request.method == 'GET') {
        await gate.future;
        return _json(_draftJson(title: 'Private late title'));
      }
      return http.Response('unexpected', 500);
    });

    final auth = FakeTravelerAuth(
      initial: const TravelerSession(userId: _userId, accessToken: 'token-a'),
    );
    final client = HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

    await tester.pumpWidget(
      MaterialApp(
        home: DraftEditorScreen(
          apiClient: client,
          auth: auth,
          draftId: _draftId,
          ownerUserId: _userId,
        ),
      ),
    );
    await tester.pump();
    expect(find.byKey(const Key('draft-loading')), findsOneWidget);

    auth.setSession(
      const TravelerSession(userId: 'user-b', accessToken: 'token-b'),
    );
    await tester.pump();
    gate.complete();
    await tester.pumpAndSettle();

    expect(find.text('Private late title'), findsNothing);
    expect(find.byKey(const Key('draft-title-field')), findsNothing);

    auth.dispose();
  });
}

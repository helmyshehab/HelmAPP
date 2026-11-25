import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/main.dart';
import 'package:helm_mobile/tabs/discover_tab.dart';
import 'package:helm_mobile/theme/helm_wordmark.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

HelmApiClient _emptyClient() {
  final mock = MockClient((request) async {
    return http.Response(
      jsonEncode({'items': [], 'total': 0, 'limit': 20, 'offset': 0}),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
  });
  return HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);
}

void main() {
  testWidgets('HelmShell renders wordmark, Discover, and five-tab navigation',
      (tester) async {
    final auth = FakeTravelerAuth();
    addTearDown(auth.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: HelmShell(auth: auth, apiClient: _emptyClient()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(HelmWordmark), findsOneWidget);
    expect(find.byType(DiscoverTab), findsOneWidget);
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Discover'), findsWidgets);
    expect(find.text('Build'), findsOneWidget);
    expect(find.text('Packages'), findsOneWidget);
    expect(find.text('Trips'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
    expect(find.byKey(const Key('discover-empty')), findsOneWidget);
  });

  testWidgets('HelmApp boots with theme title and NavigationBar', (tester) async {
    await tester.pumpWidget(HelmApp());
    expect(find.byType(HelmWordmark), findsOneWidget);
    expect(
      tester.widget<MaterialApp>(find.byType(MaterialApp)).title,
      HelmWordmark.label,
    );
    expect(find.byType(NavigationBar), findsOneWidget);
  });
}

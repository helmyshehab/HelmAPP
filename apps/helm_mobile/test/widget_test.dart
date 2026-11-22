import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
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
  testWidgets('HelmShell renders Discover without bottom navigation',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(home: HelmShell(apiClient: _emptyClient())),
    );
    await tester.pumpAndSettle();

    expect(find.byType(HelmWordmark), findsOneWidget);
    expect(find.byType(DiscoverTab), findsOneWidget);
    expect(find.byKey(const Key('discover-empty')), findsOneWidget);

    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(BottomNavigationBar), findsNothing);
    expect(find.text('Build'), findsNothing);
    expect(find.text('Packages'), findsNothing);
    expect(find.text('Trips'), findsNothing);
    expect(find.text('Profile'), findsNothing);
  });

  testWidgets('HelmShell keeps Discover above the bottom safe area',
      (tester) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(390, 844);
    tester.view.padding = const FakeViewPadding(top: 47, bottom: 34);
    tester.view.viewPadding = const FakeViewPadding(top: 47, bottom: 34);
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(home: HelmShell(apiClient: _emptyClient())),
    );
    await tester.pumpAndSettle();

    expect(tester.getBottomLeft(find.byType(DiscoverTab)).dy, 844 - 34);
  });

  testWidgets('HelmApp boots into Discover with no bottom navigation',
      (tester) async {
    // Avoid network: pump only until first frame (loading), then dispose.
    await tester.pumpWidget(const HelmApp());
    expect(find.byType(HelmWordmark), findsOneWidget);
    expect(tester.widget<MaterialApp>(find.byType(MaterialApp)).title,
        HelmWordmark.label);
    expect(find.byKey(const Key('discover-loading')), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
  });
}

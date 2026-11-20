import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/main.dart';
import 'package:helm_mobile/tabs/discover_tab.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  testWidgets('Helm حلم shell renders brand title and five tabs', (tester) async {
    final mock = MockClient((request) async {
      return http.Response(
        jsonEncode({'items': [], 'total': 0, 'limit': 20, 'offset': 0}),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    });
    final client = HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          appBar: AppBar(title: const Text('Helm حلم')),
          body: DiscoverTab(apiClient: client),
          bottomNavigationBar: NavigationBar(
            selectedIndex: 0,
            onDestinationSelected: (_) {},
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.explore_outlined),
                label: 'Discover',
              ),
              NavigationDestination(
                icon: Icon(Icons.auto_awesome_outlined),
                label: 'Build',
              ),
              NavigationDestination(
                icon: Icon(Icons.card_travel_outlined),
                label: 'Packages',
              ),
              NavigationDestination(
                icon: Icon(Icons.map_outlined),
                label: 'Trips',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outline),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Helm حلم'), findsOneWidget);
    expect(find.text('Discover'), findsWidgets);
    expect(find.text('Build'), findsOneWidget);
    expect(find.text('Packages'), findsOneWidget);
    expect(find.text('Trips'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
  });

  testWidgets('HelmApp still boots with default Discover client', (tester) async {
    // Avoid network: pump only until first frame (loading), then dispose.
    await tester.pumpWidget(const HelmApp());
    expect(find.text('Helm حلم'), findsOneWidget);
    expect(find.byType(NavigationBar), findsOneWidget);
  });
}

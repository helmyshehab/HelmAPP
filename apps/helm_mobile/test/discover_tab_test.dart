import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/tabs/discover_tab.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Widget _wrap(Widget child) {
  return MaterialApp(home: Scaffold(body: child));
}

HelmApiClient _client(MockClient mock) =>
    HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

/// UTF-8 JSON body — charset header selects utf8 (http 1.2.2 has no encoding:).
http.Response _jsonOk(Object body) => http.Response(
      jsonEncode(body),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

void main() {
  testWidgets('Discover shows loading while destinations request is in flight',
      (tester) async {
    final gate = Completer<void>();
    final mock = MockClient((request) async {
      await gate.future;
      return _jsonOk({'items': [], 'total': 0, 'limit': 20, 'offset': 0});
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    expect(find.byKey(const Key('discover-loading')), findsOneWidget);

    gate.complete();
    await tester.pumpAndSettle();
  });

  testWidgets('Discover shows empty state when API returns no items',
      (tester) async {
    final mock = MockClient((request) async {
      return _jsonOk({'items': [], 'total': 0, 'limit': 20, 'offset': 0});
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-empty')), findsOneWidget);
    expect(find.text('No destinations yet'), findsOneWidget);
  });

  testWidgets('Discover shows failure with Retry and reloads on tap',
      (tester) async {
    var calls = 0;
    final mock = MockClient((request) async {
      calls += 1;
      if (calls == 1) {
        return http.Response('boom', 500);
      }
      return _jsonOk({
        'items': [
          {
            'id': '11111111-1111-1111-1111-111111111111',
            'slug': 'ubud',
            'nameEn': 'Ubud',
            'nameAr': 'أبود',
            'summaryEn': 'Cultural heart of Bali',
            'summaryAr': null,
            'countryCode': 'ID',
            'status': 'published',
          },
        ],
        'total': 1,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-failure')), findsOneWidget);
    expect(find.byKey(const Key('discover-retry')), findsOneWidget);

    await tester.tap(find.byKey(const Key('discover-retry')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-list')), findsOneWidget);
    expect(find.text('Ubud'), findsOneWidget);
    expect(find.text('Cultural heart of Bali'), findsOneWidget);
    expect(calls, 2);
  });

  testWidgets('Discover lists destination names and available summaries',
      (tester) async {
    final mock = MockClient((request) async {
      expect(request.url.path, '/v1/destinations');
      return _jsonOk({
        'items': [
          {
            'id': '11111111-1111-1111-1111-111111111111',
            'slug': 'ubud',
            'nameEn': 'Ubud',
            'nameAr': 'أبود',
            'summaryEn': 'Cultural heart of Bali',
            'summaryAr': null,
            'countryCode': 'ID',
            'status': 'published',
          },
          {
            'id': '22222222-2222-2222-2222-222222222222',
            'slug': 'canggu',
            'nameEn': 'Canggu',
            'nameAr': 'تشانغو',
            'summaryEn': null,
            'summaryAr': null,
            'countryCode': 'ID',
            'status': 'published',
          },
        ],
        'total': 2,
        'limit': 20,
        'offset': 0,
      });
    });

    await tester.pumpWidget(_wrap(DiscoverTab(apiClient: _client(mock))));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('discover-list')), findsOneWidget);
    expect(find.text('Ubud'), findsOneWidget);
    expect(find.text('Cultural heart of Bali'), findsOneWidget);
    expect(find.text('Canggu'), findsOneWidget);
  });
}

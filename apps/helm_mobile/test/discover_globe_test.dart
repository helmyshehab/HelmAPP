import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/discover/destination_list_item.dart';
import 'package:helm_mobile/discover/discover_globe.dart';
import 'package:helm_mobile/discover/globe_destinations.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Widget _wrap(Widget child) {
  return MaterialApp(
    home: Scaffold(body: SingleChildScrollView(child: child)),
  );
}

HelmApiClient _client(MockClient mock) =>
    HelmApiClient(baseUrl: 'https://api.test', httpClient: mock);

void main() {
  test('DestinationListItem parses plottable coordinates', () {
    final item = DestinationListItem.fromJson({
      'id': '11111111-1111-1111-1111-111111111111',
      'slug': 'ubud',
      'nameEn': 'Ubud',
      'latitude': -8.5069,
      'longitude': 115.2625,
      'status': 'published',
    });
    expect(item.hasPlottableCoordinates, isTrue);
    expect(withPlottableCoordinates([item]), hasLength(1));
  });

  test('DestinationListItem rejects missing or out-of-range coordinates', () {
    final missing = DestinationListItem.fromJson({
      'id': '11111111-1111-1111-1111-111111111111',
      'slug': 'ubud',
      'nameEn': 'Ubud',
      'status': 'published',
    });
    final bad = DestinationListItem.fromJson({
      'id': '22222222-2222-2222-2222-222222222222',
      'slug': 'bad',
      'nameEn': 'Bad',
      'latitude': 120,
      'longitude': 0,
      'status': 'published',
    });
    expect(missing.hasPlottableCoordinates, isFalse);
    expect(bad.hasPlottableCoordinates, isFalse);
    expect(withPlottableCoordinates([missing, bad]), isEmpty);
  });

  testWidgets(
      'DiscoverGlobe picker focuses without navigating or showing preview',
      (tester) async {
    // flutter_globe keeps a ticker alive; disable animations and avoid settle.
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);

    final mock = MockClient((request) async {
      fail('Should not fetch when catalogComplete seed is provided');
    });
    final seed = [
      DestinationListItem.fromJson({
        'id': '11111111-1111-1111-1111-111111111111',
        'slug': 'ubud',
        'nameEn': 'Ubud',
        'summaryEn': 'Cultural heart of Bali',
        'countryCode': 'ID',
        'latitude': -8.5069,
        'longitude': 115.2625,
        'tags': ['culture', 'nature', 'food', 'extra'],
        'status': 'published',
      }),
    ];

    var exploreCalls = 0;
    await tester.pumpWidget(
      _wrap(
        DiscoverGlobe(
          apiClient: _client(mock),
          seedItems: seed,
          catalogComplete: true,
          onExplore: (_) => exploreCalls++,
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byKey(DiscoverGlobe.canvasKey), findsOneWidget);
    expect(find.byKey(const Key('discover-globe-picker')), findsOneWidget);

    await tester.tap(find.byKey(const Key('discover-globe-picker')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.tap(find.text('Ubud').last);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(exploreCalls, 0);
    expect(find.text('Expand'), findsNothing);
    expect(find.text('Explore'), findsNothing);
    expect(find.text('Close'), findsNothing);
    expect(find.text('Cultural heart of Bali'), findsNothing);
    expect(find.byKey(DiscoverGlobe.canvasKey), findsOneWidget);
  });

  testWidgets('DiscoverGlobe stays fail-soft when catalog fetch fails',
      (tester) async {
    final mock = MockClient((request) async {
      return http.Response('boom', 500);
    });

    await tester.pumpWidget(
      _wrap(
        DiscoverGlobe(
          apiClient: _client(mock),
          catalogComplete: false,
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byKey(DiscoverGlobe.statusKey), findsOneWidget);
    expect(
      find.textContaining('globe is unavailable'),
      findsOneWidget,
    );
    expect(find.byKey(DiscoverGlobe.canvasKey), findsNothing);
  });
}

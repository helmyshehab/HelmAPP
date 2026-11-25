import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/auth/traveler_session.dart';
import 'package:helm_mobile/tabs/build_tab.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response _json(Object body, {int status = 200}) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

String _estimateTotal(WidgetTester tester) {
  return tester
      .widget<Text>(find.byKey(const Key('trip-preview-estimate-total')))
      .data!;
}

Finder _previewScrollable() => find
    .descendant(
      of: find.byKey(const Key('trip-preview')),
      matching: find.byType(Scrollable),
    )
    .first;

void main() {
  testWidgets(
    'preview estimate updates when flight hotel and activity change',
    (tester) async {
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

      expect(
          find.byKey(const Key('trip-preview-estimate-total')), findsOneWidget);
      expect(_estimateTotal(tester), '60500 EGP');

      String optionPrice(String key) {
        final tile = tester.widget<RadioListTile<String>>(find.byKey(Key(key)));
        return (tile.subtitle! as Text).data!;
      }

      expect(optionPrice('trip-flight-flexible-example'),
          contains('53000 EGP for the group · +16000 EGP to trip total'));
      expect(optionPrice('trip-hotel-ubud-swasti-eco-cottages'),
          contains('9000 EGP for the stay · −10600 EGP to trip total'));

      Future<void> tapPreviewKey(Key key) async {
        await tester.scrollUntilVisible(
          find.byKey(key),
          200,
          scrollable: _previewScrollable(),
        );
        await tester.tap(find.byKey(key));
        await tester.pumpAndSettle();
      }

      await tapPreviewKey(const Key('trip-flight-flexible-example'));
      expect(_estimateTotal(tester), '76500 EGP');
      expect(optionPrice('trip-flight-economy-example'),
          contains('37000 EGP for the group · −16000 EGP to trip total'));

      await tapPreviewKey(const Key('trip-hotel-ubud-swasti-eco-cottages'));
      // Flexible flight + base lodging for 2 nights.
      expect(_estimateTotal(tester), '65900 EGP');
      expect(optionPrice('trip-hotel-ubud-komaneka-bisma'),
          contains('19600 EGP for the stay · +10600 EGP to trip total'));
      expect(optionPrice('trip-hotel-ubud-village-hotel'),
          contains('9000 EGP for the stay · No change to trip total'));

      const activitySlug = 'ubud-sacred-monkey-forest';
      const detailsKey = Key('trip-activity-details-$activitySlug');
      await tapPreviewKey(detailsKey);
      expect(find.text('Padangtegal, Ubud'), findsOneWidget);
      expect(find.textContaining('long-tailed macaques'), findsOneWidget);
      expect(find.textContaining('Confirm the duration, meeting point'),
          findsOneWidget);
      expect(_estimateTotal(tester), '65900 EGP');
      await tapPreviewKey(detailsKey);
      await tapPreviewKey(Key('trip-activity-remove-$activitySlug'));
      expect(_estimateTotal(tester), '65200 EGP');

      await tapPreviewKey(Key('trip-activity-add-$activitySlug'));
      expect(_estimateTotal(tester), '65900 EGP');

      await tester.scrollUntilVisible(
        find.byKey(const Key('trip-preview-estimate-total')),
        -300,
        scrollable: _previewScrollable(),
      );
      expect(find.textContaining('Demo price estimate'), findsOneWidget);
      expect(find.textContaining('Excluded from this demo estimate'),
          findsOneWidget);

      auth.dispose();
    },
  );
}

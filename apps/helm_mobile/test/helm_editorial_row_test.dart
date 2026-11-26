import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/discover/destination_card.dart';
import 'package:helm_mobile/discover/destination_list_item.dart';
import 'package:helm_mobile/widgets/helm_editorial_row.dart';

import 'support/test_network_images.dart';

void main() {
  test('helmResolvableMediaUrl accepts only http(s) URLs with a host', () {
    expect(helmResolvableMediaUrl(null), isFalse);
    expect(helmResolvableMediaUrl(''), isFalse);
    expect(helmResolvableMediaUrl('  '), isFalse);
    expect(helmResolvableMediaUrl('/local/path.jpg'), isFalse);
    expect(helmResolvableMediaUrl('ftp://example.com/a.jpg'), isFalse);
    expect(helmResolvableMediaUrl('https://cdn.example.com/a.jpg'), isTrue);
    expect(helmResolvableMediaUrl('http://cdn.example.com/a.jpg'), isTrue);
  });

  testWidgets('omits image frame when imageUrl is absent', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: HelmEditorialRow(
            title: 'Ubud',
            meta: 'Indonesia',
            body: 'Cultural heart of Bali',
            onTap: () {},
          ),
        ),
      ),
    );

    expect(find.byType(Image), findsNothing);
    expect(find.text('Ubud'), findsOneWidget);
    expect(find.text('Indonesia'), findsOneWidget);
    expect(find.byIcon(Icons.chevron_right), findsOneWidget);
  });

  testWidgets('omits image frame when imageUrl is invalid', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: HelmEditorialRow(
            title: 'Ubud',
            imageUrl: 'not-a-url',
            imageAlt: 'Should not render',
            onTap: () {},
          ),
        ),
      ),
    );

    expect(find.byType(Image), findsNothing);
  });

  testWidgets('shows cover image with accessible alt and keeps row tappable',
      (tester) async {
    await withTestNetworkImages(() async {
      var taps = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: HelmEditorialRow(
              rowKey: const Key('row'),
              title: 'Ubud',
              imageUrl: 'https://cdn.example.com/ubud.jpg',
              imageAlt: 'Rice terraces near Ubud',
              onTap: () => taps += 1,
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.byType(Image), findsOneWidget);
      final image = tester.widget<Image>(find.byType(Image));
      expect(image.fit, BoxFit.cover);
      expect(image.semanticLabel, 'Rice terraces near Ubud');

      await tester.tap(find.byKey(const Key('row')));
      expect(taps, 1);
    });
  });

  testWidgets('failed network image falls back to text-only row', (tester) async {
    await withTestNetworkImages(() async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: HelmEditorialRow(
              title: 'Ubud',
              imageUrl: 'https://broken.example/missing.jpg',
              imageAlt: 'Missing cover',
              onTap: () {},
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.byType(Image), findsNothing);
      expect(find.text('Ubud'), findsOneWidget);
      expect(tester.takeException(), isNull);
    }, failHosts: {'broken.example'});
  });

  testWidgets('DestinationCard passes cover from list item', (tester) async {
    await withTestNetworkImages(() async {
      final item = DestinationListItem(
        id: '1',
        slug: 'ubud',
        nameEn: 'Ubud',
        nameAr: 'أبود',
        coverImageUrl: 'https://cdn.example.com/ubud.jpg',
        coverAltEn: 'Rice terraces',
        coverAltAr: 'مدرجات الأرز',
      );

      await tester.pumpWidget(
        MaterialApp(
          locale: const Locale('en'),
          home: Scaffold(
            body: DestinationCard(
              item: item,
              onTap: () {},
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.byType(Image), findsOneWidget);
      expect(
        tester.widget<Image>(find.byType(Image)).semanticLabel,
        'Rice terraces',
      );
      expect(find.byKey(const Key('discover-item-ubud')), findsOneWidget);
    });
  });

  testWidgets('DestinationCard uses Arabic cover alt for ar locale',
      (tester) async {
    await withTestNetworkImages(() async {
      final item = DestinationListItem(
        id: '1',
        slug: 'ubud',
        nameEn: 'Ubud',
        coverImageUrl: 'https://cdn.example.com/ubud.jpg',
        coverAltEn: 'Rice terraces',
        coverAltAr: 'مدرجات الأرز',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Localizations(
            locale: const Locale('ar'),
            delegates: const <LocalizationsDelegate<dynamic>>[
              DefaultWidgetsLocalizations.delegate,
              DefaultMaterialLocalizations.delegate,
            ],
            child: Scaffold(
              body: DestinationCard(
                item: item,
                onTap: () {},
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(
        tester.widget<Image>(find.byType(Image)).semanticLabel,
        'مدرجات الأرز',
      );
    });
  });

  testWidgets('row tap invokes onTap', (tester) async {
    var taps = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: HelmEditorialRow(
            key: const Key('row'),
            title: 'Canggu',
            onTap: () => taps += 1,
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const Key('row')));
    expect(taps, 1);
  });
}

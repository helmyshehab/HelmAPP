import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/discover/destination_list_item.dart';

void main() {
  test('parseItems maps name and summaries; availableSummary prefers English', () {
    final items = DestinationListItem.parseItems({
      'items': [
        {
          'id': '1',
          'slug': 'ubud',
          'nameEn': 'Ubud',
          'nameAr': 'أبود',
          'summaryEn': ' English summary ',
          'summaryAr': 'ملخص',
        },
        {
          'id': '2',
          'slug': 'canggu',
          'nameEn': 'Canggu',
          'summaryEn': null,
          'summaryAr': ' ملخص عربي ',
        },
        {
          'id': '3',
          'slug': 'smoke',
          'nameEn': 'Smoke',
          'summaryEn': null,
          'summaryAr': null,
        },
      ],
    });

    expect(items.length, 3);
    expect(items[0].nameEn, 'Ubud');
    expect(items[0].availableSummary, 'English summary');
    expect(items[1].availableSummary, 'ملخص عربي');
    expect(items[2].availableSummary, isNull);
  });

  test('parseItems maps optional cover and stays compatible when cover is absent',
      () {
    final items = DestinationListItem.parseItems({
      'items': [
        {
          'id': '1',
          'slug': 'ubud',
          'nameEn': 'Ubud',
          'nameAr': 'أبود',
          'countryCode': 'ID',
          'status': 'published',
          'cover': {
            'url': ' https://cdn.example.com/ubud.jpg ',
            'altTextEn': ' Rice terraces ',
            'altTextAr': ' مدرجات الأرز ',
          },
        },
        {
          'id': '2',
          'slug': 'istanbul',
          'nameEn': 'Istanbul',
          'countryCode': 'TR',
          'status': 'published',
        },
        {
          'id': '3',
          'slug': 'smoke',
          'nameEn': 'Smoke',
          'status': 'published',
          'cover': null,
        },
        {
          'id': '4',
          'slug': 'broken-shape',
          'nameEn': 'Broken',
          'status': 'published',
          'cover': 'not-a-map',
        },
      ],
    });

    expect(items[0].coverImageUrl, 'https://cdn.example.com/ubud.jpg');
    expect(items[0].coverAltEn, 'Rice terraces');
    expect(items[0].coverAltAr, 'مدرجات الأرز');
    expect(items[0].availableCoverAlt, 'Rice terraces');
    expect(items[0].coverAltForLanguage('ar'), 'مدرجات الأرز');
    expect(items[0].coverAltForLanguage('en'), 'Rice terraces');

    expect(items[1].coverImageUrl, isNull);
    expect(items[1].availableCoverAlt, isNull);
    expect(items[2].coverImageUrl, isNull);
    expect(items[3].coverImageUrl, isNull);
  });

  test('coverAltForLanguage falls back across languages', () {
    final enOnly = DestinationListItem(
      id: '1',
      slug: 'a',
      nameEn: 'A',
      coverAltEn: 'English only',
    );
    expect(enOnly.coverAltForLanguage('ar'), 'English only');

    final arOnly = DestinationListItem(
      id: '2',
      slug: 'b',
      nameEn: 'B',
      coverAltAr: 'عربي فقط',
    );
    expect(arOnly.coverAltForLanguage('en'), 'عربي فقط');
    expect(arOnly.availableCoverAlt, 'عربي فقط');
  });
}

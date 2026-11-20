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
}

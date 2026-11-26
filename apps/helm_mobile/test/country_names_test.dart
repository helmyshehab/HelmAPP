import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/geo/country_names.dart';

void main() {
  test('parseCountryNames maps code to nameEn and skips incomplete rows', () {
    final names = parseCountryNames({
      'items': [
        {'code': 'id', 'nameEn': 'Indonesia'},
        {'code': 'TH', 'nameEn': '  Thailand  '},
        {'code': 'XX', 'nameEn': ''},
        {'code': '', 'nameEn': 'Nowhere'},
        {'nameEn': 'Missing code'},
        'skip',
      ],
      'total': 6,
      'limit': 100,
      'offset': 0,
    });

    expect(names, {'ID': 'Indonesia', 'TH': 'Thailand'});
  });

  test('parseCountryNames returns empty for non-list payloads', () {
    expect(parseCountryNames({'items': null}), isEmpty);
    expect(parseCountryNames({}), isEmpty);
  });
}

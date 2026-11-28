import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/tabs/packages_tab.dart' as packages_tab;

void main() {
  test('published package cover is parsed from API JSON', () {
    const json = {
      'id': 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'slug': 'ubud-culture',
      'titleEn': 'Ubud culture week',
      'summaryEn': 'A curated week in Ubud.',
      'content': {
        'kind': 'ubud_trip_preview',
        'version': 1,
        'answers': {
          'budgetEgp': 85000,
          'destination': 'ubud',
          'travelerCount': 2,
          'lifestyle': 'culture',
          'nights': 2,
          'amenities': <String>['Pool'],
        },
        'selections': {
          'flightId': 'economy-example',
          'hotelSlug': 'ubud-village-hotel',
          'includedActivitySlugs': <String>['ubud-sacred-monkey-forest'],
        },
        'itinerary': {
          'days': [
            {
              'dayNumber': 1,
              'stopSlugs': <String>['ubud-sacred-monkey-forest'],
            },
            {'dayNumber': 2, 'stopSlugs': <String>['ubud-moksa']},
          ],
        },
      },
      'cover': {
        'url': 'https://cdn.example.com/package-cover.jpg',
        'altTextEn': 'Rice terraces at sunrise',
      },
    };

    final idea = packages_tab.debugTryParsePackageIdea(json);
    expect(idea, isNotNull);
    expect(idea!.coverUrl, 'https://cdn.example.com/package-cover.jpg');
    expect(idea.coverAltEn, 'Rice terraces at sunrise');
  });

  test('cover is omitted without resolvable url and alt', () {
    const json = {
      'id': 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'titleEn': 'Ubud culture week',
      'content': {
        'kind': 'ubud_trip_preview',
        'version': 1,
        'answers': {
          'budgetEgp': 85000,
          'destination': 'ubud',
          'travelerCount': 2,
          'lifestyle': 'culture',
          'nights': 2,
          'amenities': <String>['Pool'],
        },
        'selections': {
          'flightId': 'economy-example',
          'hotelSlug': 'ubud-village-hotel',
          'includedActivitySlugs': <String>['ubud-sacred-monkey-forest'],
        },
        'itinerary': {
          'days': [
            {
              'dayNumber': 1,
              'stopSlugs': <String>['ubud-sacred-monkey-forest'],
            },
          ],
        },
      },
      'cover': {'url': '/relative.jpg'},
    };

    final idea = packages_tab.debugTryParsePackageIdea(json);
    expect(idea, isNotNull);
    expect(idea!.coverUrl, isNull);
  });
}
import 'dart:convert';

import 'package:helm_mobile/build/trip_gen/istanbul_demo_catalog.dart';
import 'package:helm_mobile/build/trip_gen/ubud_demo_catalog.dart';
import 'package:http/http.dart' as http;

http.Response publishedUbudFixture({Set<String>? slugs}) {
  final catalog = [...ubudDemoPlaces, ...istanbulDemoPlaces];
  final items = [
    for (final place in catalog)
      if (slugs == null || slugs.contains(place.slug))
        {
          'id': place.slug,
          'slug': place.slug,
          'nameEn': place.nameEn,
          'category': place.category,
        },
  ];
  return http.Response(
    jsonEncode({'items': items, 'total': items.length, 'offset': 0}),
    200,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );
}

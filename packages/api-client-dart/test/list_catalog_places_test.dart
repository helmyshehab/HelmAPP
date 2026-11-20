import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:test/test.dart';

import 'package:helm_api_client/helm_api_client.dart';

void main() {
  group('listCatalogPlaces destinationSlug', () {
    test('sends destinationSlug=ubud in the query string when provided', () async {
      late Uri captured;
      final mock = MockClient((request) async {
        captured = request.url;
        return http.Response(
          '{"items":[],"total":0}',
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      final client = HelmApiClient(
        baseUrl: 'https://api.example.com',
        httpClient: mock,
      );

      await client.listCatalogPlaces(destinationSlug: 'ubud');

      expect(captured.path, '/v1/catalog/places');
      expect(captured.queryParameters['destinationSlug'], 'ubud');
    });

    test(
        'sends destinationSlug, limit, and offset together (including offset 0)',
        () async {
      late Uri captured;
      final mock = MockClient((request) async {
        captured = request.url;
        return http.Response(
          '{"items":[],"total":0}',
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      final client = HelmApiClient(
        baseUrl: 'https://api.example.com',
        httpClient: mock,
      );

      await client.listCatalogPlaces(
        destinationSlug: 'ubud',
        limit: 10,
        offset: 0,
      );

      expect(captured.path, '/v1/catalog/places');
      expect(captured.queryParameters['destinationSlug'], 'ubud');
      expect(captured.queryParameters['limit'], '10');
      expect(captured.queryParameters['offset'], '0');
    });

    test('omits destinationSlug and pagination from the query when not provided',
        () async {
      late Uri captured;
      final mock = MockClient((request) async {
        captured = request.url;
        return http.Response(
          '{"items":[],"total":0}',
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      final client = HelmApiClient(
        baseUrl: 'https://api.example.com',
        httpClient: mock,
      );

      await client.listCatalogPlaces();

      expect(captured.path, '/v1/catalog/places');
      expect(captured.queryParameters.containsKey('destinationSlug'), isFalse);
      expect(captured.queryParameters.containsKey('limit'), isFalse);
      expect(captured.queryParameters.containsKey('offset'), isFalse);
      expect(captured.query, isEmpty);
    });
  });
}

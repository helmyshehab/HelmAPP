import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/build/trip_gen/ubud_demo_catalog.dart';
import 'package:helm_mobile/main.dart' show HelmShell;
import 'package:helm_mobile/theme/helm_theme.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  final auth = FakeTravelerAuth();
  final api = HelmApiClient(
    baseUrl: 'https://helm-demo.invalid',
    httpClient: MockClient(_DemoApi(auth).handle),
  );
  runApp(MaterialApp(
    title: 'HELM local demo',
    theme: HelmTheme.light(),
    darkTheme: HelmTheme.dark(),
    builder: kIsWeb
        ? (context, child) => ColoredBox(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Center(child: SizedBox(width: 440, child: child)),
            )
        : null,
    home: HelmShell(auth: auth, apiClient: api),
  ));
}

class _DemoApi {
  _DemoApi(this.auth);

  static const _destination = {
    'id': 'd1f3cc7e-7aea-403a-b27f-0eb8648737b1',
    'slug': 'ubud',
    'nameEn': 'Ubud',
    'nameAr': 'أوبود',
    'countryCode': 'ID',
    'status': 'published',
    'summaryEn':
        'Bali’s cultural heart, with rice terraces, temples, and cafes.',
    'descriptionEn':
        'Explore central Bali from Ubud, with day trips and time to unwind.',
    'tags': ['culture', 'nature', 'wellness'],
    'latitude': -8.5069,
    'longitude': 115.2625,
  };
  static const _draftPath = '/v1/trips/drafts';

  final FakeTravelerAuth auth;
  final _draftsByOwner = <String, Map<String, Map<String, dynamic>>>{};

  Future<http.Response> handle(http.Request request) async {
    final path = request.url.path;
    final query = request.url.queryParameters;
    if (request.method == 'GET') {
      switch (path) {
        case '/v1/destinations':
          final search = query['q']?.trim().toLowerCase() ?? '';
          final country = query['country'];
          return _page(query, [
            if ((country == null || country == 'ID') &&
                ('ubud'.contains(search) || 'أوبود'.contains(search)))
              _destination,
          ]);
        case '/v1/destinations/ubud':
          return _json(_destination);
        case '/v1/catalog/places':
          return _page(query, [
            if (query['destinationSlug'] == 'ubud')
              for (final place in ubudDemoPlaces)
                {
                  'id': place.slug,
                  'slug': place.slug,
                  'nameEn': place.nameEn,
                  'category': place.category,
                  'shortDescriptionEn': place.shortDescriptionEn,
                },
          ]);
      }
    }

    final session = auth.session;
    if (session == null ||
        request.headers['authorization'] != 'Bearer ${session.accessToken}') {
      return _json({'title': 'Unauthorized'}, statusCode: 401);
    }
    if (path == '/v1/customer/profile/bootstrap' && request.method == 'POST') {
      return _json({
        'userId': session.userId,
        'accountStatus': 'active',
        'preferredLocale': 'en',
        'preferredCurrency': 'EGP',
        'accountCreated': false,
        'profileCreated': false,
      });
    }

    final drafts = _draftsByOwner.putIfAbsent(session.userId, () => {});
    if (path == _draftPath) {
      if (request.method == 'GET') {
        return _json({'items': drafts.values.toList()});
      }
      if (request.method == 'POST') {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        final requestKey = body['clientRequestKey'];
        for (final draft in drafts.values) {
          if (requestKey != null && draft['clientRequestKey'] == requestKey) {
            return _json(draft, statusCode: 201);
          }
        }
        final id = 'demo-draft-${drafts.length + 1}';
        final now = DateTime.now().toUtc().toIso8601String();
        final draft = {
          ...body,
          'id': id,
          'status': 'draft',
          'createdAt': now,
          'updatedAt': now,
        };
        drafts[id] = draft;
        return _json(draft, statusCode: 201);
      }
    }
    if (path.startsWith('$_draftPath/')) {
      final draft = drafts[request.url.pathSegments.last];
      if (draft != null) {
        if (request.method == 'GET') return _json(draft);
        if (request.method == 'PATCH') {
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          draft.addAll(body);
          draft['updatedAt'] = DateTime.now().toUtc().toIso8601String();
          return _json(draft);
        }
      }
    }
    return _json({'title': 'Not found'}, statusCode: 404);
  }
}

http.Response _page(Map<String, String> query, List<Object> items) {
  final offset = int.tryParse(query['offset'] ?? '') ?? 0;
  final limit = int.tryParse(query['limit'] ?? '') ?? 20;
  return _json({
    'items': items.skip(offset).take(limit).toList(),
    'total': items.length,
    'limit': limit,
    'offset': offset,
  });
}

http.Response _json(Object body, {int statusCode = 200}) => http.Response(
      jsonEncode(body),
      statusCode,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/build/trip_gen/trip_demo_pricing.dart';
import 'package:helm_mobile/build/trip_gen/trip_preview_draft.dart';
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
  final _bookingsByOwner = <String, Map<String, Map<String, dynamic>>>{};

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
    if (path == '/v1/trips/demo-bookings') {
      final bookings = _bookingsByOwner.putIfAbsent(session.userId, () => {});
      if (request.method == 'GET') {
        return _json({'items': bookings.values.toList().reversed.toList()});
      }
      if (request.method == 'POST') {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        final draft = drafts[body['draftId']];
        if (draft == null) {
          return _json({'title': 'Draft not found'}, statusCode: 404);
        }
        final quoteId = body['quoteId'] as String;
        final existing = bookings[quoteId];
        if (existing != null && existing['draftId'] == draft['id']) {
          return _json(existing, statusCode: 201);
        }
        final quote = draft['demoQuote'] as Map<String, dynamic>?;
        if (quote == null ||
            quote['id'] != quoteId ||
            !DateTime.parse(quote['expiresAt'] as String)
                .isAfter(DateTime.now())) {
          return _json({'title': 'Request a current quote'}, statusCode: 409);
        }
        final booking = {
          'id': 'demo-booking-${bookings.length + 1}',
          'draftId': draft['id'],
          'title': draft['title'],
          'status': 'pending_confirmation',
          'quote': quote,
          'constraints': draft['constraints'],
          'createdAt': DateTime.now().toUtc().toIso8601String(),
        };
        bookings[quoteId] = booking;
        return _json(booking, statusCode: 201);
      }
    }
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
      final segments = request.url.pathSegments;
      final draft = drafts[segments[3]];
      if (draft != null) {
        if (segments.length == 5 && segments.last == 'quote') {
          if (request.method == 'POST') {
            final body = request.body.isEmpty
                ? const <String, dynamic>{}
                : jsonDecode(request.body) as Map<String, dynamic>;
            final expected = body['expectedConstraints'];
            if (expected != null &&
                jsonEncode(expected) != jsonEncode(draft['constraints'])) {
              return _json({'title': 'The saved draft changed'},
                  statusCode: 409);
            }
            return _createQuote(draft);
          }
          final quote = draft['demoQuote'] as Map<String, dynamic>?;
          if (request.method == 'GET' &&
              quote != null &&
              DateTime.parse(quote['expiresAt'] as String)
                  .isAfter(DateTime.now())) {
            return _json(quote);
          }
          return _json({'title': 'Current quote not found'}, statusCode: 404);
        }
        if (request.method == 'GET') return _json(draft);
        if (request.method == 'PATCH') {
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          draft.addAll(body);
          draft.remove('demoQuote');
          draft['updatedAt'] = DateTime.now().toUtc().toIso8601String();
          return _json(draft);
        }
      }
    }
    return _json({'title': 'Not found'}, statusCode: 404);
  }

  http.Response _createQuote(Map<String, dynamic> draft) {
    final constraints = draft['constraints'] as Map<String, dynamic>?;
    final snapshot =
        constraints == null ? null : tryParseUbudTripPreviewDraft(constraints);
    final flight = snapshot == null ? null : demoFlightById(snapshot.flightId);
    final hotel = snapshot == null ? null : demoHotelBySlug(snapshot.hotelSlug);
    if (snapshot == null || flight == null || hotel == null) {
      return _json({'title': 'Draft has no quoteable selections'},
          statusCode: 400);
    }
    final travelers = snapshot.answers.travelerCount!;
    final nights = snapshot.answers.nights!;
    final estimate = calculateTripDemoEstimate(
      travelerCount: travelers,
      nights: nights,
      budgetEgp: snapshot.answers.budgetEgp!,
      flight: flight,
      hotelTier: hotel.tier,
      selectedActivityRatesPerTraveler: snapshot.includedActivitySlugs.map(
        (slug) => demoActivityRateForSlug(slug) ?? 0,
      ),
    );
    final now = DateTime.now().toUtc();
    final id = draft['id'];
    final quote = {
      'id': '$id-quote-${now.microsecondsSinceEpoch}',
      'draftId': id,
      'currency': 'EGP',
      'source': 'demo',
      'rateVersion': 'ubud-demo-v1',
      'travelerCount': travelers,
      'nights': nights,
      'flightTotalEgp': estimate.flightTotalEgp,
      'lodgingTotalEgp': estimate.lodgingTotalEgp,
      'activitiesTotalEgp': estimate.activitiesTotalEgp,
      'totalEgp': estimate.totalEgp,
      'createdAt': now.toIso8601String(),
      'expiresAt': now.add(const Duration(minutes: 30)).toIso8601String(),
    };
    draft['demoQuote'] = quote;
    return _json(quote, statusCode: 201);
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

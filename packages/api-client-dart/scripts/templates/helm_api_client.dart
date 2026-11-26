// DO NOT EDIT.
// Generated from packages/openapi/openapi.yaml
// Run: pnpm --filter @helm/api-client-dart codegen

import 'dart:convert';
import 'package:http/http.dart' as http;

class HealthResponse {
  HealthResponse({required this.status, required this.service, this.timestamp});
  final String status;
  final String service;
  final String? timestamp;

  factory HealthResponse.fromJson(Map<String, dynamic> json) => HealthResponse(
        status: json['status'] as String,
        service: json['service'] as String,
        timestamp: json['timestamp'] as String?,
      );
}

class ReadyResponse {
  ReadyResponse({
    required this.status,
    required this.service,
    required this.checks,
    this.detail,
    this.timestamp,
  });
  final String status;
  final String service;
  final Map<String, dynamic> checks;
  final String? detail;
  final String? timestamp;

  factory ReadyResponse.fromJson(Map<String, dynamic> json) => ReadyResponse(
        status: json['status'] as String,
        service: json['service'] as String,
        checks: Map<String, dynamic>.from(json['checks'] as Map),
        detail: json['detail'] as String?,
        timestamp: json['timestamp'] as String?,
      );
}

class MetaResponse {
  MetaResponse({required this.name, required this.version, required this.apiVersion});
  final String name;
  final String version;
  final String apiVersion;

  factory MetaResponse.fromJson(Map<String, dynamic> json) => MetaResponse(
        name: json['name'] as String,
        version: json['version'] as String,
        apiVersion: json['apiVersion'] as String,
      );
}

class MeResponse {
  MeResponse({required this.userId, required this.roles, required this.rolesSource, this.email});
  final String userId;
  final String? email;
  final List<String> roles;
  final String rolesSource;

  factory MeResponse.fromJson(Map<String, dynamic> json) => MeResponse(
        userId: json['userId'] as String,
        email: json['email'] as String?,
        roles: (json['roles'] as List<dynamic>).map((e) => e as String).toList(),
        rolesSource: json['rolesSource'] as String? ?? 'fallback',
      );
}

class BootstrapCustomerProfileResponse {
  BootstrapCustomerProfileResponse({
    required this.userId,
    required this.accountStatus,
    required this.preferredLocale,
    required this.preferredCurrency,
    required this.accountCreated,
    required this.profileCreated,
    this.email,
    this.displayName,
  });
  final String userId;
  final String? email;
  final String accountStatus;
  final String? displayName;
  final String preferredLocale;
  final String preferredCurrency;
  final bool accountCreated;
  final bool profileCreated;

  factory BootstrapCustomerProfileResponse.fromJson(Map<String, dynamic> json) =>
      BootstrapCustomerProfileResponse(
        userId: json['userId'] as String,
        email: json['email'] as String?,
        accountStatus: json['accountStatus'] as String,
        displayName: json['displayName'] as String?,
        preferredLocale: json['preferredLocale'] as String,
        preferredCurrency: json['preferredCurrency'] as String,
        accountCreated: json['accountCreated'] as bool,
        profileCreated: json['profileCreated'] as bool,
      );
}

class TripDraft {
  TripDraft({
    required this.id,
    required this.constraints,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.destinationId,
    this.title,
  });
  final String id;
  final String? destinationId;
  final String? title;
  final Map<String, dynamic> constraints;
  final String status;
  final String createdAt;
  final String updatedAt;

  factory TripDraft.fromJson(Map<String, dynamic> json) => TripDraft(
        id: json['id'] as String,
        destinationId: json['destinationId'] as String?,
        title: json['title'] as String?,
        constraints: Map<String, dynamic>.from(json['constraints'] as Map),
        status: json['status'] as String,
        createdAt: json['createdAt'] as String,
        updatedAt: json['updatedAt'] as String,
      );
}

class TripDraftListResponse {
  TripDraftListResponse({required this.items});
  final List<TripDraft> items;

  factory TripDraftListResponse.fromJson(Map<String, dynamic> json) =>
      TripDraftListResponse(
        items: (json['items'] as List<dynamic>)
            .map((e) => TripDraft.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class TripDraftItineraryItem {
  TripDraftItineraryItem({
    required this.id,
    required this.position,
    this.title,
    this.notes,
  });
  final String id;
  final int position;
  final String? title;
  final String? notes;

  factory TripDraftItineraryItem.fromJson(Map<String, dynamic> json) =>
      TripDraftItineraryItem(
        id: json['id'] as String,
        position: json['position'] as int,
        title: json['title'] as String?,
        notes: json['notes'] as String?,
      );
}

class TripDraftItineraryDay {
  TripDraftItineraryDay({
    required this.id,
    required this.position,
    required this.items,
    this.label,
  });
  final String id;
  final int position;
  final String? label;
  final List<TripDraftItineraryItem> items;

  factory TripDraftItineraryDay.fromJson(Map<String, dynamic> json) =>
      TripDraftItineraryDay(
        id: json['id'] as String,
        position: json['position'] as int,
        label: json['label'] as String?,
        items: (json['items'] as List<dynamic>)
            .map((e) => TripDraftItineraryItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class TripDraftItineraryResponse {
  TripDraftItineraryResponse({required this.days});
  final List<TripDraftItineraryDay> days;

  factory TripDraftItineraryResponse.fromJson(Map<String, dynamic> json) =>
      TripDraftItineraryResponse(
        days: (json['days'] as List<dynamic>)
            .map((e) => TripDraftItineraryDay.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class TripDraftQuote {
  const TripDraftQuote({
    required this.id,
    required this.draftId,
    required this.currency,
    required this.source,
    required this.rateVersion,
    required this.travelerCount,
    required this.nights,
    required this.flightTotalEgp,
    required this.lodgingTotalEgp,
    required this.activitiesTotalEgp,
    required this.totalEgp,
    required this.createdAt,
    required this.expiresAt,
  });

  final String id;
  final String draftId;
  final String currency;
  final String source;
  final String rateVersion;
  final int travelerCount;
  final int nights;
  final int flightTotalEgp;
  final int lodgingTotalEgp;
  final int activitiesTotalEgp;
  final int totalEgp;
  final String createdAt;
  final String expiresAt;

  factory TripDraftQuote.fromJson(Map<String, dynamic> json) => TripDraftQuote(
        id: json['id'] as String,
        draftId: json['draftId'] as String,
        currency: json['currency'] as String,
        source: json['source'] as String,
        rateVersion: json['rateVersion'] as String,
        travelerCount: json['travelerCount'] as int,
        nights: json['nights'] as int,
        flightTotalEgp: json['flightTotalEgp'] as int,
        lodgingTotalEgp: json['lodgingTotalEgp'] as int,
        activitiesTotalEgp: json['activitiesTotalEgp'] as int,
        totalEgp: json['totalEgp'] as int,
        createdAt: json['createdAt'] as String,
        expiresAt: json['expiresAt'] as String,
      );
}

const Object _omit = Object();

/// Generated Helm حلم API client (meta/identity + catalog discovery + trip drafts).
class HelmApiClient {
  HelmApiClient({required this.baseUrl, http.Client? httpClient})
      : _http = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _http;

  Uri _u(String path) {
    final base = baseUrl.replaceAll(RegExp(r'/$'), '');
    return Uri.parse('$base$path');
  }

  Future<Map<String, dynamic>> _getJson(String path, {String? accessToken}) async {
    final headers = <String, String>{};
    if (accessToken != null) {
      headers['Authorization'] = 'Bearer $accessToken';
    }
    final res = await _http.get(_u(path), headers: headers);
    if (res.statusCode != 200) {
      throw Exception('$path failed: ${res.statusCode}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<HealthResponse> getHealth() async {
    final res = await _http.get(_u('/v1/health'));
    if (res.statusCode != 200) {
      throw Exception('getHealth failed: ${res.statusCode}');
    }
    return HealthResponse.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<ReadyResponse> getReady() async {
    final res = await _http.get(_u('/v1/ready'));
    if (res.statusCode != 200 && res.statusCode != 503) {
      throw Exception('getReady failed: ${res.statusCode}');
    }
    return ReadyResponse.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<MetaResponse> getMeta() async {
    final res = await _http.get(_u('/v1/meta'));
    if (res.statusCode != 200) {
      throw Exception('getMeta failed: ${res.statusCode}');
    }
    return MetaResponse.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<MeResponse> getMe({required String accessToken}) async {
    final res = await _http.get(
      _u('/v1/me'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    if (res.statusCode != 200) {
      throw Exception('getMe failed: ${res.statusCode}');
    }
    return MeResponse.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<BootstrapCustomerProfileResponse> bootstrapCustomerProfile({
    required String accessToken,
  }) async {
    final res = await _http.post(
      _u('/v1/customer/profile/bootstrap'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    if (res.statusCode != 200) {
      throw Exception('bootstrapCustomerProfile failed: ${res.statusCode}');
    }
    return BootstrapCustomerProfileResponse.fromJson(
      jsonDecode(res.body) as Map<String, dynamic>,
    );
  }

  Future<TripDraftListResponse> listTripDrafts({required String accessToken}) async {
    final res = await _http.get(
      _u('/v1/trips/drafts'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    if (res.statusCode != 200) {
      throw Exception('listTripDrafts failed: ${res.statusCode}');
    }
    return TripDraftListResponse.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<TripDraft> createTripDraft({
    required String accessToken,
    String? destinationId,
    String? title,
    Map<String, dynamic>? constraints,
    String? clientRequestKey,
  }) async {
    final body = <String, dynamic>{};
    if (destinationId != null) body['destinationId'] = destinationId;
    if (title != null) body['title'] = title;
    if (constraints != null) body['constraints'] = constraints;
    if (clientRequestKey != null) body['clientRequestKey'] = clientRequestKey;
    final res = await _http.post(
      _u('/v1/trips/drafts'),
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(body),
    );
    if (res.statusCode != 201) {
      throw Exception('createTripDraft failed: ${res.statusCode}');
    }
    return TripDraft.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<TripDraft> getTripDraft({
    required String accessToken,
    required String id,
  }) async {
    final res = await _http.get(
      _u('/v1/trips/drafts/${Uri.encodeComponent(id)}'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    if (res.statusCode != 200) {
      throw Exception('getTripDraft failed: ${res.statusCode}');
    }
    return TripDraft.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<TripDraftItineraryResponse> getTripDraftItinerary({
    required String accessToken,
    required String id,
  }) async {
    final res = await _http.get(
      _u('/v1/trips/drafts/${Uri.encodeComponent(id)}/itinerary'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    if (res.statusCode != 200) {
      throw Exception('getTripDraftItinerary failed: ${res.statusCode}');
    }
    return TripDraftItineraryResponse.fromJson(
      jsonDecode(res.body) as Map<String, dynamic>,
    );
  }

  Future<TripDraftQuote> createTripDraftQuote({
    required String accessToken,
    required String id,
    Map<String, dynamic>? expectedConstraints,
  }) async {
    final res = await _http.post(
      _u('/v1/trips/drafts/${Uri.encodeComponent(id)}/quote'),
      headers: {
        'Authorization': 'Bearer $accessToken',
        if (expectedConstraints != null) 'Content-Type': 'application/json',
      },
      body: expectedConstraints == null
          ? null
          : jsonEncode({'expectedConstraints': expectedConstraints}),
    );
    if (res.statusCode != 201) {
      throw Exception('createTripDraftQuote failed: ${res.statusCode}');
    }
    return TripDraftQuote.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<TripDraftQuote?> getTripDraftQuote({
    required String accessToken,
    required String id,
  }) async {
    final res = await _http.get(
      _u('/v1/trips/drafts/${Uri.encodeComponent(id)}/quote'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    if (res.statusCode == 404) return null;
    if (res.statusCode != 200) {
      throw Exception('getTripDraftQuote failed: ${res.statusCode}');
    }
    return TripDraftQuote.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<TripDraft> updateTripDraft({
    required String accessToken,
    required String id,
    Object? destinationId = _omit,
    Object? title = _omit,
    Map<String, dynamic>? constraints,
  }) async {
    final body = <String, dynamic>{};
    if (!identical(destinationId, _omit)) body['destinationId'] = destinationId;
    if (!identical(title, _omit)) body['title'] = title;
    if (constraints != null) body['constraints'] = constraints;
    final res = await _http.patch(
      _u('/v1/trips/drafts/${Uri.encodeComponent(id)}'),
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(body),
    );
    if (res.statusCode != 200) {
      throw Exception('updateTripDraft failed: ${res.statusCode}');
    }
    return TripDraft.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> listDestinations({
    String? country,
    String? q,
    int? limit,
    int? offset,
  }) {
    final params = <String, String>{};
    if (country != null) params['country'] = country;
    if (q != null) params['q'] = q;
    if (limit != null) params['limit'] = '$limit';
    if (offset != null) params['offset'] = '$offset';
    final query = params.isEmpty ? '' : '?${Uri(queryParameters: params).query}';
    return _getJson('/v1/destinations$query');
  }

  Future<Map<String, dynamic>> getDestination(String slug) =>
      _getJson('/v1/destinations/${Uri.encodeComponent(slug)}');

  Future<Map<String, dynamic>> listCatalogPlaces({
    String? category,
    String? country,
    String? destinationSlug,
    String? q,
    int? limit,
    int? offset,
  }) {
    final params = <String, String>{};
    if (category != null) params['category'] = category;
    if (country != null) params['country'] = country;
    if (destinationSlug != null) params['destinationSlug'] = destinationSlug;
    if (q != null) params['q'] = q;
    if (limit != null) params['limit'] = '$limit';
    if (offset != null) params['offset'] = '$offset';
    final query = params.isEmpty ? '' : '?${Uri(queryParameters: params).query}';
    return _getJson('/v1/catalog/places$query');
  }

  Future<Map<String, dynamic>> getCatalogPlace(String slug) =>
      _getJson('/v1/catalog/places/${Uri.encodeComponent(slug)}');

  Future<Map<String, dynamic>> listCatalogCategories() => _getJson('/v1/catalog/categories');

  Future<Map<String, dynamic>> listCatalogTags() => _getJson('/v1/catalog/tags');

  Future<Map<String, dynamic>> listGeoCountries({
    String? q,
    int? limit,
    int? offset,
  }) {
    final params = <String, String>{};
    if (q != null) params['q'] = q;
    if (limit != null) params['limit'] = '$limit';
    if (offset != null) params['offset'] = '$offset';
    final query = params.isEmpty ? '' : '?${Uri(queryParameters: params).query}';
    return _getJson('/v1/geo/countries$query');
  }

  Future<Map<String, dynamic>> listGeoCities({String? country, String? q}) {
    final params = <String, String>{};
    if (country != null) params['country'] = country;
    if (q != null) params['q'] = q;
    final query = params.isEmpty ? '' : '?${Uri(queryParameters: params).query}';
    return _getJson('/v1/geo/cities$query');
  }

  Future<Map<String, dynamic>> adminListCatalogDestinations({
    required String accessToken,
    String? country,
    String? q,
    String? lifecycleStatus,
  }) {
    final params = <String, String>{};
    if (country != null) params['country'] = country;
    if (q != null) params['q'] = q;
    if (lifecycleStatus != null) params['lifecycleStatus'] = lifecycleStatus;
    final query = params.isEmpty ? '' : '?${Uri(queryParameters: params).query}';
    return _getJson('/v1/admin/catalog/destinations$query', accessToken: accessToken);
  }

  Future<Map<String, dynamic>> adminGetCatalogDestination({
    required String accessToken,
    required String id,
  }) =>
      _getJson('/v1/admin/catalog/destinations/${Uri.encodeComponent(id)}',
          accessToken: accessToken);

  Future<Map<String, dynamic>> adminCreateCatalogDestination({
    required String accessToken,
    required Map<String, dynamic> body,
  }) =>
      _sendJson('/v1/admin/catalog/destinations',
          method: 'POST', accessToken: accessToken, body: body);

  Future<Map<String, dynamic>> adminUpdateCatalogDestination({
    required String accessToken,
    required String id,
    required Map<String, dynamic> body,
  }) =>
      _sendJson('/v1/admin/catalog/destinations/${Uri.encodeComponent(id)}',
          method: 'PATCH', accessToken: accessToken, body: body);

  Future<Map<String, dynamic>> adminTransitionCatalogDestination({
    required String accessToken,
    required String id,
    required Map<String, dynamic> body,
  }) =>
      _sendJson(
          '/v1/admin/catalog/destinations/${Uri.encodeComponent(id)}/transition',
          method: 'POST',
          accessToken: accessToken,
          body: body);

  Future<Map<String, dynamic>> adminReplaceCatalogDestinationTags({
    required String accessToken,
    required String id,
    required Map<String, dynamic> body,
  }) =>
      _sendJson('/v1/admin/catalog/destinations/${Uri.encodeComponent(id)}/tags',
          method: 'PUT', accessToken: accessToken, body: body);

  Future<Map<String, dynamic>> adminListAuditEvents({
    required String accessToken,
    required String entityType,
    required String entityId,
  }) {
    final query = '?${Uri(queryParameters: {
      'entityType': entityType,
      'entityId': entityId,
    }).query}';
    return _getJson('/v1/admin/audit-events$query', accessToken: accessToken);
  }

  Future<Map<String, dynamic>> _sendJson(
    String path, {
    required String method,
    required String accessToken,
    required Map<String, dynamic> body,
  }) async {
    final headers = <String, String>{
      'Authorization': 'Bearer $accessToken',
      'Content-Type': 'application/json',
    };
    late http.Response res;
    if (method == 'POST') {
      res = await _http.post(_u(path), headers: headers, body: jsonEncode(body));
    } else if (method == 'PATCH') {
      res = await _http.patch(_u(path), headers: headers, body: jsonEncode(body));
    } else if (method == 'PUT') {
      res = await _http.put(_u(path), headers: headers, body: jsonEncode(body));
    } else {
      throw Exception('Unsupported method $method');
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('$path failed: ${res.statusCode}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}

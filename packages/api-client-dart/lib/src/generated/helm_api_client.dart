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

/// Generated Helm حلم API client (meta/identity + catalog discovery).
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

  Future<Map<String, dynamic>> listDestinations({String? country, String? q}) {
    final params = <String, String>{};
    if (country != null) params['country'] = country;
    if (q != null) params['q'] = q;
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
  }) {
    final params = <String, String>{};
    if (category != null) params['category'] = category;
    if (country != null) params['country'] = country;
    if (destinationSlug != null) params['destinationSlug'] = destinationSlug;
    if (q != null) params['q'] = q;
    final query = params.isEmpty ? '' : '?${Uri(queryParameters: params).query}';
    return _getJson('/v1/catalog/places$query');
  }

  Future<Map<String, dynamic>> getCatalogPlace(String slug) =>
      _getJson('/v1/catalog/places/${Uri.encodeComponent(slug)}');

  Future<Map<String, dynamic>> listCatalogCategories() => _getJson('/v1/catalog/categories');

  Future<Map<String, dynamic>> listCatalogTags() => _getJson('/v1/catalog/tags');

  Future<Map<String, dynamic>> listGeoCountries({String? q}) {
    final params = <String, String>{};
    if (q != null) params['q'] = q;
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

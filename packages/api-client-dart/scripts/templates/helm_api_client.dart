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
  MeResponse({required this.userId, required this.roles, this.email});
  final String userId;
  final String? email;
  final List<String> roles;

  factory MeResponse.fromJson(Map<String, dynamic> json) => MeResponse(
        userId: json['userId'] as String,
        email: json['email'] as String?,
        roles: (json['roles'] as List<dynamic>).map((e) => e as String).toList(),
      );
}

/// Generated Helm حلم API client (foundation: health/ready/meta/me).
class HelmApiClient {
  HelmApiClient({required this.baseUrl, http.Client? httpClient})
      : _http = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _http;

  Uri _u(String path) {
    final base = baseUrl.replaceAll(RegExp(r'/$'), '');
    return Uri.parse('$base$path');
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
}

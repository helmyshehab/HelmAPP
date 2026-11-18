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

/// Minimal generated Helm حلم API client (Step 2 health/meta stub).
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

  Future<MetaResponse> getMeta() async {
    final res = await _http.get(_u('/v1/meta'));
    if (res.statusCode != 200) {
      throw Exception('getMeta failed: ${res.statusCode}');
    }
    return MetaResponse.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }
}

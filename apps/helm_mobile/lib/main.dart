import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'tabs/discover_tab.dart';

void main() {
  runApp(const HelmApp());
}

/// Helm حلم — Discover-first shell; exposes implemented features only.
class HelmApp extends StatelessWidget {
  const HelmApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Helm حلم',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0B3D2E)),
        useMaterial3: true,
      ),
      home: const HelmShell(),
    );
  }
}

class HelmShell extends StatelessWidget {
  const HelmShell({super.key, this.apiClient});

  /// Injectable for tests; production lets [DiscoverTab] build its own client.
  final HelmApiClient? apiClient;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Helm حلم')),
      body: SafeArea(
        top: false,
        child: DiscoverTab(apiClient: apiClient),
      ),
    );
  }
}

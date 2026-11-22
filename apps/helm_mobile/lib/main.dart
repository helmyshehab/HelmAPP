import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'tabs/discover_tab.dart';
import 'theme/helm_theme.dart';
import 'theme/helm_wordmark.dart';

void main() {
  runApp(const HelmApp());
}

/// HELM | حِلْم — Discover-first shell; exposes implemented features only.
class HelmApp extends StatelessWidget {
  const HelmApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: HelmWordmark.label,
      theme: HelmTheme.light(),
      darkTheme: HelmTheme.dark(),
      themeMode: ThemeMode.system,
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
    final scaler = MediaQuery.textScalerOf(context);
    final fontSize = Theme.of(context).textTheme.titleLarge?.fontSize ?? 22;
    // The title slot is the screen width minus the toolbar's middle insets.
    // One line keeps the compact bar; two lines grow it, including diacritics.
    final titleSlot = HelmWordmark.titleSlotWidth(MediaQuery.sizeOf(context).width);
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: HelmWordmark.toolbarHeight(
          maxWidth: titleSlot,
          fontSize: fontSize,
          textScaler: scaler,
        ),
        // The app bar clamps title scaling at 1.34. Restore the system
        // scaler so large text still reaches the lockup.
        title: MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: scaler),
          child: const HelmWordmark(),
        ),
      ),
      body: SafeArea(
        top: false,
        child: DiscoverTab(apiClient: apiClient),
      ),
    );
  }
}

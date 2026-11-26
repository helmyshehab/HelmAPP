import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:http/http.dart' as http;

import '../build/trip_gen/trip_preview_draft.dart';
import '../config/api_config.dart';

/// Packages tab — published Build-compatible trip ideas from the API.
class PackagesTab extends StatefulWidget {
  const PackagesTab({
    super.key,
    this.apiClient,
    this.onCustomizeInBuild,
  });

  final HelmApiClient? apiClient;
  final ValueChanged<TripPreviewDraftSnapshot>? onCustomizeInBuild;

  @override
  State<PackagesTab> createState() => _PackagesTabState();
}

class _PackagesTabState extends State<PackagesTab> {
  late final bool _ownsHttpClient;
  http.Client? _ownedHttp;
  late final HelmApiClient _client;

  bool _loading = true;
  Object? _error;
  List<_PackageIdea> _ideas = const [];

  @override
  void initState() {
    super.initState();
    final injected = widget.apiClient;
    if (injected != null) {
      _ownsHttpClient = false;
      _client = injected;
    } else {
      _ownsHttpClient = true;
      _ownedHttp = http.Client();
      _client = HelmApiClient(
        baseUrl: ApiConfig.apiBaseUrl,
        httpClient: _ownedHttp,
      );
    }
    _load();
  }

  @override
  void dispose() {
    if (_ownsHttpClient) {
      _ownedHttp?.close();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await _client.listPackages();
      final rawItems = response['items'];
      final ideas = <_PackageIdea>[];
      if (rawItems is List) {
        for (final item in rawItems) {
          if (item is! Map) continue;
          final map = Map<String, dynamic>.from(item);
          final idea = _PackageIdea.tryParse(map);
          if (idea != null) ideas.add(idea);
        }
      }
      if (!mounted) return;
      setState(() {
        _ideas = ideas;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(key: Key('packages-loading')),
      );
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Could not load packages',
                key: const Key('packages-failure'),
                style: textTheme.titleMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              FilledButton(
                key: const Key('packages-retry'),
                onPressed: _load,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      key: const Key('packages-list'),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        Text('Packages', style: textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text(
          'Curated ideas you can customize into a private trip draft.',
          style: textTheme.bodyMedium,
        ),
        const SizedBox(height: 16),
        if (_ideas.isEmpty)
          Text(
            'No published packages yet.',
            key: const Key('packages-empty'),
            style: textTheme.bodyMedium,
          ),
        for (final idea in _ideas) ...[
          _PackageIdeaCard(
            idea: idea,
            onCustomize: widget.onCustomizeInBuild == null
                ? null
                : () => widget.onCustomizeInBuild!(idea.snapshot),
          ),
          const SizedBox(height: 12),
        ],
      ],
    );
  }
}

class _PackageIdea {
  const _PackageIdea({
    required this.id,
    required this.title,
    required this.summary,
    required this.demoDefaultsLabel,
    required this.snapshot,
  });

  final String id;
  final String title;
  final String summary;
  final String demoDefaultsLabel;
  final TripPreviewDraftSnapshot snapshot;

  static _PackageIdea? tryParse(Map<String, dynamic> json) {
    final snapshot = tryParseUbudTripPreviewDraft(
      Map<String, dynamic>.from(json['content'] as Map? ?? const {}),
    );
    if (snapshot == null) return null;
    final id = json['id'] as String? ?? json['slug'] as String?;
    final title = json['titleEn'] as String?;
    if (id == null || title == null) return null;
    final summary = (json['summaryEn'] as String?)?.trim();
    final answers = snapshot.answers;
    return _PackageIdea(
      id: id,
      title: title,
      summary: (summary == null || summary.isEmpty)
          ? 'Customize this curated trip in Build.'
          : summary,
      demoDefaultsLabel:
          'Demo defaults: ${answers.budgetEgp} EGP · ${answers.travelerCount} travelers · '
          '${answers.nights} nights · ${snapshot.hotelSlug}',
      snapshot: snapshot,
    );
  }

}

class _PackageIdeaCard extends StatelessWidget {
  const _PackageIdeaCard({
    required this.idea,
    required this.onCustomize,
  });

  final _PackageIdea idea;
  final VoidCallback? onCustomize;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    return Material(
      key: Key('package-idea-${idea.id}'),
      color: scheme.surfaceContainerLow,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(idea.title, style: textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(idea.summary, style: textTheme.bodyMedium),
            const SizedBox(height: 8),
            Text(
              idea.demoDefaultsLabel,
              style: textTheme.bodySmall?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              key: Key('package-customize-${idea.id}'),
              onPressed: onCustomize,
              child: const Text('Customize in Build'),
            ),
          ],
        ),
      ),
    );
  }
}

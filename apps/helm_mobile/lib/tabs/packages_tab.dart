import 'package:flutter/material.dart';

import '../build/trip_gen/trip_preview_draft.dart';
import '../packages/ubud_package_fixture.dart';

/// Packages tab — curated demo trip ideas that hand off into Build.
class PackagesTab extends StatelessWidget {
  const PackagesTab({super.key, this.onCustomizeInBuild});

  /// Opens Build with an editable copy of the package snapshot.
  final ValueChanged<TripPreviewDraftSnapshot>? onCustomizeInBuild;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return ListView(
      key: const Key('packages-list'),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        Text('Packages', style: textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text(
          'Curated demo ideas you can customize into a private trip draft.',
          style: textTheme.bodyMedium,
        ),
        const SizedBox(height: 16),
        for (final idea in packagesDemoIdeas) ...[
          _PackageIdeaCard(
            idea: idea,
            onCustomize: onCustomizeInBuild == null
                ? null
                : () => onCustomizeInBuild!(idea.snapshot),
          ),
          const SizedBox(height: 12),
        ],
      ],
    );
  }
}

class _PackageIdeaCard extends StatelessWidget {
  const _PackageIdeaCard({
    required this.idea,
    required this.onCustomize,
  });

  final UbudPackageFixture idea;
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

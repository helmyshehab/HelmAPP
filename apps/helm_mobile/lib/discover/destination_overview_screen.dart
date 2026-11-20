import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';

import 'destination_detail.dart';

/// Destination overview loaded via [HelmApiClient.getDestination].
class DestinationOverviewScreen extends StatefulWidget {
  const DestinationOverviewScreen({
    super.key,
    required this.slug,
    required this.apiClient,
  });

  final String slug;
  final HelmApiClient apiClient;

  @override
  State<DestinationOverviewScreen> createState() =>
      _DestinationOverviewScreenState();
}

enum _OverviewLoadState { loading, notFound, failure, success }

class _DestinationOverviewScreenState extends State<DestinationOverviewScreen> {
  _OverviewLoadState _state = _OverviewLoadState.loading;
  DestinationDetail? _detail;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _state = _OverviewLoadState.loading;
      _error = null;
      _detail = null;
    });

    try {
      final response = await widget.apiClient.getDestination(widget.slug);
      final detail = DestinationDetail.fromJson(response);
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _state = _OverviewLoadState.success;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _state = isDestinationNotFoundError(e)
            ? _OverviewLoadState.notFound
            : _OverviewLoadState.failure;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_detail?.nameEn ?? 'Destination'),
        leading: IconButton(
          key: const Key('destination-overview-back'),
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Back',
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    switch (_state) {
      case _OverviewLoadState.loading:
        return const Center(
          child: CircularProgressIndicator(
            key: Key('destination-overview-loading'),
          ),
        );
      case _OverviewLoadState.notFound:
        return const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Destination not found',
              key: Key('destination-overview-not-found'),
              textAlign: TextAlign.center,
            ),
          ),
        );
      case _OverviewLoadState.failure:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Could not load destination',
                  key: const Key('destination-overview-failure'),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  _error?.toString() ?? 'Unknown error',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 16),
                FilledButton(
                  key: const Key('destination-overview-retry'),
                  onPressed: _load,
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        );
      case _OverviewLoadState.success:
        final detail = _detail!;
        final copy = detail.overviewCopy;
        final summary = copy.summary;
        final description = copy.description;
        final hasOverview = summary != null || description != null;

        return ListView(
          key: Key('destination-overview-${detail.slug}'),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            Text(
              detail.nameEn,
              key: const Key('destination-overview-name'),
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            if (detail.nameAr != null && detail.nameAr!.trim().isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                detail.nameAr!,
                key: const Key('destination-overview-name-ar'),
                style: Theme.of(context).textTheme.titleMedium,
                textDirection: TextDirection.rtl,
              ),
            ],
            if (detail.countryCode != null &&
                detail.countryCode!.trim().isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                detail.countryCode!,
                key: const Key('destination-overview-country'),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
            if (summary != null) ...[
              const SizedBox(height: 16),
              Text(
                summary,
                key: const Key('destination-overview-summary'),
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ],
            if (description != null) ...[
              const SizedBox(height: 12),
              Text(
                description,
                key: const Key('destination-overview-description'),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
            if (!hasOverview) ...[
              const SizedBox(height: 16),
              Text(
                'A longer description is not available for this destination yet.',
                key: const Key('destination-overview-empty-copy'),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
            if (detail.tags.isNotEmpty) ...[
              const SizedBox(height: 16),
              Wrap(
                key: const Key('destination-overview-tags'),
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final tag in detail.tags)
                    Chip(label: Text(tag.replaceAll('_', ' '))),
                ],
              ),
            ],
          ],
        );
    }
  }
}

import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../discover/destination_card.dart';
import '../discover/destination_list_item.dart';
import '../discover/destination_overview_screen.dart';
import '../discover/discover_hero.dart';

/// Discover tab — published destination list with overview navigation.
class DiscoverTab extends StatefulWidget {
  const DiscoverTab({super.key, this.apiClient});

  /// Injectable for tests; production uses [ApiConfig.apiBaseUrl].
  final HelmApiClient? apiClient;

  @override
  State<DiscoverTab> createState() => _DiscoverTabState();
}

enum _DiscoverLoadState { loading, empty, failure, success }

class _DiscoverTabState extends State<DiscoverTab> {
  final GlobalKey _destinationListKey = GlobalKey();

  /// True when this tab created the [http.Client] (not when [apiClient] injected).
  late final bool _ownsHttpClient;
  http.Client? _ownedHttp;
  late final HelmApiClient _client;

  _DiscoverLoadState _state = _DiscoverLoadState.loading;
  List<DestinationListItem> _items = const [];
  Object? _error;

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

  void _scrollToDestinations() {
    final target = _destinationListKey.currentContext;
    if (target == null) return;
    final reduceMotion = MediaQuery.disableAnimationsOf(target);
    Scrollable.ensureVisible(
      target,
      alignment: 0,
      duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 350),
      curve: Curves.easeOutCubic,
    );
  }

  String? get _editorialSlug {
    for (final item in _items) {
      if (item.isFeatured) return item.slug;
    }
    return null;
  }

  Future<void> _load() async {
    setState(() {
      _state = _DiscoverLoadState.loading;
      _error = null;
    });

    try {
      final response = await _client.listDestinations();
      final items = DestinationListItem.parseItems(response);
      if (!mounted) return;
      setState(() {
        _items = items;
        _state = items.isEmpty
            ? _DiscoverLoadState.empty
            : _DiscoverLoadState.success;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _state = _DiscoverLoadState.failure;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    switch (_state) {
      case _DiscoverLoadState.loading:
        return const Center(
          child: CircularProgressIndicator(
            key: Key('discover-loading'),
          ),
        );
      case _DiscoverLoadState.empty:
        return const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'No destinations yet',
              key: Key('discover-empty'),
              textAlign: TextAlign.center,
            ),
          ),
        );
      case _DiscoverLoadState.failure:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Could not load destinations',
                  key: const Key('discover-failure'),
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
                  key: const Key('discover-retry'),
                  onPressed: _load,
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        );
      case _DiscoverLoadState.success:
        final editorialSlug = _editorialSlug;
        return ListView(
          key: const Key('discover-list'),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          children: [
            DiscoverHero(onBrowse: _scrollToDestinations),
            Column(
              key: _destinationListKey,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final item in _items) ...[
                  if (item != _items.first) const SizedBox(height: 12),
                  DestinationCard(
                    item: item,
                    editorial: item.slug == editorialSlug,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => DestinationOverviewScreen(
                            slug: item.slug,
                            apiClient: _client,
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ],
            ),
          ],
        );
    }
  }
}

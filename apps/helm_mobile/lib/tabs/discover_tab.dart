import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../discover/destination_card.dart';
import '../discover/destination_list_item.dart';
import '../discover/destination_overview_screen.dart';
import '../discover/discover_hero.dart';
import '../discover/discover_search.dart';
import '../theme/helm_colors.dart';
import '../theme/helm_tokens.dart';
import '../theme/helm_typography.dart';

/// Discover tab — published destination list with overview navigation.
class DiscoverTab extends StatefulWidget {
  const DiscoverTab({super.key, this.apiClient});

  /// Injectable for tests; production uses [ApiConfig.apiBaseUrl].
  final HelmApiClient? apiClient;

  static const int pageSize = 12;

  @override
  State<DiscoverTab> createState() => _DiscoverTabState();
}

enum _DiscoverLoadState { loading, empty, failure, success }

class _DiscoverTabState extends State<DiscoverTab> {
  final GlobalKey _destinationListKey = GlobalKey();
  final TextEditingController _searchController = TextEditingController();

  /// True when this tab created the [http.Client] (not when [apiClient] injected).
  late final bool _ownsHttpClient;
  http.Client? _ownedHttp;
  late final HelmApiClient _client;

  _DiscoverLoadState _state = _DiscoverLoadState.loading;
  List<DestinationListItem> _items = const [];
  Object? _error;

  /// Last submitted query (trimmed). Empty means the full published list.
  String _activeQuery = '';

  /// After the first success/empty paint, keep search mounted across reloads.
  bool _shellReady = false;

  int _total = 0;
  int _offset = 0;
  bool _reachedEnd = false;
  bool _pageLoading = false;
  Object? _pageError;

  int _requestGeneration = 0;
  bool _listInFlight = false;

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
    _searchController.dispose();
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

  bool get _canLoadMore =>
      _state == _DiscoverLoadState.success &&
      !_reachedEnd &&
      _offset < _total;

  String _normalizeQuery(String raw) {
    final trimmed = raw.trim();
    if (trimmed.length <= 120) return trimmed;
    return trimmed.substring(0, 120);
  }

  int _parseTotal(Map<String, dynamic> response, int fallback) {
    final total = response['total'];
    if (total is int) return total;
    if (total is num) return total.toInt();
    return fallback;
  }

  void _submitSearch() {
    final next = _normalizeQuery(_searchController.text);
    _searchController.value = TextEditingValue(
      text: next,
      selection: TextSelection.collapsed(offset: next.length),
    );
    if (next == _activeQuery && _state != _DiscoverLoadState.failure) {
      return;
    }
    setState(() => _activeQuery = next);
    _load();
  }

  void _clearSearch() {
    _searchController.clear();
    if (_activeQuery.isEmpty) return;
    setState(() => _activeQuery = '');
    _load();
  }

  Future<void> _load() async {
    final generation = ++_requestGeneration;
    _listInFlight = true;

    setState(() {
      _state = _DiscoverLoadState.loading;
      _error = null;
      _pageError = null;
      _pageLoading = false;
      _offset = 0;
      _total = 0;
      _reachedEnd = false;
    });

    try {
      final response = await _client.listDestinations(
        q: _activeQuery.isEmpty ? null : _activeQuery,
        limit: DiscoverTab.pageSize,
        offset: 0,
      );
      if (!mounted || generation != _requestGeneration) return;

      final items = DestinationListItem.parseItems(response);
      final total = _parseTotal(response, items.length);
      setState(() {
        _items = items;
        _total = total;
        _offset = items.length;
        _reachedEnd = items.isEmpty || _offset >= total;
        _state = items.isEmpty
            ? _DiscoverLoadState.empty
            : _DiscoverLoadState.success;
        _shellReady = true;
        _pageLoading = false;
        _pageError = null;
      });
    } catch (e) {
      if (!mounted || generation != _requestGeneration) return;
      setState(() {
        _error = e;
        _state = _DiscoverLoadState.failure;
        _pageLoading = false;
      });
    } finally {
      if (generation == _requestGeneration) {
        _listInFlight = false;
      }
    }
  }

  Future<void> _loadMore() async {
    if (_listInFlight ||
        _pageLoading ||
        _reachedEnd ||
        _offset >= _total ||
        _state != _DiscoverLoadState.success) {
      return;
    }

    final generation = ++_requestGeneration;
    final requestOffset = _offset;
    final requestQuery = _activeQuery;
    _listInFlight = true;

    setState(() {
      _pageLoading = true;
      _pageError = null;
    });

    try {
      final response = await _client.listDestinations(
        q: requestQuery.isEmpty ? null : requestQuery,
        limit: DiscoverTab.pageSize,
        offset: requestOffset,
      );
      if (!mounted || generation != _requestGeneration) return;

      final pageItems = DestinationListItem.parseItems(response);
      final total = _parseTotal(response, _total);
      final nextOffset = requestOffset + pageItems.length;

      setState(() {
        final seen = _items.map((item) => item.id).toSet();
        final appended = pageItems
            .where((item) => !seen.contains(item.id))
            .toList(growable: false);
        if (appended.isNotEmpty) {
          _items = [..._items, ...appended];
        }
        _total = total;
        _offset = nextOffset;
        if (pageItems.isEmpty || nextOffset >= _total) {
          _reachedEnd = true;
        }
        _pageLoading = false;
        _pageError = null;
      });
    } catch (e) {
      if (!mounted || generation != _requestGeneration) return;
      setState(() {
        _pageLoading = false;
        _pageError = e;
      });
    } finally {
      if (generation == _requestGeneration) {
        _listInFlight = false;
      }
    }
  }

  Widget _searchSlot() {
    return DiscoverSearch(
      controller: _searchController,
      activeQuery: _activeQuery,
      onSubmit: _submitSearch,
      onClear: _clearSearch,
    );
  }

  Widget _resultsLoading() {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 48),
      child: Center(
        child: CircularProgressIndicator(
          key: Key('discover-loading'),
        ),
      ),
    );
  }

  Widget _loadMoreFooter() {
    if (!_canLoadMore && _pageError == null && !_pageLoading) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: HelmSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_pageError != null)
            Padding(
              padding: const EdgeInsets.only(bottom: HelmSpacing.md),
              child: Text(
                'Could not load more destinations. Try again.',
                key: const Key('discover-page-error'),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          if (_pageLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: HelmSpacing.md),
              child: Center(
                child: CircularProgressIndicator(
                  key: Key('discover-page-loading'),
                ),
              ),
            )
          else if (_canLoadMore || _pageError != null)
            FilledButton(
              key: _pageError != null
                  ? const Key('discover-page-retry')
                  : const Key('discover-load-more'),
              style: FilledButton.styleFrom(
                backgroundColor: HelmColors.teal,
                foregroundColor: HelmColors.white,
                minimumSize: const Size(0, 44),
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 12,
                ),
                tapTargetSize: MaterialTapTargetSize.padded,
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.all(
                    Radius.circular(HelmRadius.md),
                  ),
                ),
                textStyle: const TextStyle(
                  fontFamily: HelmFonts.outfit,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  height: 1.2,
                ),
              ),
              onPressed: _loadMore,
              child: Text(_pageError != null ? 'Retry' : 'Load more'),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    switch (_state) {
      case _DiscoverLoadState.loading:
        if (!_shellReady) {
          return const Center(
            child: CircularProgressIndicator(
              key: Key('discover-loading'),
            ),
          );
        }
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          children: [
            _searchSlot(),
            _resultsLoading(),
          ],
        );
      case _DiscoverLoadState.empty:
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          children: [
            _searchSlot(),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Text(
                _activeQuery.isEmpty
                    ? 'No destinations yet'
                    : 'No matching destinations',
                key: const Key('discover-empty'),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            if (_activeQuery.isNotEmpty)
              Text(
                'No published destinations match “$_activeQuery”. '
                'Clear the search to browse the full catalog.',
                key: const Key('discover-empty-search'),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
          ],
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
          primary: true,
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          children: [
            DiscoverHero(onBrowse: _scrollToDestinations),
            _searchSlot(),
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
            _loadMoreFooter(),
          ],
        );
    }
  }
}

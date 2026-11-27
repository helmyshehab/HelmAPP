import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:http/http.dart' as http;

import '../build/trip_gen/trip_answers.dart';
import '../config/api_config.dart';
import '../discover/destination_card.dart';
import '../discover/destination_list_item.dart';
import '../discover/destination_overview_screen.dart';
import '../discover/discover_globe.dart';
import '../discover/discover_hero.dart';
import '../discover/discover_search.dart';
import '../geo/country_names.dart';
import '../theme/helm_tokens.dart';
import '../theme/helm_typography.dart';
import '../theme/helm_wrapping_text.dart';

/// Explore tab — published destination list with overview navigation.
class DiscoverTab extends StatefulWidget {
  const DiscoverTab({super.key, this.apiClient, this.onBuildTrip});

  /// Injectable for tests; production uses [ApiConfig.apiBaseUrl].
  final HelmApiClient? apiClient;

  /// Optional handoff into Build (Ubud demo planner) from destination overview.
  final ValueChanged<TripDestinationChoice>? onBuildTrip;

  static const int pageSize = 12;

  /// Shared Explore content column width; heading, search, globe, and rows align.
  static const double contentMaxWidth = 720;

  @override
  State<DiscoverTab> createState() => _DiscoverTabState();
}

enum _DiscoverLoadState { loading, empty, failure, success }

class _DiscoverTabState extends State<DiscoverTab> {
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

  /// Cached English country names from one `listGeoCountries` pass.
  Map<String, String> _countryNames = const {};

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
    _loadCountryNames();
  }

  @override
  void dispose() {
    _searchController.dispose();
    if (_ownsHttpClient) {
      _ownedHttp?.close();
    }
    super.dispose();
  }

  Future<void> _loadCountryNames() async {
    final names = await loadCountryNameCache(_client);
    if (!mounted || names.isEmpty) return;
    setState(() => _countryNames = names);
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

  Widget _sectionHeader() {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: HelmSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          HelmWrappingText(
            'Where we take you',
            key: const Key('explore-section-heading'),
            style: TextStyle(
              color: scheme.onSurface,
              fontFamily: HelmFonts.fraunces,
              fontSize: 28,
              fontWeight: FontWeight.w600,
              height: 1.25,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: HelmSpacing.sm),
          Text(
            "Through HELM's eyes.",
            key: const Key('explore-section-subtitle'),
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontFamily: HelmFonts.outfit,
              fontSize: 16,
              fontStyle: FontStyle.italic,
              height: 1.45,
            ),
          ),
        ],
      ),
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
              onPressed: _loadMore,
              child: Text(_pageError != null ? 'Retry' : 'Load more'),
            ),
        ],
      ),
    );
  }

  List<Widget> _chromeLeading({required bool includeGlobe}) {
    return [
      const DiscoverHero(),
      _searchSlot(),
      if (includeGlobe)
        DiscoverGlobe(
          apiClient: _client,
          seedItems: _items,
          catalogComplete: _reachedEnd,
          onExplore: _openDestination,
        ),
    ];
  }

  /// Centers Explore chrome and rows within [DiscoverTab.contentMaxWidth].
  ///
  /// Each child stays a separate [ListView] child so off-screen rows (and the
  /// load-more spinner) remain lazy and do not keep tickers alive after scroll.
  Widget _exploreList({
    Key? key,
    required List<Widget> children,
  }) {
    return ListView(
      key: key,
      primary: true,
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        for (var index = 0; index < children.length; index++)
          Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              key: index == 0 ? const Key('explore-content-column') : null,
              constraints: const BoxConstraints(
                maxWidth: DiscoverTab.contentMaxWidth,
              ),
              child: SizedBox(
                width: double.infinity,
                child: children[index],
              ),
            ),
          ),
      ],
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
        return _exploreList(
          children: [
            ..._chromeLeading(includeGlobe: false),
            _resultsLoading(),
          ],
        );
      case _DiscoverLoadState.empty:
        return _exploreList(
          children: [
            ..._chromeLeading(includeGlobe: false),
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
        final showGlobe = _activeQuery.isEmpty;
        return _exploreList(
          key: const Key('discover-list'),
          children: [
            ..._chromeLeading(includeGlobe: showGlobe),
            _sectionHeader(),
            for (final item in _items) ...[
              if (item != _items.first) const SizedBox(height: 12),
              DestinationCard(
                item: item,
                countryNames: _countryNames,
                onTap: () => _openDestination(item),
              ),
            ],
            _loadMoreFooter(),
          ],
        );
    }
  }

  void _openDestination(DestinationListItem item) {
    final navigator = Navigator.of(context);
    final discoverRoute = ModalRoute.of(context);
    navigator.push<void>(
      MaterialPageRoute<void>(
        builder: (_) => DestinationOverviewScreen(
          slug: item.slug,
          apiClient: _client,
          onBuildTrip: item.slug == 'ubud' && widget.onBuildTrip != null
              ? () {
                  navigator.popUntil((route) => route == discoverRoute);
                  widget.onBuildTrip?.call(TripDestinationChoice.ubud);
                }
              : null,
        ),
      ),
    );
  }
}

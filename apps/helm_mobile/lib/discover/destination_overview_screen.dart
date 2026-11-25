import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';

import 'destination_detail.dart';
import 'place_list_item.dart';

/// Default page size for destination Places (`listCatalogPlaces` limit).
const int kDestinationPlacesPageSize = 20;

/// Destination overview loaded via [HelmApiClient.getDestination], with a
/// Places section loaded via [HelmApiClient.listCatalogPlaces].
class DestinationOverviewScreen extends StatefulWidget {
  const DestinationOverviewScreen({
    super.key,
    required this.slug,
    required this.apiClient,
    this.onBuildTrip,
    this.placesPageSize = kDestinationPlacesPageSize,
  });

  final String slug;
  final HelmApiClient apiClient;
  final VoidCallback? onBuildTrip;
  final int placesPageSize;

  @override
  State<DestinationOverviewScreen> createState() =>
      _DestinationOverviewScreenState();
}

enum _OverviewLoadState { loading, notFound, failure, success }

enum _PlacesLoadState { idle, loading, empty, failure, success }

class _DestinationOverviewScreenState extends State<DestinationOverviewScreen> {
  _OverviewLoadState _state = _OverviewLoadState.loading;
  DestinationDetail? _detail;
  Object? _error;

  _PlacesLoadState _placesState = _PlacesLoadState.idle;
  final List<PlaceListItem> _places = [];
  int _placesTotal = 0;
  Object? _placesError;
  bool _placesRequestInFlight = false;

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
      _placesState = _PlacesLoadState.idle;
      _places.clear();
      _placesTotal = 0;
      _placesError = null;
      _placesRequestInFlight = false;
    });

    try {
      final response = await widget.apiClient.getDestination(widget.slug);
      final detail = DestinationDetail.fromJson(response);
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _state = _OverviewLoadState.success;
        // Overview stays visible; Places section shows its own loading state.
        _placesState = _PlacesLoadState.loading;
      });
      await _loadPlacesPage(reset: true);
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

  bool get _hasMorePlaces => _places.length < _placesTotal;

  Future<void> _loadPlacesPage({required bool reset}) async {
    if (_placesRequestInFlight) return;

    final offset = reset ? 0 : _places.length;
    setState(() {
      _placesRequestInFlight = true;
      _placesError = null;
      if (reset) {
        _places.clear();
        _placesTotal = 0;
        _placesState = _PlacesLoadState.loading;
      } else {
        // Keep existing rows while a later page loads or retries.
        _placesState = _PlacesLoadState.loading;
      }
    });

    try {
      final response = await widget.apiClient.listCatalogPlaces(
        destinationSlug: widget.slug,
        limit: widget.placesPageSize,
        offset: offset,
      );
      final page = PlaceListPage.fromJson(response);
      if (!mounted) return;

      setState(() {
        if (reset) {
          _places
            ..clear()
            ..addAll(page.items);
        } else {
          _places.addAll(page.items);
        }
        _placesTotal = page.total;
        _placesState = _places.isEmpty
            ? _PlacesLoadState.empty
            : _PlacesLoadState.success;
        _placesRequestInFlight = false;
        _placesError = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _placesError = e;
        _placesRequestInFlight = false;
        // First page failure: empty list + failure UI.
        // Later page failure: keep rows; Retry reloads the same offset.
        _placesState = _places.isEmpty
            ? _PlacesLoadState.failure
            : _PlacesLoadState.success;
      });
    }
  }

  Future<void> _retryPlaces() => _loadPlacesPage(reset: _places.isEmpty);

  Future<void> _loadMorePlaces() {
    if (!_hasMorePlaces || _placesRequestInFlight) {
      return Future<void>.value();
    }
    return _loadPlacesPage(reset: false);
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
            if (widget.onBuildTrip case final onBuildTrip?) ...[
              const SizedBox(height: 16),
              FilledButton(
                onPressed: onBuildTrip,
                child: const Text('Build my trip'),
              ),
            ],
            const SizedBox(height: 24),
            ..._buildPlacesSection(context),
          ],
        );
    }
  }

  List<Widget> _buildPlacesSection(BuildContext context) {
    final theme = Theme.of(context);
    final children = <Widget>[
      Text(
        'Places',
        key: const Key('destination-places-heading'),
        style: theme.textTheme.titleLarge,
      ),
      const SizedBox(height: 12),
    ];

    final showInitialLoading =
        _placesState == _PlacesLoadState.loading && _places.isEmpty;
    final showEmpty = _placesState == _PlacesLoadState.empty;
    final showFirstPageFailure =
        _placesState == _PlacesLoadState.failure && _places.isEmpty;

    if (showInitialLoading) {
      children.add(
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 16),
          child: Center(
            child: CircularProgressIndicator(
              key: Key('destination-places-loading'),
            ),
          ),
        ),
      );
      return children;
    }

    if (showEmpty) {
      children.add(
        Text(
          'No published places are listed for this destination yet.',
          key: const Key('destination-places-empty'),
          style: theme.textTheme.bodyMedium,
        ),
      );
      return children;
    }

    if (showFirstPageFailure) {
      children.addAll(_placesFailureBlock(context, isLaterPage: false));
      return children;
    }

    for (final place in _places) {
      children.add(_PlaceRow(place: place));
      children.add(const SizedBox(height: 12));
    }

    final laterPageFailed = _placesError != null && _places.isNotEmpty;
    if (laterPageFailed) {
      children.addAll(_placesFailureBlock(context, isLaterPage: true));
    } else if (_placesRequestInFlight) {
      children.add(
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 8),
          child: Center(
            child: CircularProgressIndicator(
              key: Key('destination-places-loading-more'),
            ),
          ),
        ),
      );
    } else if (_hasMorePlaces) {
      children.add(
        Align(
          alignment: Alignment.center,
          child: OutlinedButton(
            key: const Key('destination-places-load-more'),
            onPressed: _loadMorePlaces,
            child: const Text('Load more'),
          ),
        ),
      );
    }

    return children;
  }

  List<Widget> _placesFailureBlock(
    BuildContext context, {
    required bool isLaterPage,
  }) {
    return [
      Text(
        isLaterPage
            ? 'Could not load more places'
            : 'Could not load places',
        key: Key(
          isLaterPage
              ? 'destination-places-load-more-failure'
              : 'destination-places-failure',
        ),
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.titleMedium,
      ),
      const SizedBox(height: 8),
      Text(
        _placesError?.toString() ?? 'Unknown error',
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.bodySmall,
      ),
      const SizedBox(height: 12),
      Center(
        child: FilledButton(
          key: Key(
            isLaterPage
                ? 'destination-places-load-more-retry'
                : 'destination-places-retry',
          ),
          onPressed: _placesRequestInFlight ? null : _retryPlaces,
          child: const Text('Retry'),
        ),
      ),
    ];
  }
}

class _PlaceRow extends StatelessWidget {
  const _PlaceRow({required this.place});

  final PlaceListItem place;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final short = place.availableShortDescription;

    return Column(
      key: Key('destination-place-${place.slug}'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          place.nameEn,
          key: Key('destination-place-name-${place.slug}'),
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: 2),
        Text(
          place.categoryLabel,
          key: Key('destination-place-category-${place.slug}'),
          style: theme.textTheme.bodySmall,
        ),
        if (short != null) ...[
          const SizedBox(height: 4),
          Text(
            short,
            key: Key('destination-place-short-${place.slug}'),
            style: theme.textTheme.bodyMedium,
          ),
        ],
      ],
    );
  }
}

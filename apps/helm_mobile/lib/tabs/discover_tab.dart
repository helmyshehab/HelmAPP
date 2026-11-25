import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:http/http.dart' as http;

import '../build/trip_gen/trip_answers.dart';
import '../config/api_config.dart';
import '../discover/country_overview_screen.dart';
import '../discover/destination_list_item.dart';
import '../discover/destination_overview_screen.dart';

/// Discover groups published destinations by country.
class DiscoverTab extends StatefulWidget {
  const DiscoverTab({super.key, this.apiClient, this.onBuildTrip});

  final ValueChanged<TripDestinationChoice>? onBuildTrip;

  /// Injectable for tests; production uses [ApiConfig.apiBaseUrl].
  final HelmApiClient? apiClient;

  @override
  State<DiscoverTab> createState() => _DiscoverTabState();
}

enum _DiscoverLoadState { loading, empty, failure, success }

class _DiscoverTabState extends State<DiscoverTab> {
  /// True when this tab created the [http.Client] (not when [apiClient] injected).
  late final bool _ownsHttpClient;
  http.Client? _ownedHttp;
  late final HelmApiClient _client;

  _DiscoverLoadState _state = _DiscoverLoadState.loading;
  Map<String, List<DestinationListItem>> _destinationsByCountry = const {};
  Map<String, String> _countryNames = const {};
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

  Future<void> _load() async {
    setState(() {
      _state = _DiscoverLoadState.loading;
      _error = null;
    });

    try {
      final destinations = <String, List<DestinationListItem>>{};
      await for (final page in _pages(_client.listDestinations)) {
        for (final destination in DestinationListItem.parseItems(page)) {
          final code = destination.countryCode;
          if (code == null || code.isEmpty) continue;
          destinations.putIfAbsent(code, () => []).add(destination);
        }
      }
      final names = <String, String>{};
      if (destinations.isNotEmpty) {
        await for (final page in _pages(_client.listGeoCountries)) {
          final items = page['items'] as List<dynamic>;
          for (final item in items.whereType<Map<String, dynamic>>()) {
            final code = item['code'] as String;
            if (destinations.containsKey(code)) {
              names[code] = item['nameEn'] as String;
            }
          }
          if (names.length == destinations.length) break;
        }
      }
      if (!mounted) return;
      setState(() {
        _destinationsByCountry = destinations;
        _countryNames = names;
        _state = destinations.isEmpty
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

  Stream<Map<String, dynamic>> _pages(
    Future<Map<String, dynamic>> Function({int? limit, int? offset}) fetch,
  ) async* {
    var offset = 0;
    while (mounted) {
      final page = await fetch(limit: 100, offset: offset);
      if (!mounted) return;
      yield page;
      final count = (page['items'] as List<dynamic>).length;
      offset += count;
      if (count == 0 || offset >= (page['total'] as int)) return;
    }
  }

  String _countryName(String code) => _countryNames[code] ?? code;

  void _openCountry(String code) {
    final navigator = Navigator.of(context);
    final discoverRoute = ModalRoute.of(context);
    navigator.push<void>(MaterialPageRoute(
      builder: (_) => CountryOverviewScreen(
        countryCode: code,
        countryName: _countryName(code),
        destinations: _destinationsByCountry[code]!,
        onDestinationSelected: (_, destination) {
          navigator.push<void>(MaterialPageRoute(
            builder: (_) => DestinationOverviewScreen(
              slug: destination.slug,
              apiClient: _client,
              onBuildTrip:
                  destination.slug == 'ubud' && widget.onBuildTrip != null
                      ? () {
                          navigator.popUntil((route) => route == discoverRoute);
                          widget.onBuildTrip?.call(TripDestinationChoice.ubud);
                        }
                      : null,
            ),
          ));
        },
      ),
    ));
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
              'No countries yet',
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
                  'Could not load countries',
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
        final codes = _destinationsByCountry.keys.toList()
          ..sort((a, b) => _countryName(a).compareTo(_countryName(b)));
        return ListView.separated(
          key: const Key('discover-list'),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          itemCount: codes.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final code = codes[index];
            return ListTile(
              key: Key('discover-country-$code'),
              title: Text(_countryName(code)),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _openCountry(code),
            );
          },
        );
    }
  }
}

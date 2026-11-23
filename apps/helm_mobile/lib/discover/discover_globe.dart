import 'package:flutter/material.dart';
import 'package:flutter_globe/flutter_globe.dart';
import 'package:helm_api_client/helm_api_client.dart';

import '../theme/helm_colors.dart';
import '../theme/helm_tokens.dart';
import '../theme/helm_typography.dart';
import 'destination_list_item.dart';
import 'destination_overview_screen.dart';
import 'globe_destinations.dart';

/// Immersive Discover globe with destination markers and keyboard picker.
class DiscoverGlobe extends StatefulWidget {
  const DiscoverGlobe({
    super.key,
    required this.apiClient,
    this.seedItems,
    this.catalogComplete = false,
    this.onExplore,
  });

  static const Key statusKey = Key('discover-globe-status');
  static const Key canvasKey = Key('discover-globe-canvas');

  final HelmApiClient apiClient;

  /// When the Discover list already holds the full catalog, reuse it.
  final List<DestinationListItem>? seedItems;

  /// True when [seedItems] covers `total` (no further list pages pending).
  final bool catalogComplete;

  final void Function(DestinationListItem item)? onExplore;

  @override
  State<DiscoverGlobe> createState() => _DiscoverGlobeState();
}

enum _GlobeLoadState { loading, ready, empty, unavailable }

class _DiscoverGlobeState extends State<DiscoverGlobe>
    with TickerProviderStateMixin {
  final GlobeController _controller = GlobeController(
    autoRotate: true,
    autoRotateSpeed: 0.35,
  );

  _GlobeLoadState _state = _GlobeLoadState.loading;
  List<DestinationListItem> _destinations = const [];
  DestinationListItem? _selected;
  bool _autoRotatePaused = false;
  bool _didApplyInitialFocus = false;
  int _generation = 0;

  static const double _markerSize = 6;
  static const double _markerSizeSelected = 9;

  static final GlobeTheme _helmTheme = GlobeSkins.classic.copyWith(
    accentColor: HelmColors.teal,
    surface: const GlobeSurfaceStyle(
      surfaceColor: HelmColors.midnight,
      landColor: Color(0xFF8FA8B3),
      pointSize: 1.55,
      pointOpacity: 0.92,
    ),
    atmosphere: const GlobeAtmosphereStyle(
      visible: true,
      color: HelmColors.teal,
      altitude: 0.18,
      glowIntensity: 0.55,
    ),
  );

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // GlobeController.autoRotate drives the ticker; keep it aligned with
    // MediaQuery.disableAnimations / the Globe.autoRotate prop, and honor
    // a persistent pause after dropdown focus.
    _syncAutoRotate();
  }

  @override
  void didUpdateWidget(covariant DiscoverGlobe oldWidget) {
    super.didUpdateWidget(oldWidget);
    final seedChanged = !identical(oldWidget.seedItems, widget.seedItems) ||
        oldWidget.catalogComplete != widget.catalogComplete;
    if (seedChanged && widget.catalogComplete) {
      _load();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _syncAutoRotate() {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    _controller.autoRotate = !reduceMotion && !_autoRotatePaused;
  }

  Future<void> _load() async {
    final generation = ++_generation;
    setState(() {
      _state = _GlobeLoadState.loading;
      _selected = null;
      _autoRotatePaused = false;
      _didApplyInitialFocus = false;
    });

    try {
      List<DestinationListItem> plotted;
      final seed = widget.seedItems;
      if (widget.catalogComplete && seed != null) {
        plotted = withPlottableCoordinates(seed);
      } else {
        plotted = await fetchAllGlobeDestinations(widget.apiClient);
      }
      if (!mounted || generation != _generation) return;
      setState(() {
        _destinations = plotted;
        _state = plotted.isEmpty
            ? _GlobeLoadState.empty
            : _GlobeLoadState.ready;
      });
      // Do not touch MediaQuery here: _load may still run from initState.
    } catch (_) {
      if (!mounted || generation != _generation) return;
      setState(() => _state = _GlobeLoadState.unavailable);
    }
  }

  List<GlobeMarker> get _markers {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final selectedId = _selected?.id;
    return [
      for (final item in _destinations)
        GlobeMarker(
          coordinate: GlobeCoordinate(
            latitude: item.latitude!,
            longitude: item.longitude!,
          ),
          color: item.id == selectedId ? HelmColors.coral : HelmColors.teal,
          size: item.id == selectedId ? _markerSizeSelected : _markerSize,
          pulse: !reduceMotion,
          pulseColor: (item.id == selectedId ? HelmColors.coral : HelmColors.teal)
              .withValues(alpha: 0.45),
          label: item.nameEn,
          data: item,
        ),
    ];
  }

  void _applyInitialFocusIfNeeded() {
    if (_didApplyInitialFocus || _destinations.isEmpty) return;
    _didApplyInitialFocus = true;
    final first = _destinations.first;
    // Defer lookAt: onReady can fire during build; notifying the controller
    // synchronously would throw and leave the canvas unmounted.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _controller.lookAt(
        GlobeCoordinate(
          latitude: first.latitude!,
          longitude: first.longitude!,
        ),
      );
    });
  }

  void _focusDestination(DestinationListItem item) {
    setState(() => _selected = item);
    _autoRotatePaused = true;
    _controller.stopAutoRotation();
    if (!mounted) return;

    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final coordinate = GlobeCoordinate(
      latitude: item.latitude!,
      longitude: item.longitude!,
    );
    if (reduceMotion) {
      _controller.lookAt(coordinate);
    } else {
      _controller.flyTo(
        coordinate: coordinate,
        vsync: this,
        duration: const Duration(milliseconds: 1000),
        curve: Curves.easeOutCubic,
        zoom: 1.2,
      );
    }
  }

  void _explore(DestinationListItem item) {
    final custom = widget.onExplore;
    if (custom != null) {
      custom(item);
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DestinationOverviewScreen(
          slug: item.slug,
          apiClient: widget.apiClient,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    switch (_state) {
      case _GlobeLoadState.loading:
        return const Padding(
          padding: EdgeInsets.only(bottom: HelmSpacing.lg),
          child: SizedBox(
            height: 280,
            child: Center(
              child: CircularProgressIndicator(
                key: DiscoverGlobe.statusKey,
              ),
            ),
          ),
        );
      case _GlobeLoadState.empty:
        return const SizedBox.shrink();
      case _GlobeLoadState.unavailable:
        return Padding(
          padding: const EdgeInsets.only(bottom: HelmSpacing.lg),
          child: Text(
            'The interactive globe is unavailable right now. Browse destinations below.',
            key: DiscoverGlobe.statusKey,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: HelmColors.ivoryMuted,
                ),
          ),
        );
      case _GlobeLoadState.ready:
        final reduceMotion = MediaQuery.disableAnimationsOf(context);
        return Padding(
          padding: const EdgeInsets.only(bottom: HelmSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                label: 'Interactive destination globe',
                child: Container(
                  key: DiscoverGlobe.canvasKey,
                  height: 320,
                  decoration: BoxDecoration(
                    color: HelmColors.midnight,
                    borderRadius: BorderRadius.circular(HelmRadius.lg),
                    border: Border.all(color: HelmColors.ivoryDivider),
                  ),
                  clipBehavior: Clip.antiAlias,
                  // Fixed-height stage keeps ListView scroll separate from globe drag.
                  child: Globe(
                    controller: _controller,
                    markers: _markers,
                    theme: _helmTheme,
                    projection: GlobeProjection.perspective,
                    autoRotate: !reduceMotion && !_autoRotatePaused,
                    autoRotateSpeed: 0.35,
                    enableZoom: false,
                    interactive: true,
                    introAnimation: reduceMotion
                        ? GlobeIntroAnimations.none
                        : GlobeIntroAnimations.gentle,
                    semanticLabel:
                        'Interactive globe with published destinations',
                    onReady: _applyInitialFocusIfNeeded,
                    onMarkerTap: (marker) {
                      final data = marker.data;
                      if (data is DestinationListItem) {
                        _explore(data);
                      }
                    },
                  ),
                ),
              ),
              const SizedBox(height: HelmSpacing.sm),
              InputDecorator(
                decoration: InputDecoration(
                  labelText: 'Select a destination',
                  labelStyle: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontFamily: HelmFonts.outfit,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(HelmRadius.md),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    key: const Key('discover-globe-picker'),
                    value: _selected?.id,
                    isExpanded: true,
                    hint: const Text('Choose a destination…'),
                    items: [
                      for (final item in _destinations)
                        DropdownMenuItem(
                          value: item.id,
                          child: Text(item.nameEn),
                        ),
                    ],
                    onChanged: (id) {
                      if (id == null) return;
                      DestinationListItem? match;
                      for (final item in _destinations) {
                        if (item.id == id) {
                          match = item;
                          break;
                        }
                      }
                      if (match == null) return;
                      _focusDestination(match);
                    },
                  ),
                ),
              ),
            ],
          ),
        );
    }
  }
}

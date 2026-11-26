import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_globe/flutter_globe.dart';
import 'package:helm_api_client/helm_api_client.dart';

import '../theme/helm_colors.dart';
import '../theme/helm_tokens.dart';
import '../theme/helm_typography.dart';
import '../theme/helm_wrapping_text.dart';
import 'destination_list_item.dart';
import 'destination_overview_screen.dart';
import 'globe_destinations.dart';

/// Immersive Explore globe with destination markers and compact preview.
///
/// Non-globe browsing stays available via the destination list below.
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
  static const Key previewKey = Key('discover-globe-preview');
  static const Key exploreKey = Key('discover-globe-explore');
  static const Key dismissKey = Key('discover-globe-preview-dismiss');

  /// Idle pause before auto-rotation resumes after a marker focus.
  static const Duration idleResumeDelay = Duration(seconds: 8);

  final HelmApiClient apiClient;

  /// When the Discover list already holds the full catalog, reuse it.
  final List<DestinationListItem>? seedItems;

  /// True when [seedItems] covers `total` (no further list pages pending).
  final bool catalogComplete;

  final void Function(DestinationListItem item)? onExplore;

  @override
  DiscoverGlobeState createState() => DiscoverGlobeState();
}

enum _GlobeLoadState { loading, ready, empty, unavailable }

class DiscoverGlobeState extends State<DiscoverGlobe>
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
  Timer? _idleResumeTimer;

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
    _cancelIdleResume();
    _controller.dispose();
    super.dispose();
  }

  void _cancelIdleResume() {
    _idleResumeTimer?.cancel();
    _idleResumeTimer = null;
  }

  void _syncAutoRotate() {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    _controller.autoRotate = !reduceMotion && !_autoRotatePaused;
  }

  void _scheduleIdleResume() {
    _cancelIdleResume();
    if (!mounted) return;
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    if (reduceMotion) return;

    _idleResumeTimer = Timer(DiscoverGlobe.idleResumeDelay, () {
      if (!mounted) return;
      setState(() {
        _autoRotatePaused = false;
        _syncAutoRotate();
      });
    });
  }

  Future<void> _load() async {
    final generation = ++_generation;
    _cancelIdleResume();
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
        _state =
            plotted.isEmpty ? _GlobeLoadState.empty : _GlobeLoadState.ready;
      });
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
    setState(() {
      _selected = item;
      _autoRotatePaused = true;
    });
    _controller.stopAutoRotation();
    _syncAutoRotate();
    _scheduleIdleResume();
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

  /// Test hook: marker taps are package-internal and hard to drive in widgets.
  @visibleForTesting
  void focusDestinationForTest(DestinationListItem item) {
    _focusDestination(item);
  }

  void _dismissPreview() {
    _cancelIdleResume();
    setState(() {
      _selected = null;
      _autoRotatePaused = false;
      _syncAutoRotate();
    });
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

  Widget _compactPreview(DestinationListItem item) {
    final scheme = Theme.of(context).colorScheme;
    final summary = item.availableSummary;

    return Material(
      key: DiscoverGlobe.previewKey,
      color: scheme.surfaceContainer,
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.all(Radius.circular(HelmRadius.md)),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(HelmSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: HelmWrappingText(
                    item.nameEn,
                    style: TextStyle(
                      color: scheme.onSurface,
                      fontFamily: HelmFonts.fraunces,
                      fontSize: 22,
                      fontWeight: FontWeight.w600,
                      height: 1.25,
                      letterSpacing: -0.3,
                    ),
                  ),
                ),
                IconButton(
                  key: DiscoverGlobe.dismissKey,
                  tooltip: 'Dismiss selection',
                  onPressed: _dismissPreview,
                  style: IconButton.styleFrom(
                    minimumSize: const Size(44, 44),
                    tapTargetSize: MaterialTapTargetSize.padded,
                  ),
                  icon: Icon(
                    Icons.close,
                    color: scheme.onSurfaceVariant,
                    size: 20,
                  ),
                ),
              ],
            ),
            if (summary != null) ...[
              const SizedBox(height: HelmSpacing.sm),
              Text(
                summary,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: scheme.onSurface,
                  fontFamily: HelmFonts.outfit,
                  fontFamilyFallback: HelmFonts.arabicFallback,
                  fontSize: 15,
                  height: 1.4,
                ),
              ),
            ],
            const SizedBox(height: HelmSpacing.md),
            FilledButton(
              key: DiscoverGlobe.exploreKey,
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
              onPressed: () => _explore(item),
              child: const Text('Explore destination'),
            ),
          ],
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
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        );
      case _GlobeLoadState.ready:
        final reduceMotion = MediaQuery.disableAnimationsOf(context);
        final selected = _selected;
        return Padding(
          padding: const EdgeInsets.only(bottom: HelmSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                label: 'Interactive destination globe. '
                    'Published destinations are also listed below.',
                child: Container(
                  key: DiscoverGlobe.canvasKey,
                  height: 320,
                  decoration: BoxDecoration(
                    color: HelmColors.midnight,
                    borderRadius: BorderRadius.circular(HelmRadius.lg),
                    border: Border.all(color: HelmColors.ivoryDivider),
                  ),
                  clipBehavior: Clip.antiAlias,
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
                        _focusDestination(data);
                      }
                    },
                  ),
                ),
              ),
              if (selected != null) ...[
                const SizedBox(height: HelmSpacing.md),
                _compactPreview(selected),
              ],
            ],
          ),
        );
    }
  }
}

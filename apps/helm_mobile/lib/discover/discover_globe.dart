import 'package:flutter/material.dart';
import 'package:flutter_globe/flutter_globe.dart';
import 'package:helm_api_client/helm_api_client.dart';

import '../geo/country_label.dart';
import '../theme/helm_colors.dart';
import '../theme/helm_tokens.dart';
import '../theme/helm_typography.dart';
import '../theme/helm_wrapping_text.dart';
import 'destination_list_item.dart';
import 'destination_overview_screen.dart';
import 'globe_destinations.dart';

/// Immersive Discover globe with compact/expanded destination preview.
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
  bool _expanded = false;
  int _generation = 0;

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
    // MediaQuery.disableAnimations / the Globe.autoRotate prop.
    _controller.autoRotate = !MediaQuery.disableAnimationsOf(context);
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

  Future<void> _load() async {
    final generation = ++_generation;
    setState(() {
      _state = _GlobeLoadState.loading;
      _selected = null;
      _expanded = false;
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
    } catch (_) {
      if (!mounted || generation != _generation) return;
      setState(() => _state = _GlobeLoadState.unavailable);
    }
  }

  List<GlobeMarker> get _markers {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    return [
      for (final item in _destinations)
        GlobeMarker(
          coordinate: GlobeCoordinate(
            latitude: item.latitude!,
            longitude: item.longitude!,
          ),
          color: HelmColors.teal,
          size: 6,
          pulse: !reduceMotion,
          pulseColor: HelmColors.teal.withValues(alpha: 0.45),
          label: item.nameEn,
          data: item,
        ),
    ];
  }

  void _select(DestinationListItem item, {required bool keepExpanded}) {
    setState(() {
      _selected = item;
      _expanded = keepExpanded;
    });
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
        duration: const Duration(milliseconds: 700),
        curve: Curves.easeOutCubic,
        zoom: 1.2,
      );
    }
  }

  void _closePreview() {
    setState(() {
      _selected = null;
      _expanded = false;
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
                  child: Stack(
                    children: [
                      // Fixed-height stage keeps ListView scroll separate from globe drag.
                      Positioned.fill(
                        child: Globe(
                          controller: _controller,
                          markers: _markers,
                          theme: _helmTheme,
                          projection: GlobeProjection.perspective,
                          autoRotate: !reduceMotion,
                          autoRotateSpeed: 0.35,
                          enableZoom: false,
                          interactive: true,
                          introAnimation: reduceMotion
                              ? GlobeIntroAnimations.none
                              : GlobeIntroAnimations.gentle,
                          semanticLabel:
                              'Interactive globe with published destinations',
                          onMarkerTap: (marker) {
                            final data = marker.data;
                            if (data is DestinationListItem) {
                              _select(data, keepExpanded: _expanded);
                            }
                          },
                        ),
                      ),
                      if (_selected != null)
                        Positioned(
                          left: 12,
                          right: 12,
                          bottom: 12,
                          child: _GlobePreview(
                            key: DiscoverGlobe.previewKey,
                            destination: _selected!,
                            expanded: _expanded,
                            onExpand: () => setState(() => _expanded = true),
                            onCollapse: () =>
                                setState(() => _expanded = false),
                            onClose: _closePreview,
                            onExplore: () => _explore(_selected!),
                          ),
                        ),
                    ],
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
                      if (id == null) {
                        _closePreview();
                        return;
                      }
                      DestinationListItem? match;
                      for (final item in _destinations) {
                        if (item.id == id) {
                          match = item;
                          break;
                        }
                      }
                      if (match == null) return;
                      _select(match, keepExpanded: _expanded);
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

class _GlobePreview extends StatelessWidget {
  const _GlobePreview({
    super.key,
    required this.destination,
    required this.expanded,
    required this.onExpand,
    required this.onCollapse,
    required this.onClose,
    required this.onExplore,
  });

  final DestinationListItem destination;
  final bool expanded;
  final VoidCallback onExpand;
  final VoidCallback onCollapse;
  final VoidCallback onClose;
  final VoidCallback onExplore;

  @override
  Widget build(BuildContext context) {
    final tags = destination.tags.take(3).toList(growable: false);
    final summary = destination.availableSummary;
    final country = helmCountryLabel(destination.countryCode);

    return Material(
      color: HelmColors.deepOcean,
      elevation: 6,
      borderRadius: BorderRadius.circular(HelmRadius.md),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      HelmWrappingText(
                        destination.nameEn,
                        style: const TextStyle(
                          color: HelmColors.ivory,
                          fontFamily: HelmFonts.fraunces,
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          height: 1.25,
                        ),
                      ),
                      if (destination.displayNameAr != null) ...[
                        const SizedBox(height: 4),
                        HelmWrappingText(
                          destination.displayNameAr!,
                          style: const TextStyle(
                            color: HelmColors.ivory,
                            fontFamily: HelmFonts.plexArabic,
                            fontSize: 16,
                            height: 1.4,
                          ),
                        ),
                      ],
                      if (country != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          country,
                          style: const TextStyle(
                            color: HelmColors.ivoryMuted,
                            fontFamily: HelmFonts.outfit,
                            fontSize: 13,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Wrap(
                  spacing: 6,
                  children: [
                    TextButton(
                      style: TextButton.styleFrom(
                        minimumSize: const Size(44, 44),
                        tapTargetSize: MaterialTapTargetSize.padded,
                      ),
                      onPressed: expanded ? onCollapse : onExpand,
                      child: Text(expanded ? 'Collapse' : 'Expand'),
                    ),
                    TextButton(
                      style: TextButton.styleFrom(
                        minimumSize: const Size(44, 44),
                        tapTargetSize: MaterialTapTargetSize.padded,
                      ),
                      onPressed: onClose,
                      child: const Text('Close'),
                    ),
                  ],
                ),
              ],
            ),
            if (expanded) ...[
              if (summary != null) ...[
                const SizedBox(height: 10),
                Text(
                  summary,
                  style: const TextStyle(
                    color: HelmColors.ivory,
                    fontFamily: HelmFonts.outfit,
                    fontSize: 14,
                    height: 1.45,
                  ),
                ),
              ],
              if (tags.isNotEmpty) ...[
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    for (final tag in tags)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          border: Border.all(color: HelmColors.ivoryDivider),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          tag.replaceAll('_', ' '),
                          style: const TextStyle(
                            color: HelmColors.ivory,
                            fontFamily: HelmFonts.outfit,
                            fontSize: 12,
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ],
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: HelmColors.teal,
                  foregroundColor: HelmColors.white,
                  minimumSize: const Size(0, 44),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(HelmRadius.md),
                  ),
                ),
                onPressed: onExplore,
                child: const Text('Explore'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

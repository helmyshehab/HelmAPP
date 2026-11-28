import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';

import 'auth/fake_traveler_auth.dart';
import 'auth/supabase_traveler_auth.dart';
import 'auth/traveler_session.dart';
import 'build/pending_build_handoff.dart';
import 'build/trip_gen/trip_answers.dart';
import 'build/trip_gen/trip_demo_mode_screen.dart';
import 'build/trip_gen/trip_preview_draft.dart';
import 'config/build_info.dart';
import 'tabs/build_tab.dart';
import 'tabs/discover_tab.dart';
import 'tabs/packages_tab.dart';
import 'tabs/profile_tab.dart';
import 'tabs/trips_tab.dart';
import 'theme/helm_appearance_menu.dart';
import 'theme/helm_theme.dart';
import 'theme/helm_theme_controller.dart';
import 'theme/helm_wordmark.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final themeController = await HelmThemeController.load();
  final auth = await createTravelerAuth();
  runApp(HelmApp(auth: auth, themeController: themeController));
}

/// Helm حلم — traveler shell with Discover + Build draft flow.
class HelmApp extends StatefulWidget {
  HelmApp({
    super.key,
    TravelerAuth? auth,
    HelmThemeController? themeController,
  })  : auth = auth ?? FakeTravelerAuth(),
        themeController = themeController ?? HelmThemeController.memory();

  /// Injected auth for tests; production uses [createTravelerAuth] from [main].
  final TravelerAuth auth;

  /// Restored before [runApp] in production; tests may inject a memory store.
  final HelmThemeController themeController;

  @override
  State<HelmApp> createState() => _HelmAppState();
}

class _HelmAppState extends State<HelmApp> {
  /// Keeps [HelmShell] state across theme-driven [MaterialApp] rebuilds.
  final GlobalKey _shellKey = GlobalKey();

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.themeController,
      builder: (context, _) {
        return MaterialApp(
          title: HelmWordmark.label,
          theme: HelmTheme.light(),
          darkTheme: HelmTheme.dark(),
          themeMode: widget.themeController.mode,
          home: HelmShell(
            key: _shellKey,
            auth: widget.auth,
            themeController: widget.themeController,
          ),
        );
      },
    );
  }
}

class HelmShell extends StatefulWidget {
  const HelmShell({
    super.key,
    required this.auth,
    this.themeController,
    this.apiClient,
    this.allowDemoStaffConfirmation = false,
  });

  final TravelerAuth auth;
  final HelmThemeController? themeController;
  final HelmApiClient? apiClient;
  final bool allowDemoStaffConfirmation;

  @override
  State<HelmShell> createState() => _HelmShellState();
}

class _HelmShellState extends State<HelmShell> {
  static const int _exploreIndex = 0;
  static const int _buildIndex = 1;
  static const int _tripsIndex = 3;
  static const int _profileIndex = 4;

  int index = 0;
  TripDestinationChoice? _buildDestination;
  TripPreviewDraftSnapshot? _buildPackageSnapshot;
  PendingBuildHandoff? _pendingHandoff;
  final GlobalKey _buildTabKey = GlobalKey();
  Route<void>? _tripModeRoute;
  late int _authGeneration;
  TravelerSession? _lastSession;

  @override
  void initState() {
    super.initState();
    _authGeneration = widget.auth.authGeneration;
    _lastSession = widget.auth.session;
    widget.auth.sessionListenable.addListener(_onAuthChanged);
  }

  @override
  void dispose() {
    widget.auth.sessionListenable.removeListener(_onAuthChanged);
    super.dispose();
  }

  void _onAuthChanged() {
    if (_authGeneration != widget.auth.authGeneration) {
      _authGeneration = widget.auth.authGeneration;
      final route = _tripModeRoute;
      if (route != null && route.isActive) {
        Navigator.of(context).removeRoute(route);
      }
      _tripModeRoute = null;
    }

    final session = widget.auth.session;
    final wasSignedOut = _lastSession == null;
    _lastSession = session;
    if (session != null && wasSignedOut) {
      final handoff = _pendingHandoff;
      if (handoff != null) {
        setState(() {
          _pendingHandoff = null;
          _buildDestination = handoff.destination;
          _buildPackageSnapshot = handoff.packageSnapshot;
          index = _buildIndex;
        });
      }
    }
  }

  void _requestBuildDestination(TripDestinationChoice destination) {
    if (widget.auth.session != null) {
      setState(() {
        _pendingHandoff = null;
        _buildPackageSnapshot = null;
        _buildDestination = destination;
        index = _buildIndex;
      });
      return;
    }
    setState(() {
      _buildDestination = null;
      _buildPackageSnapshot = null;
      _pendingHandoff = PendingBuildHandoff.destination(destination);
      index = _profileIndex;
    });
  }

  void _requestCustomizePackage(TripPreviewDraftSnapshot snapshot) {
    if (widget.auth.session != null) {
      setState(() {
        _pendingHandoff = null;
        _buildDestination = null;
        _buildPackageSnapshot = snapshot;
        index = _buildIndex;
      });
      return;
    }
    setState(() {
      _buildDestination = null;
      _buildPackageSnapshot = null;
      _pendingHandoff = PendingBuildHandoff.package(snapshot);
      index = _profileIndex;
    });
  }

  void _openProfileForSignIn() {
    setState(() => index = _profileIndex);
  }

  void _cancelBuildHandoff() {
    setState(() {
      _pendingHandoff = null;
      index = _exploreIndex;
    });
  }

  Future<void> _openTripMode(TripPreviewDraftSnapshot snapshot) async {
    if (widget.auth.session == null || _tripModeRoute != null) return;
    final trip = planFromUbudTripPreviewDraft(snapshot);
    final route = MaterialPageRoute<void>(
      builder: (_) => TripDemoModeScreen(
        destinationName: trip.destinationName,
        days: demoBookingDays(trip, snapshot.includedActivitySlugs),
      ),
    );
    _tripModeRoute = route;
    try {
      await Navigator.of(context).push(route);
    } finally {
      if (identical(_tripModeRoute, route)) _tripModeRoute = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tabs = <Widget>[
      DiscoverTab(
        apiClient: widget.apiClient,
        onBuildTrip: _requestBuildDestination,
      ),
      BuildTab(
        key: _buildTabKey,
        auth: widget.auth,
        apiClient: widget.apiClient,
        initialDestination: _buildDestination,
        initialPackageSnapshot: _buildPackageSnapshot,
        onInitialPackageConsumed: () {
          // Avoid setState during the handoff push so BuildTab is not disposed.
          _buildPackageSnapshot = null;
        },
        onRequestSignIn: _openProfileForSignIn,
        allowDemoStaffConfirmation: widget.allowDemoStaffConfirmation,
      ),
      PackagesTab(
        apiClient: widget.apiClient,
        onCustomizeInBuild: _requestCustomizePackage,
      ),
      TripsTab(
        auth: widget.auth,
        apiClient: widget.apiClient,
        onOpenTrip: _openTripMode,
      ),
      ProfileTab(
        auth: widget.auth,
        themeController: widget.themeController,
        hasPendingBuildHandoff: _pendingHandoff != null,
        onOpenTrips: () => setState(() => index = _tripsIndex),
        onCancelBuildHandoff: _cancelBuildHandoff,
      ),
    ];

    final scaler = MediaQuery.textScalerOf(context);
    final fontSize = Theme.of(context).textTheme.titleLarge?.fontSize ?? 22;
    // The title slot is the screen width minus the toolbar's middle insets.
    // One line keeps the compact bar; two lines grow it, including diacritics.
    final themeController = widget.themeController;
    // Appearance action occupies the trailing slot; keep the lockup math honest.
    final trailingReserve =
        themeController == null ? 0.0 : HelmTheme.minTapTarget.width;
    final titleSlot =
        HelmWordmark.titleSlotWidth(MediaQuery.sizeOf(context).width) -
            trailingReserve;

    final previewLabel = BuildInfo.previewLabel;
    final previewBarHeight = previewLabel.isEmpty ? 0.0 : 22.0;

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: HelmWordmark.toolbarHeight(
              maxWidth: titleSlot,
              fontSize: fontSize,
              textScaler: scaler,
            ) +
            previewBarHeight,
        // The app bar clamps title scaling at 1.34. Restore the system
        // scaler so large text still reaches the lockup.
        title: MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: scaler),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const HelmWordmark(),
              if (previewLabel.isNotEmpty)
                Text(
                  previewLabel,
                  key: const Key('helm-preview-commit'),
                  style: Theme.of(context).textTheme.labelSmall,
                ),
            ],
          ),
        ),
        actions: [
          if (themeController != null)
            HelmAppearanceMenu(controller: themeController),
        ],
      ),
      body: tabs[index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() {
          if (value != index) {
            _buildDestination = null;
            _buildPackageSnapshot = null;
            // Leaving Profile/Build without signing in cancels a guest handoff.
            if (_pendingHandoff != null &&
                widget.auth.session == null &&
                value != _profileIndex &&
                value != _buildIndex) {
              _pendingHandoff = null;
            }
          }
          index = value;
        }),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            label: 'Explore',
          ),
          NavigationDestination(
            icon: Icon(Icons.auto_awesome_outlined),
            label: 'Build',
          ),
          NavigationDestination(
            icon: Icon(Icons.card_travel_outlined),
            label: 'Packages',
          ),
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            label: 'Trips',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';

import 'auth/fake_traveler_auth.dart';
import 'auth/supabase_traveler_auth.dart';
import 'auth/traveler_session.dart';
import 'build/trip_gen/confirmed_demo_trip.dart';
import 'build/trip_gen/trip_answers.dart';
import 'build/trip_gen/trip_demo_mode_screen.dart';
import 'tabs/build_tab.dart';
import 'tabs/discover_tab.dart';
import 'tabs/packages_tab.dart';
import 'tabs/profile_tab.dart';
import 'tabs/trips_tab.dart';
import 'theme/helm_theme.dart';
import 'theme/helm_wordmark.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final auth = await createTravelerAuth();
  runApp(HelmApp(auth: auth));
}

/// Helm حلم — traveler shell with Discover + Build draft flow.
class HelmApp extends StatelessWidget {
  HelmApp({
    super.key,
    TravelerAuth? auth,
  }) : auth = auth ?? FakeTravelerAuth();

  /// Injected auth for tests; production uses [createTravelerAuth] from [main].
  final TravelerAuth auth;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: HelmWordmark.label,
      theme: HelmTheme.light(),
      darkTheme: HelmTheme.dark(),
      themeMode: ThemeMode.system,
      home: HelmShell(auth: auth),
    );
  }
}

class HelmShell extends StatefulWidget {
  const HelmShell({super.key, required this.auth, this.apiClient});

  final TravelerAuth auth;
  final HelmApiClient? apiClient;

  @override
  State<HelmShell> createState() => _HelmShellState();
}

class _HelmShellState extends State<HelmShell> {
  int index = 0;
  TripDestinationChoice? _buildDestination;
  ConfirmedDemoTrip? _confirmedDemoTrip;
  Route<void>? _tripModeRoute;
  late int _authGeneration;

  @override
  void initState() {
    super.initState();
    _authGeneration = widget.auth.authGeneration;
    widget.auth.sessionListenable.addListener(_onAuthChanged);
  }

  @override
  void dispose() {
    widget.auth.sessionListenable.removeListener(_onAuthChanged);
    super.dispose();
  }

  void _onAuthChanged() {
    if (_authGeneration == widget.auth.authGeneration) return;
    _authGeneration = widget.auth.authGeneration;
    final route = _tripModeRoute;
    if (route != null && route.isActive) {
      Navigator.of(context).removeRoute(route);
    }
    _tripModeRoute = null;
    if (_confirmedDemoTrip != null) {
      setState(() => _confirmedDemoTrip = null);
    }
  }

  Future<void> _openTripMode() async {
    final trip = _confirmedDemoTrip;
    if (trip == null || _tripModeRoute != null) return;
    final route = MaterialPageRoute<void>(
      builder: (_) => TripDemoModeScreen(
        destinationName: trip.destinationName,
        days: trip.days,
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
        onBuildTrip: (destination) => setState(() {
          _buildDestination = destination;
          index = 1;
        }),
      ),
      BuildTab(
        auth: widget.auth,
        apiClient: widget.apiClient,
        initialDestination: _buildDestination,
        onDemoTripConfirmed: (trip) =>
            setState(() => _confirmedDemoTrip = trip),
      ),
      const PackagesTab(),
      TripsTab(
        auth: widget.auth,
        apiClient: widget.apiClient,
        trip: _confirmedDemoTrip,
        onOpenTrip: _openTripMode,
      ),
      const ProfileTab(),
    ];

    final scaler = MediaQuery.textScalerOf(context);
    final fontSize = Theme.of(context).textTheme.titleLarge?.fontSize ?? 22;
    // The title slot is the screen width minus the toolbar's middle insets.
    // One line keeps the compact bar; two lines grow it, including diacritics.
    final titleSlot =
        HelmWordmark.titleSlotWidth(MediaQuery.sizeOf(context).width);

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: HelmWordmark.toolbarHeight(
          maxWidth: titleSlot,
          fontSize: fontSize,
          textScaler: scaler,
        ),
        // The app bar clamps title scaling at 1.34. Restore the system
        // scaler so large text still reaches the lockup.
        title: MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: scaler),
          child: const HelmWordmark(),
        ),
      ),
      body: tabs[index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() {
          if (value != index) _buildDestination = null;
          index = value;
        }),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            label: 'Discover',
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

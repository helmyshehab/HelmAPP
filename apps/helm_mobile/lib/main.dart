import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';

import 'auth/fake_traveler_auth.dart';
import 'auth/supabase_traveler_auth.dart';
import 'auth/traveler_session.dart';
import 'build/trip_gen/trip_answers.dart';
import 'tabs/build_tab.dart';
import 'tabs/discover_tab.dart';
import 'tabs/packages_tab.dart';
import 'tabs/profile_tab.dart';
import 'tabs/trips_tab.dart';

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
      title: 'Helm حلم',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0B3D2E)),
        useMaterial3: true,
      ),
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
      ),
      const PackagesTab(),
      const TripsTab(),
      const ProfileTab(),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Helm حلم')),
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

import 'package:flutter/material.dart';
import 'tabs/discover_tab.dart';
import 'tabs/build_tab.dart';
import 'tabs/packages_tab.dart';
import 'tabs/trips_tab.dart';
import 'tabs/profile_tab.dart';

void main() {
  runApp(const HelmApp());
}

/// Helm حلم — Step 2 shell with five empty tabs (no product features).
class HelmApp extends StatelessWidget {
  const HelmApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Helm حلم',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0B3D2E)),
        useMaterial3: true,
      ),
      home: const HelmShell(),
    );
  }
}

class HelmShell extends StatefulWidget {
  const HelmShell({super.key});

  @override
  State<HelmShell> createState() => _HelmShellState();
}

class _HelmShellState extends State<HelmShell> {
  int index = 0;

  static const tabs = <Widget>[
    DiscoverTab(),
    BuildTab(),
    PackagesTab(),
    TripsTab(),
    ProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Helm حلم')),
      body: tabs[index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.explore_outlined), label: 'Discover'),
          NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), label: 'Build'),
          NavigationDestination(icon: Icon(Icons.card_travel_outlined), label: 'Packages'),
          NavigationDestination(icon: Icon(Icons.map_outlined), label: 'Trips'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }
}

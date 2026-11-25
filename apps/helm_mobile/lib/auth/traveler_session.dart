import 'package:flutter/foundation.dart';

/// Authenticated traveler identity + access token for Helm API calls.
@immutable
class TravelerSession {
  const TravelerSession({
    required this.userId,
    required this.accessToken,
  });

  final String userId;
  final String accessToken;
}

/// Minimal traveler auth surface for Build (email/password + session stream).
abstract class TravelerAuth {
  ValueListenable<TravelerSession?> get sessionListenable;

  TravelerSession? get session;

  /// Bumps on sign-out and account switch; stable across access-token refresh.
  int get authGeneration;

  Future<void> signInWithPassword({
    required String email,
    required String password,
  });

  Future<void> signOut();

  void dispose();
}

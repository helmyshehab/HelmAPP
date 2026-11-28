import 'package:flutter/foundation.dart';

/// Authenticated traveler identity + access token for Helm API calls.
@immutable
class TravelerSession {
  const TravelerSession({
    required this.userId,
    required this.accessToken,
    this.email,
    this.displayName,
  });

  final String userId;
  final String accessToken;

  /// Normalized email when the auth provider supplies one.
  final String? email;

  /// Optional display name from auth metadata; never invented.
  final String? displayName;
}

/// Traveler auth surface for Profile and private Build/Trips flows.
abstract class TravelerAuth {
  ValueListenable<TravelerSession?> get sessionListenable;

  TravelerSession? get session;

  /// Bumps on sign-out and account switch; stable across access-token refresh.
  int get authGeneration;

  Future<void> signInWithPassword({
    required String email,
    required String password,
  });

  /// Creates a traveler account. Session is set when the provider returns one
  /// immediately; otherwise the caller should prompt the traveler to confirm.
  Future<void> signUpWithPassword({
    required String email,
    required String password,
  });

  Future<void> signOut();

  void dispose();
}

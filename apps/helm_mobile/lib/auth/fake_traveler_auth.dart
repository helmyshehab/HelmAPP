import 'package:flutter/foundation.dart';

import 'traveler_session.dart';

/// In-memory auth for widget tests — no Supabase dependency.
class FakeTravelerAuth implements TravelerAuth {
  FakeTravelerAuth({TravelerSession? initial})
      : _session = ValueNotifier<TravelerSession?>(initial),
        _identityUserId = initial?.userId;

  final ValueNotifier<TravelerSession?> _session;
  String? _identityUserId;
  int _authGeneration = 0;

  /// Controllable failure for sign-in / sign-out tests.
  Object? nextSignInError;

  @override
  ValueListenable<TravelerSession?> get sessionListenable => _session;

  @override
  TravelerSession? get session => _session.value;

  @override
  int get authGeneration => _authGeneration;

  void _applySession(TravelerSession? next) {
    final nextId = next?.userId;
    if (nextId != _identityUserId) {
      _authGeneration++;
      _identityUserId = nextId;
    }
    _session.value = next;
  }

  /// Test helper: replace the signed-in account without going through sign-in.
  void setSession(TravelerSession? next) {
    _applySession(next);
  }

  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {
    final error = nextSignInError;
    if (error != null) {
      nextSignInError = null;
      throw error;
    }
    final normalized = email.trim().toLowerCase();
    _applySession(
      TravelerSession(
        userId: 'user-$normalized',
        accessToken: 'token-$normalized',
      ),
    );
  }

  @override
  Future<void> signOut() async {
    _applySession(null);
  }

  @override
  void dispose() {
    _session.dispose();
  }
}

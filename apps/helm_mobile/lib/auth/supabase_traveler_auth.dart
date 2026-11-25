import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/supabase_config.dart';
import 'traveler_session.dart';

/// Supabase email/password traveler auth (anon key only).
class SupabaseTravelerAuth implements TravelerAuth {
  SupabaseTravelerAuth._(this._client) {
    final initial = _sessionFrom(_client.auth.currentSession);
    _identityUserId = initial?.userId;
    _session = ValueNotifier<TravelerSession?>(initial);
    _subscription = _client.auth.onAuthStateChange.listen((data) {
      _applySession(_sessionFrom(data.session));
    });
  }

  final SupabaseClient _client;
  late final ValueNotifier<TravelerSession?> _session;
  late final StreamSubscription<AuthState> _subscription;
  String? _identityUserId;
  int _authGeneration = 0;

  /// Initialize Supabase once, then return a bound auth adapter.
  static Future<SupabaseTravelerAuth> create() async {
    if (!SupabaseConfig.isConfigured) {
      throw StateError(
        'Missing HELM_SUPABASE_URL / HELM_SUPABASE_ANON_KEY dart-defines.',
      );
    }
    await Supabase.initialize(
      url: SupabaseConfig.url,
      publishableKey: SupabaseConfig.anonKey,
    );
    return SupabaseTravelerAuth._(Supabase.instance.client);
  }

  static TravelerSession? _sessionFrom(Session? session) {
    final userId = session?.user.id.trim() ?? '';
    final accessToken = session?.accessToken.trim() ?? '';
    if (userId.isEmpty || accessToken.isEmpty) {
      return null;
    }
    return TravelerSession(userId: userId, accessToken: accessToken);
  }

  void _applySession(TravelerSession? next) {
    final nextId = next?.userId;
    if (nextId != _identityUserId) {
      _authGeneration++;
      _identityUserId = nextId;
    }
    _session.value = next;
  }

  @override
  ValueListenable<TravelerSession?> get sessionListenable => _session;

  @override
  TravelerSession? get session => _session.value;

  @override
  int get authGeneration => _authGeneration;

  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {
    final response = await _client.auth.signInWithPassword(
      email: email.trim().toLowerCase(),
      password: password,
    );
    _applySession(_sessionFrom(response.session));
  }

  @override
  Future<void> signOut() async {
    await _client.auth.signOut();
    _applySession(null);
  }

  @override
  void dispose() {
    _subscription.cancel();
    _session.dispose();
  }
}

/// Creates production auth when Supabase is configured; otherwise a no-op stub.
Future<TravelerAuth> createTravelerAuth() async {
  if (!SupabaseConfig.isConfigured) {
    return _UnconfiguredTravelerAuth();
  }
  return SupabaseTravelerAuth.create();
}

class _UnconfiguredTravelerAuth implements TravelerAuth {
  final ValueNotifier<TravelerSession?> _session =
      ValueNotifier<TravelerSession?>(null);

  @override
  ValueListenable<TravelerSession?> get sessionListenable => _session;

  @override
  TravelerSession? get session => null;

  @override
  int get authGeneration => 0;

  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {
    throw StateError(
      'Supabase is not configured. Pass HELM_SUPABASE_URL and '
      'HELM_SUPABASE_ANON_KEY via --dart-define.',
    );
  }

  @override
  Future<void> signOut() async {}

  @override
  void dispose() {
    _session.dispose();
  }
}

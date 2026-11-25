import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:http/http.dart' as http;

import '../auth/traveler_session.dart';
import '../build/draft_editor_screen.dart';
import '../build/draft_title_patch.dart';
import '../build/sign_in_panel.dart';
import '../build/trip_gen/trip_answers.dart';
import '../build/trip_gen/trip_flow_routes.dart';
import '../build/trip_gen/trip_preview_draft.dart';
import '../build/trip_gen/trip_preview_screen.dart';
import '../build/trip_gen/trip_questionnaire_screen.dart';
import '../config/api_config.dart';

/// Build tab — private trip drafts for the signed-in traveler.
class BuildTab extends StatefulWidget {
  const BuildTab({
    super.key,
    required this.auth,
    this.apiClient,
    this.initialDestination,
  });

  final TravelerAuth auth;
  final TripDestinationChoice? initialDestination;

  /// Injectable for tests; production uses [ApiConfig.apiBaseUrl].
  final HelmApiClient? apiClient;

  @override
  State<BuildTab> createState() => _BuildTabState();
}

enum _BuildLoadState { signedOut, loading, empty, failure, success }

class _BuildTabState extends State<BuildTab> {
  late final bool _ownsHttpClient;
  http.Client? _ownedHttp;
  late final HelmApiClient _client;

  _BuildLoadState _state = _BuildLoadState.signedOut;
  List<TripDraft> _drafts = const [];
  Object? _error;
  bool _creating = false;
  String? _boundUserId;
  TripAnswers _tripAnswers = const TripAnswers();
  TripDestinationChoice? _pendingDestination;

  @override
  void initState() {
    super.initState();
    _pendingDestination = widget.initialDestination;
    final injected = widget.apiClient;
    if (injected != null) {
      _ownsHttpClient = false;
      _client = injected;
    } else {
      _ownsHttpClient = true;
      _ownedHttp = http.Client();
      _client = HelmApiClient(
        baseUrl: ApiConfig.apiBaseUrl,
        httpClient: _ownedHttp,
      );
    }
    widget.auth.sessionListenable.addListener(_onAuthChanged);
    _onAuthChanged();
  }

  @override
  void dispose() {
    widget.auth.sessionListenable.removeListener(_onAuthChanged);
    if (_ownsHttpClient) {
      _ownedHttp?.close();
    }
    super.dispose();
  }

  bool _isAuthCurrent(int generation) =>
      widget.auth.authGeneration == generation;

  void _onAuthChanged() {
    final session = widget.auth.session;
    final nextUserId = session?.userId;
    // Same identity (including access-token refresh) keeps in-flight work valid.
    if (nextUserId == _boundUserId) {
      return;
    }
    _clearPrivateDraftState();
    _boundUserId = nextUserId;
    if (session == null) {
      if (!mounted) return;
      setState(() => _state = _BuildLoadState.signedOut);
      return;
    }
    _loadDrafts();
    if (_pendingDestination != null) {
      final generation = widget.auth.authGeneration;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || !_isAuthCurrent(generation)) return;
        final destination = _pendingDestination;
        if (destination == null) return;
        _pendingDestination = null;
        _tripAnswers = _tripAnswers.copyWith(destination: destination);
        _openTripBuilder();
      });
    }
  }

  void _clearPrivateDraftState() {
    _drafts = const [];
    _error = null;
    _creating = false;
    _tripAnswers = const TripAnswers();
  }

  Future<void> _openTripBuilder() async {
    // CTA always starts a new private draft lifecycle; reopen uses the list.
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        settings: const RouteSettings(name: tripQuestionnaireRouteName),
        builder: (_) => TripQuestionnaireScreen(
          auth: widget.auth,
          apiClient: _client,
          initialAnswers: _tripAnswers,
          onAnswersChanged: (next) {
            _tripAnswers = next;
          },
        ),
      ),
    );
    if (!mounted) return;
    final session = widget.auth.session;
    if (session != null && session.userId == _boundUserId) {
      await _loadDrafts();
    } else {
      setState(() {});
    }
  }

  Future<void> _loadDrafts() async {
    final session = widget.auth.session;
    if (session == null) {
      if (!mounted) return;
      setState(() => _state = _BuildLoadState.signedOut);
      return;
    }
    final generation = widget.auth.authGeneration;

    setState(() {
      _state = _BuildLoadState.loading;
      _error = null;
    });

    try {
      await _client.bootstrapCustomerProfile(accessToken: session.accessToken);
      final response =
          await _client.listTripDrafts(accessToken: session.accessToken);
      if (!mounted || !_isAuthCurrent(generation)) return;
      setState(() {
        _drafts = response.items;
        _state = response.items.isEmpty
            ? _BuildLoadState.empty
            : _BuildLoadState.success;
      });
    } catch (e) {
      if (!mounted || !_isAuthCurrent(generation)) return;
      setState(() {
        _error = e;
        _state = _BuildLoadState.failure;
      });
    }
  }

  Future<void> _createDraft() async {
    if (!canStartMutation(_creating)) return;
    final session = widget.auth.session;
    if (session == null) return;
    final generation = widget.auth.authGeneration;

    setState(() => _creating = true);
    try {
      await _client.bootstrapCustomerProfile(accessToken: session.accessToken);
      final draft = await _client.createTripDraft(
        accessToken: session.accessToken,
      );
      if (!mounted || !_isAuthCurrent(generation)) return;
      setState(() => _creating = false);
      await _openDraft(draft, session.userId);
      if (mounted && _isAuthCurrent(generation)) {
        await _loadDrafts();
      }
    } catch (e) {
      if (!mounted || !_isAuthCurrent(generation)) return;
      setState(() {
        _creating = false;
        _error = e;
        _state = _BuildLoadState.failure;
      });
    }
  }

  Future<void> _openDraft(TripDraft draft, String ownerUserId) async {
    final snapshot = tryParseUbudTripPreviewDraft(draft.constraints);
    if (snapshot != null) {
      _tripAnswers = snapshot.answers;
      final plan = planFromUbudTripPreviewDraft(snapshot);
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          settings: const RouteSettings(name: tripPreviewRouteName),
          builder: (_) => TripPreviewScreen(
            plan: plan,
            auth: widget.auth,
            apiClient: _client,
            draftId: draft.id,
            initialFlightId: snapshot.flightId,
            initialHotelSlug: snapshot.hotelSlug,
            initialIncludedActivitySlugs: snapshot.includedActivitySlugs,
            onAnswersChanged: (next) {
              _tripAnswers = next;
            },
          ),
        ),
      );
      if (!mounted) return;
      final session = widget.auth.session;
      if (session != null && session.userId == _boundUserId) {
        await _loadDrafts();
      }
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DraftEditorScreen(
          apiClient: _client,
          auth: widget.auth,
          draftId: draft.id,
          ownerUserId: ownerUserId,
        ),
      ),
    );
    if (!mounted) return;
    final session = widget.auth.session;
    if (session != null && session.userId == _boundUserId) {
      await _loadDrafts();
    }
  }

  Future<void> _signOut() async {
    await widget.auth.signOut();
  }

  @override
  Widget build(BuildContext context) {
    switch (_state) {
      case _BuildLoadState.signedOut:
        return SignInPanel(auth: widget.auth);
      case _BuildLoadState.loading:
        return const Center(
          child: CircularProgressIndicator(key: Key('build-loading')),
        );
      case _BuildLoadState.empty:
        return Column(
          children: [
            _toolbar(),
            _buildTripCta(),
            const Expanded(
              child: Center(
                child: Text(
                  'No drafts yet',
                  key: Key('build-empty'),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: OutlinedButton(
                key: const Key('build-create'),
                onPressed: _creating ? null : _createDraft,
                child: Text(_creating ? 'Creating…' : 'New draft'),
              ),
            ),
          ],
        );
      case _BuildLoadState.failure:
        return Column(
          children: [
            _toolbar(),
            _buildTripCta(),
            Expanded(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Could not load drafts',
                        key: const Key('build-failure'),
                        style: Theme.of(context).textTheme.titleMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _error?.toString() ?? 'Unknown error',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        key: const Key('build-retry'),
                        onPressed: _loadDrafts,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      case _BuildLoadState.success:
        final session = widget.auth.session;
        return Column(
          children: [
            _toolbar(
              trailing: TextButton(
                key: const Key('build-create'),
                onPressed: _creating ? null : _createDraft,
                child: Text(_creating ? 'Creating…' : 'New draft'),
              ),
            ),
            _buildTripCta(),
            Expanded(
              child: ListView.separated(
                key: const Key('build-draft-list'),
                itemCount: _drafts.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final draft = _drafts[index];
                  return ListTile(
                    key: Key('build-draft-${draft.id}'),
                    title: Text(draftListLabel(draft)),
                    subtitle: Text('Updated ${draft.updatedAt}'),
                    onTap: session == null
                        ? null
                        : () => _openDraft(draft, session.userId),
                  );
                },
              ),
            ),
          ],
        );
    }
  }

  Widget _buildTripCta() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FilledButton(
            key: const Key('build-my-trip'),
            onPressed: _openTripBuilder,
            child: const Text('Build my trip'),
          ),
          const SizedBox(height: 4),
          Text(
            'Local Ubud trip preview — no paid AI in this demo.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  Widget _toolbar({Widget? trailing}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        children: [
          if (trailing != null) trailing,
          const Spacer(),
          TextButton(
            key: const Key('build-sign-out'),
            onPressed: _signOut,
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}

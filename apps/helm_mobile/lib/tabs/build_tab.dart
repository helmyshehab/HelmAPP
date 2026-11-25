import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:http/http.dart' as http;

import '../auth/traveler_session.dart';
import '../build/draft_editor_screen.dart';
import '../build/draft_title_patch.dart';
import '../build/sign_in_panel.dart';
import '../config/api_config.dart';

/// Build tab — private trip drafts for the signed-in traveler.
class BuildTab extends StatefulWidget {
  const BuildTab({
    super.key,
    required this.auth,
    this.apiClient,
  });

  final TravelerAuth auth;

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

  @override
  void initState() {
    super.initState();
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
  }

  void _clearPrivateDraftState() {
    _drafts = const [];
    _error = null;
    _creating = false;
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
      await _openDraft(draft.id, session.userId);
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

  Future<void> _openDraft(String draftId, String ownerUserId) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DraftEditorScreen(
          apiClient: _client,
          auth: widget.auth,
          draftId: draftId,
          ownerUserId: ownerUserId,
        ),
      ),
    );
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
              padding: const EdgeInsets.all(16),
              child: FilledButton(
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
                        : () => _openDraft(draft.id, session.userId),
                  );
                },
              ),
            ),
          ],
        );
    }
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

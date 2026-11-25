import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';

import '../auth/traveler_session.dart';
import 'draft_title_patch.dart';

/// Edit and save a private trip draft title (destination/constraints omitted).
class DraftEditorScreen extends StatefulWidget {
  const DraftEditorScreen({
    super.key,
    required this.apiClient,
    required this.auth,
    required this.draftId,
    required this.ownerUserId,
  });

  final HelmApiClient apiClient;
  final TravelerAuth auth;
  final String draftId;
  final String ownerUserId;

  @override
  State<DraftEditorScreen> createState() => _DraftEditorScreenState();
}

enum _EditorLoadState { loading, notFound, failure, ready, cleared }

class _DraftEditorScreenState extends State<DraftEditorScreen> {
  final _titleController = TextEditingController();
  _EditorLoadState _state = _EditorLoadState.loading;
  TripDraft? _saved;
  Object? _error;
  String? _saveError;
  String? _saveMessage;
  bool _saving = false;
  late String _boundUserId;
  late int _boundGeneration;

  @override
  void initState() {
    super.initState();
    _boundUserId = widget.ownerUserId;
    _boundGeneration = widget.auth.authGeneration;
    widget.auth.sessionListenable.addListener(_onAuthChanged);
    _load();
  }

  @override
  void dispose() {
    widget.auth.sessionListenable.removeListener(_onAuthChanged);
    _titleController.dispose();
    super.dispose();
  }

  bool _isAuthCurrent(int generation) =>
      widget.auth.authGeneration == generation;

  void _onAuthChanged() {
    final next = widget.auth.session;
    final generationChanged =
        widget.auth.authGeneration != _boundGeneration;
    final identityChanged = next?.userId != _boundUserId;
    if (!identityChanged && !generationChanged) {
      // Access-token refresh for the same account — keep editor valid.
      return;
    }
    if (!mounted) return;
    setState(_clearPrivateState);
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  void _clearPrivateState() {
    _saved = null;
    _titleController.clear();
    _saveError = null;
    _saveMessage = null;
    _error = null;
    _saving = false;
    _state = _EditorLoadState.cleared;
  }

  Future<void> _load() async {
    final session = widget.auth.session;
    final generation = widget.auth.authGeneration;
    if (session == null ||
        session.userId != _boundUserId ||
        generation != _boundGeneration) {
      if (!mounted) return;
      setState(_clearPrivateState);
      return;
    }

    setState(() {
      _state = _EditorLoadState.loading;
      _error = null;
      _saveError = null;
      _saveMessage = null;
    });

    try {
      final draft = await widget.apiClient.getTripDraft(
        accessToken: session.accessToken,
        id: widget.draftId,
      );
      if (!mounted || !_isAuthCurrent(generation)) return;
      // After clear, never repopulate from a stale lifecycle.
      if (_state == _EditorLoadState.cleared) return;
      setState(() {
        _saved = draft;
        _titleController.text = draft.title ?? '';
        _state = _EditorLoadState.ready;
      });
    } catch (e) {
      if (!mounted || !_isAuthCurrent(generation)) return;
      if (_state == _EditorLoadState.cleared) return;
      setState(() {
        _error = e;
        _state = isTripDraftNotFoundError(e)
            ? _EditorLoadState.notFound
            : _EditorLoadState.failure;
      });
    }
  }

  Future<void> _save() async {
    if (!canStartMutation(_saving)) return;

    final session = widget.auth.session;
    final saved = _saved;
    if (session == null || saved == null) return;
    final generation = widget.auth.authGeneration;

    setState(() {
      _saving = true;
      _saveError = null;
      _saveMessage = null;
    });

    final formTitle = _titleController.text;
    final patch = buildTitleOnlyPatch(saved: saved, formTitle: formTitle);

    try {
      final TripDraft next;
      if (!patch.shouldPatch) {
        next = saved;
      } else {
        next = await widget.apiClient.updateTripDraft(
          accessToken: session.accessToken,
          id: saved.id,
          title: patch.title,
        );
      }
      if (!mounted || !_isAuthCurrent(generation)) return;
      if (_state == _EditorLoadState.cleared) return;
      setState(() {
        _saved = next;
        _titleController.text = next.title ?? '';
        _saveMessage = 'Draft saved.';
        _saving = false;
      });
    } catch (e) {
      if (!mounted || !_isAuthCurrent(generation)) return;
      if (_state == _EditorLoadState.cleared) return;
      // Keep the typed title after a failed save.
      setState(() {
        _saveError = e.toString();
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Draft'),
      ),
      body: switch (_state) {
        _EditorLoadState.loading => const Center(
            child: CircularProgressIndicator(key: Key('draft-loading')),
          ),
        _EditorLoadState.cleared => const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'Signed out',
                key: Key('draft-cleared'),
                textAlign: TextAlign.center,
              ),
            ),
          ),
        _EditorLoadState.notFound => const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'Draft not found',
                key: Key('draft-not-found'),
                textAlign: TextAlign.center,
              ),
            ),
          ),
        _EditorLoadState.failure => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Could not load draft',
                    key: const Key('draft-failure'),
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
                    key: const Key('draft-retry'),
                    onPressed: _load,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        _EditorLoadState.ready => Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  key: const Key('draft-title-field'),
                  controller: _titleController,
                  enabled: !_saving,
                  decoration: const InputDecoration(
                    labelText: 'Title',
                    border: OutlineInputBorder(),
                  ),
                ),
                if (_saveError != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _saveError!,
                    key: const Key('draft-save-error'),
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ],
                if (_saveMessage != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _saveMessage!,
                    key: const Key('draft-save-success'),
                  ),
                ],
                const SizedBox(height: 16),
                FilledButton(
                  key: const Key('draft-save'),
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Saving…' : 'Save draft'),
                ),
              ],
            ),
          ),
      },
    );
  }
}

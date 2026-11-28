import 'package:flutter/material.dart';

import '../auth/traveler_session.dart';
import '../theme/helm_appearance_menu.dart';
import '../theme/helm_theme_controller.dart';
import '../theme/helm_tokens.dart';

enum _ProfileAuthMode { signIn, createAccount }

/// Traveler Profile — account session, appearance, and Trips shortcut.
class ProfileTab extends StatefulWidget {
  const ProfileTab({
    super.key,
    required this.auth,
    this.themeController,
    this.hasPendingBuildHandoff = false,
    this.onOpenTrips,
    this.onCancelBuildHandoff,
  });

  final TravelerAuth auth;
  final HelmThemeController? themeController;

  /// True when Explore/Packages sent the traveler here to unlock Build.
  final bool hasPendingBuildHandoff;

  final VoidCallback? onOpenTrips;
  final VoidCallback? onCancelBuildHandoff;

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  _ProfileAuthMode _mode = _ProfileAuthMode.signIn;
  bool _pending = false;
  String? _error;
  String? _info;

  @override
  void initState() {
    super.initState();
    widget.auth.sessionListenable.addListener(_onSessionChanged);
  }

  @override
  void dispose() {
    widget.auth.sessionListenable.removeListener(_onSessionChanged);
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _onSessionChanged() {
    if (!mounted) return;
    setState(() {
      _pending = false;
      _error = null;
      if (widget.auth.session != null) {
        _info = null;
        _password.clear();
      }
    });
  }

  Future<void> _submit() async {
    if (_pending) return;
    final email = _email.text.trim().toLowerCase();
    final password = _password.text;
    if (!email.contains('@')) {
      setState(() => _error = 'Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setState(() => _error = 'Password must be at least 8 characters.');
      return;
    }

    setState(() {
      _pending = true;
      _error = null;
      _info = null;
    });

    try {
      if (_mode == _ProfileAuthMode.signIn) {
        await widget.auth.signInWithPassword(email: email, password: password);
      } else {
        await widget.auth.signUpWithPassword(email: email, password: password);
        if (!mounted) return;
        if (widget.auth.session == null) {
          setState(() {
            _pending = false;
            _info =
                'Account created. Confirm your email, then sign in to continue.';
            _mode = _ProfileAuthMode.signIn;
          });
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _pending = false;
      });
    }
  }

  Future<void> _signOut() async {
    if (_pending) return;
    setState(() {
      _pending = true;
      _error = null;
      _info = null;
    });
    try {
      await widget.auth.signOut();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _pending = false;
      });
      return;
    }
    if (!mounted) return;
    setState(() => _pending = false);
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.auth.session;
    return ListenableBuilder(
      listenable: widget.auth.sessionListenable,
      builder: (context, _) {
        final current = widget.auth.session ?? session;
        return current == null ? _guestBody(context) : _signedInBody(context, current);
      },
    );
  }

  Widget _guestBody(BuildContext context) {
    final theme = Theme.of(context);
    final isCreate = _mode == _ProfileAuthMode.createAccount;
    return ListView(
      key: const Key('profile-guest'),
      padding: const EdgeInsets.all(HelmSpacing.screen),
      children: [
        Text(
          'Profile',
          style: theme.textTheme.headlineMedium,
        ),
        const SizedBox(height: HelmSpacing.sm),
        Text(
          isCreate
              ? 'Create a traveler account to save private trip drafts.'
              : 'Sign in to save private trip drafts and manage your trips.',
          style: theme.textTheme.bodyMedium,
        ),
        if (widget.hasPendingBuildHandoff) ...[
          const SizedBox(height: HelmSpacing.md),
          Text(
            'Sign in to continue the trip you started.',
            key: const Key('profile-pending-handoff'),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.primary,
            ),
          ),
        ],
        const SizedBox(height: HelmSpacing.xl),
        TextField(
          key: const Key('profile-sign-in-email'),
          controller: _email,
          enabled: !_pending,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.username],
          decoration: const InputDecoration(
            labelText: 'Email',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: HelmSpacing.md),
        TextField(
          key: const Key('profile-sign-in-password'),
          controller: _password,
          enabled: !_pending,
          obscureText: true,
          autofillHints: const [AutofillHints.password],
          decoration: const InputDecoration(
            labelText: 'Password',
            border: OutlineInputBorder(),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: HelmSpacing.md),
          Text(
            _error!,
            key: const Key('profile-auth-error'),
            style: TextStyle(color: theme.colorScheme.error),
          ),
        ],
        if (_info != null) ...[
          const SizedBox(height: HelmSpacing.md),
          Text(
            _info!,
            key: const Key('profile-auth-info'),
            style: theme.textTheme.bodyMedium,
          ),
        ],
        const SizedBox(height: HelmSpacing.lg),
        FilledButton(
          key: isCreate
              ? const Key('profile-create-account-submit')
              : const Key('profile-sign-in-submit'),
          onPressed: _pending ? null : _submit,
          child: Text(
            _pending
                ? (isCreate ? 'Creating…' : 'Signing in…')
                : (isCreate ? 'Create account' : 'Sign in'),
          ),
        ),
        const SizedBox(height: HelmSpacing.sm),
        TextButton(
          key: isCreate
              ? const Key('profile-switch-to-sign-in')
              : const Key('profile-switch-to-create-account'),
          onPressed: _pending
              ? null
              : () => setState(() {
                    _mode = isCreate
                        ? _ProfileAuthMode.signIn
                        : _ProfileAuthMode.createAccount;
                    _error = null;
                    _info = null;
                  }),
          child: Text(
            isCreate
                ? 'Already have an account? Sign in'
                : 'Need an account? Create account',
          ),
        ),
        if (widget.hasPendingBuildHandoff &&
            widget.onCancelBuildHandoff != null) ...[
          const SizedBox(height: HelmSpacing.sm),
          OutlinedButton(
            key: const Key('profile-cancel-handoff'),
            onPressed: _pending ? null : widget.onCancelBuildHandoff,
            child: const Text('Continue browsing'),
          ),
        ],
        if (widget.themeController != null) ...[
          const SizedBox(height: HelmSpacing.xxl),
          _appearanceRow(context, widget.themeController!),
        ],
      ],
    );
  }

  Widget _signedInBody(BuildContext context, TravelerSession session) {
    final theme = Theme.of(context);
    final name = session.displayName?.trim();
    final email = session.email?.trim();
    return ListView(
      key: const Key('profile-signed-in'),
      padding: const EdgeInsets.all(HelmSpacing.screen),
      children: [
        Text(
          'Profile',
          style: theme.textTheme.headlineMedium,
        ),
        const SizedBox(height: HelmSpacing.xl),
        if (name != null && name.isNotEmpty) ...[
          Text(
            name,
            key: const Key('profile-display-name'),
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: HelmSpacing.xs),
        ],
        Text(
          email == null || email.isEmpty ? 'Signed in' : email,
          key: const Key('profile-email'),
          style: theme.textTheme.bodyLarge,
        ),
        const SizedBox(height: HelmSpacing.xl),
        if (widget.onOpenTrips != null)
          ListTile(
            key: const Key('profile-my-trips'),
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.map_outlined),
            title: const Text('My trips'),
            trailing: const Icon(Icons.chevron_right),
            onTap: widget.onOpenTrips,
          ),
        if (widget.themeController != null) ...[
          const SizedBox(height: HelmSpacing.md),
          _appearanceRow(context, widget.themeController!),
        ],
        if (_error != null) ...[
          const SizedBox(height: HelmSpacing.md),
          Text(
            _error!,
            key: const Key('profile-auth-error'),
            style: TextStyle(color: theme.colorScheme.error),
          ),
        ],
        const SizedBox(height: HelmSpacing.xl),
        OutlinedButton(
          key: const Key('profile-sign-out'),
          onPressed: _pending ? null : _signOut,
          child: Text(_pending ? 'Signing out…' : 'Sign out'),
        ),
      ],
    );
  }

  Widget _appearanceRow(BuildContext context, HelmThemeController controller) {
    final theme = Theme.of(context);
    return Row(
      key: const Key('profile-appearance'),
      children: [
        Expanded(
          child: Text(
            'Appearance',
            style: theme.textTheme.titleMedium,
          ),
        ),
        HelmAppearanceMenu(controller: controller),
      ],
    );
  }
}

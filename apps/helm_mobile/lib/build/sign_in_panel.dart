import 'package:flutter/material.dart';

import '../auth/traveler_session.dart';

/// Minimal email/password sign-in for Build.
class SignInPanel extends StatefulWidget {
  const SignInPanel({
    super.key,
    required this.auth,
  });

  final TravelerAuth auth;

  @override
  State<SignInPanel> createState() => _SignInPanelState();
}

class _SignInPanelState extends State<SignInPanel> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _pending = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
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
    });

    try {
      await widget.auth.signInWithPassword(email: email, password: password);
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
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Sign in to build',
            key: const Key('build-signed-out'),
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Private trip drafts are saved to your traveler account.',
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          TextField(
            key: const Key('build-sign-in-email'),
            controller: _email,
            enabled: !_pending,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.username],
            decoration: const InputDecoration(
              labelText: 'Email',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            key: const Key('build-sign-in-password'),
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
            const SizedBox(height: 12),
            Text(
              _error!,
              key: const Key('build-sign-in-error'),
              style: TextStyle(color: Theme.of(context).colorScheme.error),
              textAlign: TextAlign.center,
            ),
          ],
          const SizedBox(height: 16),
          FilledButton(
            key: const Key('build-sign-in-submit'),
            onPressed: _pending ? null : _submit,
            child: Text(_pending ? 'Signing in…' : 'Sign in'),
          ),
        ],
      ),
    );
  }
}

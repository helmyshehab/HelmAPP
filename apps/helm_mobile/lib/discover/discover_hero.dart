import 'package:flutter/material.dart';

import '../theme/helm_tokens.dart';
import '../theme/helm_typography.dart';
import '../theme/helm_wrapping_text.dart';

/// Explore tab heading. No subtitle or browse dock.
class DiscoverHero extends StatelessWidget {
  const DiscoverHero({super.key});

  static const Key headingKey = Key('explore-heading');

  @override
  Widget build(BuildContext context) {
    final onSurface = Theme.of(context).colorScheme.onSurface;

    return Padding(
      padding: const EdgeInsets.only(top: HelmSpacing.sm, bottom: HelmSpacing.lg),
      child: HelmWrappingText(
        'Explore with HELM',
        key: headingKey,
        style: TextStyle(
          color: onSurface,
          fontFamily: HelmFonts.fraunces,
          fontSize: 40,
          fontWeight: FontWeight.w600,
          height: 1.25,
          letterSpacing: -0.4,
        ),
      ),
    );
  }
}

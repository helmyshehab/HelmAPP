import 'package:flutter/material.dart';

import '../theme/helm_colors.dart';
import '../theme/helm_tokens.dart';
import '../theme/helm_typography.dart';
import '../theme/helm_wrapping_text.dart';

/// Compact editorial header and the control that reaches the destination list.
class DiscoverHero extends StatelessWidget {
  const DiscoverHero({super.key, required this.onBrowse});

  static const Key browseKey = Key('discover-browse');

  final VoidCallback onBrowse;

  @override
  Widget build(BuildContext context) {
    final onSurface = Theme.of(context).colorScheme.onSurface;

    return Padding(
      padding: const EdgeInsets.only(top: HelmSpacing.sm, bottom: HelmSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          HelmWrappingText(
            'Discover',
            style: TextStyle(
              color: onSurface,
              fontFamily: HelmFonts.fraunces,
              fontSize: 40,
              fontWeight: FontWeight.w600,
              height: 1.25,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: HelmSpacing.sm),
          HelmWrappingText(
            'Browse published destinations.',
            style: TextStyle(
              color: onSurface,
              fontFamily: HelmFonts.outfit,
              fontSize: 16,
              height: 1.45,
            ),
          ),
          const SizedBox(height: HelmSpacing.lg),
          FilledButton(
            key: browseKey,
            style: FilledButton.styleFrom(
              backgroundColor: HelmColors.teal,
              foregroundColor: HelmColors.white,
              disabledBackgroundColor: HelmColors.teal,
              disabledForegroundColor: HelmColors.white,
              minimumSize: const Size(0, 44),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              tapTargetSize: MaterialTapTargetSize.padded,
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.all(Radius.circular(HelmRadius.md)),
              ),
              textStyle: const TextStyle(
                fontFamily: HelmFonts.outfit,
                fontSize: 16,
                fontWeight: FontWeight.w500,
                height: 1.2,
              ),
            ),
            onPressed: onBrowse,
            child: const HelmWrappingText('Browse destinations'),
          ),
        ],
      ),
    );
  }
}

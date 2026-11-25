import 'package:flutter/material.dart';

import '../geo/country_label.dart';
import '../theme/helm_colors.dart';
import '../theme/helm_directional_text.dart';
import '../theme/helm_tokens.dart';
import '../theme/helm_typography.dart';
import '../theme/helm_wrapping_text.dart';
import 'destination_list_item.dart';

/// Editorial destination card. The whole surface opens the overview.
class DestinationCard extends StatelessWidget {
  const DestinationCard({
    super.key,
    required this.item,
    required this.onTap,
    this.editorial = false,
  });

  final DestinationListItem item;
  final VoidCallback onTap;

  /// Larger treatment for the first API-featured destination.
  final bool editorial;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final lead = editorial && !dark;
    final foreground = dark || lead ? HelmColors.ivory : HelmColors.midnight;
    final nameSize = editorial ? 32.0 : 22.0;
    final summary = item.availableSummary;
    final arabicName = item.displayNameAr;
    final country = helmCountryLabel(item.countryCode);
    final tags = item.tags.take(3).map(_tagLabel).toList(growable: false);

    return Material(
      key: Key('discover-item-${item.slug}'),
      color: dark
          ? HelmColors.deepOcean
          : lead
              ? HelmColors.midnight
              : HelmColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.all(Radius.circular(HelmRadius.lg)),
        side: BorderSide(
          color: dark || lead
              ? HelmColors.ivoryDivider
              : HelmColors.midnightDivider,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.all(editorial ? 22 : HelmSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (item.isFeatured) ...[
                const _FeaturedChip(),
                const SizedBox(height: HelmSpacing.md),
              ],
              HelmWrappingText(
                item.nameEn,
                style: TextStyle(
                  color: foreground,
                  fontFamily: HelmFonts.fraunces,
                  fontSize: nameSize,
                  fontWeight: FontWeight.w600,
                  height: 1.25,
                  letterSpacing: -0.3,
                ),
              ),
              if (arabicName != null) ...[
                const SizedBox(height: HelmSpacing.xs),
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: HelmDirectionalText(
                    arabicName,
                    textWidthBasis: TextWidthBasis.longestLine,
                    style: TextStyle(
                      color: foreground,
                      fontFamily: HelmFonts.plexArabic,
                      fontFamilyFallback: HelmFonts.arabicFallback,
                      fontSize: editorial ? 18 : 16,
                      height: 1.5,
                    ),
                  ),
                ),
              ],
              if (country != null) ...[
                const SizedBox(height: HelmSpacing.sm),
                Text(
                  country,
                  style: TextStyle(
                    color: foreground,
                    fontFamily: HelmFonts.outfit,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    height: 1.3,
                    letterSpacing: 0.6,
                  ),
                ),
              ],
              if (summary != null) ...[
                const SizedBox(height: HelmSpacing.md),
                HelmDirectionalText(
                  summary,
                  style: TextStyle(
                    color: foreground,
                    fontFamily: HelmFonts.outfit,
                    fontFamilyFallback: HelmFonts.arabicFallback,
                    fontSize: 16,
                    height: 1.45,
                  ),
                ),
              ],
              if (tags.isNotEmpty) ...[
                const SizedBox(height: HelmSpacing.md),
                Wrap(
                  spacing: HelmSpacing.sm,
                  runSpacing: HelmSpacing.sm,
                  children: [
                    for (final tag in tags)
                      _Tag(label: tag, foreground: foreground, dark: dark),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

String _tagLabel(String tag) => tag.replaceAll('_', ' ');

class _FeaturedChip extends StatelessWidget {
  const _FeaturedChip();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: HelmColors.coral,
        borderRadius: const BorderRadius.all(Radius.circular(999)),
        border: Border.all(color: HelmColors.midnight),
      ),
      child: const Padding(
        padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        child: Text(
          'Featured',
          style: TextStyle(
            color: HelmColors.midnight,
            fontFamily: HelmFonts.outfit,
            fontSize: 12,
            fontWeight: FontWeight.w600,
            height: 1.2,
            letterSpacing: 0.4,
          ),
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({
    required this.label,
    required this.foreground,
    required this.dark,
  });

  final String label;
  final Color foreground;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: const BorderRadius.all(Radius.circular(999)),
        border: Border.all(
          color: dark ? HelmColors.ivoryDivider : HelmColors.midnightDivider,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        child: Text(
          label,
          style: TextStyle(
            color: foreground,
            fontFamily: HelmFonts.outfit,
            fontSize: 13,
            height: 1.3,
          ),
        ),
      ),
    );
  }
}

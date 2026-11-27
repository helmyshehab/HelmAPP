import 'package:flutter/material.dart';

import '../theme/helm_directional_text.dart';
import '../theme/helm_tokens.dart';
import '../theme/helm_typography.dart';
import '../theme/helm_wrapping_text.dart';

/// Resolvable http(s) URL with a host; empty or opaque strings are rejected.
bool helmResolvableMediaUrl(String? raw) {
  final value = raw?.trim();
  if (value == null || value.isEmpty) return false;
  final uri = Uri.tryParse(value);
  if (uri == null) return false;
  if (uri.scheme != 'http' && uri.scheme != 'https') return false;
  return uri.host.isNotEmpty;
}

/// Default Explore/Packages action copy for the active locale.
String helmEditorialActionLabelForLocale(Locale locale) {
  if (locale.languageCode.toLowerCase() == 'ar') return 'استكشف';
  return 'Explore';
}

/// Shared editorial list row for Explore destinations and future Packages.
///
/// Optional trailing media uses a bounded portrait thumbnail. When [imageUrl] is
/// missing, invalid, or fails to load, the image frame is omitted entirely.
class HelmEditorialRow extends StatefulWidget {
  const HelmEditorialRow({
    super.key,
    required this.title,
    required this.onTap,
    this.rowKey,
    this.meta,
    this.subtitle,
    this.body,
    this.imageUrl,
    this.imageAlt,
    this.actionLabel,
  });

  /// Applied to the tappable [Material] surface for tests and semantics.
  final Key? rowKey;
  final String title;
  final VoidCallback onTap;
  final String? meta;
  final String? subtitle;
  final String? body;
  final String? imageUrl;
  final String? imageAlt;

  /// Visible action text beside the directional arrow. Defaults to a
  /// locale-aware Explore label so Packages can override later.
  final String? actionLabel;

  /// Nominal thumbnail size at comfortable widths.
  static const Size thumbnailSize = Size(112, 140);

  /// Slightly smaller thumbnail when the row is very narrow (~320dp).
  static const Size narrowThumbnailSize = Size(96, 120);

  /// Image-driven outer height floor at text scale 1.0 (padding + 140 thumb).
  /// Rows with meta/body/action may grow modestly; large text scale may grow further.
  static const double targetHeightWithImage = 172;

  @override
  State<HelmEditorialRow> createState() => _HelmEditorialRowState();
}

class _HelmEditorialRowState extends State<HelmEditorialRow> {
  bool _imageFailed = false;

  @override
  void didUpdateWidget(covariant HelmEditorialRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl) {
      _imageFailed = false;
    }
  }

  bool get _showImage =>
      !_imageFailed && helmResolvableMediaUrl(widget.imageUrl);

  Size _thumbnailForWidth(double maxWidth) {
    // Keep text usable beside the thumb inside ~280dp content (320 − padding).
    if (maxWidth < 300) return HelmEditorialRow.narrowThumbnailSize;
    return HelmEditorialRow.thumbnailSize;
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final foreground = scheme.onSurface;
    final muted = scheme.onSurfaceVariant;
    final border = scheme.outlineVariant;
    final meta = widget.meta?.trim();
    final subtitle = widget.subtitle?.trim();
    final body = widget.body?.trim();
    final hasMeta = meta != null && meta.isNotEmpty;
    final hasSubtitle = subtitle != null && subtitle.isNotEmpty;
    final hasBody = body != null && body.isNotEmpty;
    final actionLabel = (widget.actionLabel?.trim().isNotEmpty == true)
        ? widget.actionLabel!.trim()
        : helmEditorialActionLabelForLocale(Localizations.localeOf(context));

    return Material(
      key: widget.rowKey,
      color: scheme.surfaceContainer,
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.all(Radius.circular(HelmRadius.lg)),
        side: BorderSide(color: border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: widget.onTap,
        hoverColor: scheme.onSurface.withValues(alpha: 0.04),
        focusColor: scheme.onSurface.withValues(alpha: 0.08),
        highlightColor: scheme.onSurface.withValues(alpha: 0.06),
        splashColor: scheme.primary.withValues(alpha: 0.12),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Padding(
            padding: const EdgeInsets.all(HelmSpacing.lg),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final thumb = _showImage
                    ? _thumbnailForWidth(constraints.maxWidth)
                    : null;
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                            if (hasMeta) ...[
                              Text(
                                meta,
                                style: TextStyle(
                                  color: muted,
                                  fontFamily: HelmFonts.outfit,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  height: 1.3,
                                  letterSpacing: 0.6,
                                ),
                              ),
                              const SizedBox(height: HelmSpacing.xs),
                            ],
                            HelmWrappingText(
                              widget.title,
                              style: TextStyle(
                                color: foreground,
                                fontFamily: HelmFonts.fraunces,
                                fontSize: 22,
                                fontWeight: FontWeight.w600,
                                height: 1.25,
                                letterSpacing: -0.3,
                              ),
                            ),
                            if (hasSubtitle) ...[
                              const SizedBox(height: HelmSpacing.xs),
                              Align(
                                alignment: AlignmentDirectional.centerStart,
                                child: HelmDirectionalText(
                                  subtitle,
                                  textWidthBasis: TextWidthBasis.longestLine,
                                  style: TextStyle(
                                    color: foreground,
                                    fontFamily: HelmFonts.outfit,
                                    fontFamilyFallback: HelmFonts.arabicFallback,
                                    fontSize: 16,
                                    height: 1.5,
                                  ),
                                ),
                              ),
                            ],
                            if (hasBody) ...[
                              const SizedBox(height: HelmSpacing.sm),
                              HelmDirectionalText(
                                body,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: foreground,
                                  fontFamily: HelmFonts.outfit,
                                  fontFamilyFallback: HelmFonts.arabicFallback,
                                  fontSize: 16,
                                  height: 1.45,
                                ),
                              ),
                            ],
                            const SizedBox(height: HelmSpacing.sm),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  actionLabel,
                                  style: TextStyle(
                                    color: muted,
                                    fontFamily: HelmFonts.outfit,
                                    fontFamilyFallback: HelmFonts.arabicFallback,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    height: 1.2,
                                  ),
                                ),
                                const SizedBox(width: HelmSpacing.xs),
                                Icon(
                                  Icons.arrow_forward,
                                  color: muted,
                                  size: 18,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    if (thumb != null) ...[
                      const SizedBox(width: HelmSpacing.md),
                      SizedBox(
                        width: thumb.width,
                        height: thumb.height,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(HelmRadius.md),
                          child: Image.network(
                            widget.imageUrl!.trim(),
                            width: thumb.width,
                            height: thumb.height,
                            fit: BoxFit.cover,
                            alignment: Alignment.center,
                            semanticLabel:
                                widget.imageAlt?.trim().isNotEmpty == true
                                    ? widget.imageAlt!.trim()
                                    : widget.title,
                            errorBuilder: (context, error, stackTrace) {
                              WidgetsBinding.instance
                                  .addPostFrameCallback((_) {
                                if (mounted && !_imageFailed) {
                                  setState(() => _imageFailed = true);
                                }
                              });
                              return const SizedBox.shrink();
                            },
                          ),
                        ),
                      ),
                    ],
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

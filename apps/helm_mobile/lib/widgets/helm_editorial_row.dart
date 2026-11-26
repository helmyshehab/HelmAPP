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

/// Shared editorial list row for Explore destinations and future Packages.
///
/// Optional trailing media uses ~35% of the row width. When [imageUrl] is
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
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Padding(
            padding: const EdgeInsets.all(HelmSpacing.lg),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  flex: _showImage ? 65 : 100,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
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
                                    fontFamily: HelmFonts.plexArabic,
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
                          ],
                        ),
                      ),
                      const SizedBox(width: HelmSpacing.sm),
                      Icon(
                        Icons.chevron_right,
                        color: muted,
                        size: 22,
                      ),
                    ],
                  ),
                ),
                if (_showImage) ...[
                  const SizedBox(width: HelmSpacing.md),
                  Expanded(
                    flex: 35,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(HelmRadius.md),
                      child: AspectRatio(
                        aspectRatio: 4 / 5,
                        child: Image.network(
                          widget.imageUrl!.trim(),
                          fit: BoxFit.cover,
                          semanticLabel:
                              widget.imageAlt?.trim().isNotEmpty == true
                                  ? widget.imageAlt!.trim()
                                  : widget.title,
                          errorBuilder: (context, error, stackTrace) {
                            WidgetsBinding.instance.addPostFrameCallback((_) {
                              if (mounted && !_imageFailed) {
                                setState(() => _imageFailed = true);
                              }
                            });
                            return const SizedBox.shrink();
                          },
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

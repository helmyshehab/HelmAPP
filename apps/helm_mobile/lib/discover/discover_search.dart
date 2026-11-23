import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/helm_colors.dart';
import '../theme/helm_tokens.dart';
import '../theme/helm_typography.dart';

final RegExp _arabicScript = RegExp(r'[\u0600-\u06FF]');

/// Submit-to-filter Discover search. Does not request while typing.
class DiscoverSearch extends StatefulWidget {
  const DiscoverSearch({
    super.key,
    required this.controller,
    required this.activeQuery,
    required this.onSubmit,
    required this.onClear,
  });

  static const Key fieldKey = Key('discover-search-field');
  static const Key submitKey = Key('discover-search-submit');
  static const Key clearKey = Key('discover-search-clear');

  final TextEditingController controller;
  final String activeQuery;
  final VoidCallback onSubmit;
  final VoidCallback onClear;

  @override
  State<DiscoverSearch> createState() => _DiscoverSearchState();
}

class _DiscoverSearchState extends State<DiscoverSearch> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_handleTextChanged);
  }

  @override
  void didUpdateWidget(covariant DiscoverSearch oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_handleTextChanged);
      widget.controller.addListener(_handleTextChanged);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_handleTextChanged);
    super.dispose();
  }

  void _handleTextChanged() {
    setState(() {});
  }

  bool get _rtlInput => _arabicScript.hasMatch(widget.controller.text);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fieldFill = isDark ? HelmColors.deepOcean : HelmColors.white;
    final borderColor =
        isDark ? HelmColors.ivoryDivider : HelmColors.midnightDivider;
    final hasActiveQuery = widget.activeQuery.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.only(bottom: HelmSpacing.lg),
      child: Semantics(
        container: true,
        label: 'Search',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Search',
              style: TextStyle(
                color: scheme.onSurface,
                fontFamily: HelmFonts.outfit,
                fontSize: 13,
                fontWeight: FontWeight.w500,
                letterSpacing: 1.4,
                height: 1.4,
              ),
            ),
            const SizedBox(height: HelmSpacing.sm),
            TextField(
              key: DiscoverSearch.fieldKey,
              controller: widget.controller,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => widget.onSubmit(),
              textDirection:
                  _rtlInput ? TextDirection.rtl : TextDirection.ltr,
              textAlign: TextAlign.start,
              style: TextStyle(
                color: scheme.onSurface,
                fontFamily: HelmFonts.outfit,
                fontFamilyFallback: HelmFonts.arabicFallback,
                fontSize: 16,
                height: 1.4,
              ),
              cursorColor: HelmColors.teal,
              inputFormatters: [
                LengthLimitingTextInputFormatter(120),
              ],
              decoration: InputDecoration(
                labelText: 'Destination name or slug',
                labelStyle: TextStyle(
                  color: isDark
                      ? HelmColors.ivoryMuted
                      : HelmColors.midnightMuted,
                  fontFamily: HelmFonts.outfit,
                  fontSize: 14,
                ),
                filled: true,
                fillColor: fieldFill,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 14,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(HelmRadius.md),
                  borderSide: BorderSide(color: borderColor),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(HelmRadius.md),
                  borderSide: BorderSide(color: borderColor),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(HelmRadius.md),
                  borderSide: const BorderSide(color: HelmColors.teal, width: 2),
                ),
              ),
            ),
            const SizedBox(height: HelmSpacing.md),
            Wrap(
              spacing: HelmSpacing.md,
              runSpacing: HelmSpacing.sm,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                FilledButton(
                  key: DiscoverSearch.submitKey,
                  style: FilledButton.styleFrom(
                    backgroundColor: HelmColors.teal,
                    foregroundColor: HelmColors.white,
                    minimumSize: const Size(0, 44),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 12,
                    ),
                    tapTargetSize: MaterialTapTargetSize.padded,
                    shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.all(
                        Radius.circular(HelmRadius.md),
                      ),
                    ),
                    textStyle: const TextStyle(
                      fontFamily: HelmFonts.outfit,
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      height: 1.2,
                    ),
                  ),
                  onPressed: widget.onSubmit,
                  child: const Text('Search'),
                ),
                if (hasActiveQuery)
                  OutlinedButton(
                    key: DiscoverSearch.clearKey,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: scheme.onSurface,
                      minimumSize: const Size(0, 44),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 12,
                      ),
                      side: BorderSide(color: borderColor),
                      tapTargetSize: MaterialTapTargetSize.padded,
                      shape: const RoundedRectangleBorder(
                        borderRadius: BorderRadius.all(
                          Radius.circular(HelmRadius.md),
                        ),
                      ),
                      textStyle: const TextStyle(
                        fontFamily: HelmFonts.outfit,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        height: 1.2,
                      ),
                    ),
                    onPressed: widget.onClear,
                    child: const Text('Clear'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

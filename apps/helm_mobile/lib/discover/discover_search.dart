import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/helm_tokens.dart';
import '../theme/helm_typography.dart';

final RegExp _arabicScript = RegExp(r'[\u0600-\u06FF]');

/// Submit-to-filter Explore search as one integrated bar.
///
/// Does not request while typing. Keyboard submit and the trailing action
/// both call [onSubmit]. Clear appears when the field or active query is set.
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

  bool get _showClear =>
      widget.activeQuery.isNotEmpty || widget.controller.text.isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fieldFill = scheme.surfaceContainer;
    final borderColor = scheme.outlineVariant;
    final muted = scheme.onSurfaceVariant;

    return Padding(
      padding: const EdgeInsets.only(bottom: HelmSpacing.lg),
      child: Semantics(
        container: true,
        label: 'Search',
        textField: true,
        child: TextField(
          key: DiscoverSearch.fieldKey,
          controller: widget.controller,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => widget.onSubmit(),
          textDirection: _rtlInput ? TextDirection.rtl : TextDirection.ltr,
          textAlign: TextAlign.start,
          style: TextStyle(
            color: scheme.onSurface,
            fontFamily: HelmFonts.outfit,
            fontFamilyFallback: HelmFonts.arabicFallback,
            fontSize: 16,
            height: 1.4,
          ),
          cursorColor: scheme.primary,
          inputFormatters: [
            LengthLimitingTextInputFormatter(120),
          ],
          decoration: InputDecoration(
            hintText: 'Find your next destination',
            hintStyle: TextStyle(
              color: muted,
              fontFamily: HelmFonts.outfit,
              fontSize: 16,
              height: 1.4,
            ),
            filled: true,
            fillColor: fieldFill,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 14,
            ),
            prefixIcon: Icon(
              Icons.search,
              color: muted,
              size: 22,
            ),
            prefixIconConstraints: const BoxConstraints(
              minWidth: 44,
              minHeight: 44,
            ),
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_showClear)
                  IconButton(
                    key: DiscoverSearch.clearKey,
                    tooltip: 'Clear search',
                    onPressed: widget.onClear,
                    style: IconButton.styleFrom(
                      minimumSize: const Size(44, 44),
                      tapTargetSize: MaterialTapTargetSize.padded,
                    ),
                    icon: Icon(Icons.close, color: muted, size: 20),
                  ),
                IconButton(
                  key: DiscoverSearch.submitKey,
                  tooltip: 'Search',
                  onPressed: widget.onSubmit,
                  style: IconButton.styleFrom(
                    foregroundColor: scheme.onPrimary,
                    backgroundColor: scheme.primary,
                    minimumSize: const Size(44, 44),
                    tapTargetSize: MaterialTapTargetSize.padded,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(HelmRadius.sm),
                    ),
                  ),
                  icon: const Icon(Icons.arrow_forward, size: 20),
                ),
                const SizedBox(width: HelmSpacing.sm),
              ],
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
              borderSide: BorderSide(color: scheme.primary, width: 2),
            ),
          ),
        ),
      ),
    );
  }
}

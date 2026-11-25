import 'package:flutter/widgets.dart';

import 'helm_wrapping_text.dart';

/// Paragraph direction for a single content string.
///
/// The first strong letter decides. Arabic letters, including presentation
/// forms, select RTL. Latin letters select LTR. Whitespace, punctuation,
/// digits, and combining marks are skipped. Any other non-ignored character
/// selects LTR, so a later Arabic word does not flip an earlier non-Arabic
/// letter. The string itself is not rewritten.
///
/// Dart and Flutter do not expose a first-strong bidi scan that skips Arabic
/// harakat, so this stays a small range check instead of a new package.
TextDirection helmParagraphDirection(String text) {
  for (final rune in text.runes) {
    if (_isIgnorable(rune)) continue;
    if (_isArabicLetter(rune)) return TextDirection.rtl;
    return TextDirection.ltr;
  }
  return TextDirection.ltr;
}

/// Content text that sets its own direction without changing the surrounding
/// [Directionality]. Navigation stays on the ambient LTR direction.
class HelmDirectionalText extends StatelessWidget {
  const HelmDirectionalText(
    this.data, {
    super.key,
    this.style,
    this.textAlign,
    this.maxLines,
    this.overflow,
    this.softWrap,
    this.textWidthBasis,
  });

  final String data;
  final TextStyle? style;
  final TextAlign? textAlign;
  final int? maxLines;
  final TextOverflow? overflow;
  final bool? softWrap;
  final TextWidthBasis? textWidthBasis;

  @override
  Widget build(BuildContext context) {
    final direction = helmParagraphDirection(data);
    final resolved = style ?? DefaultTextStyle.of(context).style;
    final scaler = MediaQuery.textScalerOf(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        return Text(
          helmWrapWideTokens(
            data,
            style: resolved,
            maxWidth: constraints.maxWidth,
            textScaler: scaler,
            textDirection: direction,
          ),
          style: resolved,
          textAlign: textAlign ?? TextAlign.start,
          textDirection: direction,
          textWidthBasis: textWidthBasis,
          maxLines: maxLines,
          overflow: overflow ?? TextOverflow.visible,
          softWrap: softWrap ?? true,
        );
      },
    );
  }
}

bool _isIgnorable(int rune) {
  if (rune <= 0x20 || rune == 0x7F) return true;
  if (rune == 0xA0 || rune == 0x1680 || rune == 0x202F || rune == 0x205F || rune == 0x3000) {
    return true;
  }
  if (rune >= 0x2000 && rune <= 0x200A) return true;
  if (rune == 0x2028 || rune == 0x2029) return true;
  if ((rune >= 0x21 && rune <= 0x2F) ||
      (rune >= 0x3A && rune <= 0x40) ||
      (rune >= 0x5B && rune <= 0x60) ||
      (rune >= 0x7B && rune <= 0xBF)) {
    return true;
  }
  if (rune >= 0x2000 && rune <= 0x206F) return true;
  if (rune >= 0x30 && rune <= 0x39) return true;
  if (rune >= 0x660 && rune <= 0x669) return true;
  if (rune >= 0x6F0 && rune <= 0x6F9) return true;
  if (rune >= 0x300 && rune <= 0x36F) return true;
  if (rune >= 0x610 && rune <= 0x61A) return true;
  if (rune == 0x640) return true;
  if (rune >= 0x64B && rune <= 0x65F) return true;
  if (rune == 0x670) return true;
  if (rune >= 0x6D6 && rune <= 0x6ED) return true;
  if (rune >= 0x8D3 && rune <= 0x8FF) return true;
  if (rune >= 0xFE20 && rune <= 0xFE2F) return true;
  if (rune == 0x60C || rune == 0x61B || rune == 0x61F || rune == 0x6D4) {
    return true;
  }
  if (rune >= 0x66A && rune <= 0x66D) return true;
  return false;
}

bool _isArabicLetter(int rune) {
  if (rune >= 0x621 && rune <= 0x63A) return true;
  if (rune >= 0x641 && rune <= 0x64A) return true;
  if (rune >= 0x66E && rune <= 0x66F) return true;
  if (rune >= 0x671 && rune <= 0x6D3) return true;
  if (rune >= 0x6EE && rune <= 0x6EF) return true;
  if (rune >= 0x6FA && rune <= 0x6FF) return true;
  if (rune >= 0x750 && rune <= 0x77F) return true;
  if (rune >= 0x8A0 && rune <= 0x8C8) return true;
  if (rune >= 0xFB50 && rune <= 0xFDFF) return true;
  if (rune >= 0xFE70 && rune <= 0xFEFC) return true;
  return false;
}

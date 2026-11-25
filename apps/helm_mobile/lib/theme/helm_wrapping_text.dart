import 'package:flutter/widgets.dart';

/// Zero-width space. A break opportunity for a token wider than its line.
const String helmBreakOpportunity = '\u200B';

/// Lets a long token wrap instead of clipping, and leaves shorter tokens whole.
///
/// Words still break on spaces. A token is given break opportunities only when
/// its own scaled width is wider than [maxWidth].
String helmWrapWideTokens(
  String text, {
  required TextStyle style,
  required double maxWidth,
  required TextScaler textScaler,
  required TextDirection textDirection,
}) {
  if (text.isEmpty || !maxWidth.isFinite || maxWidth <= 0) return text;
  if (_tokenWidth(text, style, textScaler, textDirection) <= maxWidth) {
    return text;
  }

  final separators = RegExp(r'\s+').allMatches(text).map((m) => m.group(0)!);
  final parts = text.split(RegExp(r'\s+'));
  final buffer = StringBuffer();
  var separatorIndex = 0;
  final separatorList = separators.toList(growable: false);
  for (var index = 0; index < parts.length; index++) {
    buffer.write(
      _breakIfWider(parts[index], style, maxWidth, textScaler, textDirection),
    );
    if (separatorIndex < separatorList.length) {
      buffer.write(separatorList[separatorIndex]);
      separatorIndex++;
    }
  }
  return buffer.toString();
}

String _breakIfWider(
  String token,
  TextStyle style,
  double maxWidth,
  TextScaler textScaler,
  TextDirection textDirection,
) {
  if (token.isEmpty) return token;
  if (_tokenWidth(token, style, textScaler, textDirection) <= maxWidth) {
    return token;
  }
  final buffer = StringBuffer();
  final runes = token.runes.toList(growable: false);
  for (var index = 0; index < runes.length; index++) {
    buffer.writeCharCode(runes[index]);
    if (index != runes.length - 1) buffer.write(helmBreakOpportunity);
  }
  return buffer.toString();
}

double _tokenWidth(
  String text,
  TextStyle style,
  TextScaler textScaler,
  TextDirection textDirection,
) {
  final painter = TextPainter(
    text: TextSpan(text: text, style: style),
    textDirection: textDirection,
    textScaler: textScaler,
    maxLines: 1,
  )..layout();
  final width = painter.width;
  painter.dispose();
  return width;
}

/// Text that grows vertically, wraps on spaces, and splits only a token that
/// cannot fit on one line. The system text scaler is left unchanged.
class HelmWrappingText extends StatelessWidget {
  const HelmWrappingText(
    this.data, {
    super.key,
    this.textKey,
    this.style,
    this.textDirection,
    this.textAlign,
    this.textWidthBasis,
  });

  final String data;
  final Key? textKey;
  final TextStyle? style;
  final TextDirection? textDirection;
  final TextAlign? textAlign;
  final TextWidthBasis? textWidthBasis;

  @override
  Widget build(BuildContext context) {
    final direction = textDirection ?? Directionality.of(context);
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
          key: textKey,
          style: resolved,
          textDirection: textDirection,
          textAlign: textAlign,
          textWidthBasis: textWidthBasis,
          softWrap: true,
          overflow: TextOverflow.visible,
        );
      },
    );
  }
}

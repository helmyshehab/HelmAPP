import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/theme/helm_theme.dart';
import 'package:helm_mobile/theme/helm_typography.dart';

/// Code points in حِلْم: ha, kasra, lam, sukun, meem.
const List<int> _arabicLockup = <int>[0x062D, 0x0650, 0x0644, 0x0652, 0x0645];

const List<_FontExpect> _fonts = <_FontExpect>[
  _FontExpect(
    asset: 'fonts/Fraunces9pt-Regular.ttf',
    family: HelmFonts.fraunces,
    weight: 400,
    effectiveFamily: 'Fraunces 9pt',
    effectiveStyle: 'Regular',
    versionPrefix: 'Version 1.003',
    coversArabic: false,
  ),
  _FontExpect(
    asset: 'fonts/Fraunces9pt-SemiBold.ttf',
    family: HelmFonts.fraunces,
    weight: 600,
    effectiveFamily: 'Fraunces 9pt',
    effectiveStyle: 'SemiBold',
    versionPrefix: 'Version 1.003',
    coversArabic: false,
  ),
  _FontExpect(
    asset: 'fonts/Outfit-Regular.ttf',
    family: HelmFonts.outfit,
    weight: 400,
    effectiveFamily: 'Outfit',
    effectiveStyle: 'Regular',
    versionPrefix: 'Version 1.100',
    coversArabic: false,
  ),
  _FontExpect(
    asset: 'fonts/Outfit-Medium.ttf',
    family: HelmFonts.outfit,
    weight: 500,
    effectiveFamily: 'Outfit',
    effectiveStyle: 'Medium',
    versionPrefix: 'Version 1.100',
    coversArabic: false,
  ),
  _FontExpect(
    asset: 'fonts/IBMPlexSansArabic-Regular.ttf',
    family: HelmFonts.plexArabic,
    weight: 400,
    effectiveFamily: 'IBM Plex Sans Arabic',
    effectiveStyle: 'Regular',
    versionPrefix: 'Version 1.005',
    coversArabic: true,
  ),
  _FontExpect(
    asset: 'fonts/IBMPlexSansArabic-Medium.ttf',
    family: HelmFonts.plexArabic,
    weight: 500,
    effectiveFamily: 'IBM Plex Sans Arabic',
    effectiveStyle: 'Medium',
    versionPrefix: 'Version 1.005',
    coversArabic: true,
  ),
  _FontExpect(
    asset: 'fonts/IBMPlexSansArabic-SemiBold.ttf',
    family: HelmFonts.plexArabic,
    weight: 600,
    effectiveFamily: 'IBM Plex Sans Arabic',
    effectiveStyle: 'SemiBold',
    versionPrefix: 'Version 1.005',
    coversArabic: true,
  ),
];

const List<_LicenseExpect> _licenses = <_LicenseExpect>[
  _LicenseExpect(
    asset: 'fonts/licenses/Fraunces-OFL.txt',
    copyright: 'Copyright 2018 The Fraunces Project Authors',
  ),
  _LicenseExpect(
    asset: 'fonts/licenses/Outfit-OFL.txt',
    copyright: 'Copyright 2021 The Outfit Project Authors',
  ),
  _LicenseExpect(
    asset: 'fonts/licenses/IBMPlexSansArabic-OFL.txt',
    copyright: 'Copyright © 2017 IBM Corp. with Reserved Font Name "Plex"',
  ),
];

const Set<String> _frauncesRoles = <String>{
  'displayLarge',
  'displayMedium',
  'displaySmall',
  'headlineLarge',
  'headlineMedium',
  'headlineSmall',
  'titleLarge',
};

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('font declarations', () {
    late List<_DeclaredFont> declared;

    setUp(() {
      declared = _parseFontDeclarations(_readPubspec());
    });

    test('pubspec maps each static file to its family and weight', () {
      expect(declared, hasLength(_fonts.length));
      for (final expected in _fonts) {
        final match = declared.where((font) => font.asset == expected.asset);
        expect(match, hasLength(1), reason: expected.asset);
        expect(match.single.family, expected.family);
        expect(match.single.weight, expected.weight);
      }
    });

    test('license files are bundled assets', () {
      final pubspec = _readPubspec();
      for (final license in _licenses) {
        expect(pubspec, contains('    - ${license.asset}'));
      }
    });
  });

  group('font files', () {
    for (final expected in _fonts) {
      test(expected.asset, () async {
        final data = await rootBundle.load(expected.asset);
        final face = _readFace(data);
        expect(face.variable, isFalse,
            reason: 'static face, not a variable font');
        expect(face.weight, expected.weight);
        expect(face.effectiveFamily, expected.effectiveFamily);
        expect(face.effectiveStyle, expected.effectiveStyle);
        expect(face.version, startsWith(expected.versionPrefix));
        expect(_glyphId(data, 0x41), isNot(0), reason: 'Latin A');
        for (final codePoint in _arabicLockup) {
          final glyph = _glyphId(data, codePoint);
          expect(
            glyph,
            expected.coversArabic ? isNot(0) : 0,
            reason: 'U+${codePoint.toRadixString(16)}',
          );
        }
      });
    }

    for (final license in _licenses) {
      test(license.asset, () async {
        final bytes = await rootBundle.load(license.asset);
        final text = utf8.decode(
          bytes.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes),
        );
        expect(text, contains('SIL Open Font License, Version 1.1'));
        expect(text, contains(license.copyright));
      });
    }
  });

  group('themes', () {
    for (final (name, theme, scheme) in <(String, ThemeData, ColorScheme)>[
      ('light', HelmTheme.light(), HelmTheme.lightScheme),
      ('dark', HelmTheme.dark(), HelmTheme.darkScheme),
    ]) {
      test('$name keeps Material 3 metrics and assigns HELM families', () {
        final baseline = ThemeData(
          useMaterial3: true,
          colorScheme: scheme,
        );
        for (final themes in <(TextTheme, TextTheme)>[
          (theme.textTheme, baseline.textTheme),
          (theme.primaryTextTheme, baseline.primaryTextTheme),
        ]) {
          final (actual, reference) = themes;
          for (final role in _roles) {
            final style = role.read(actual);
            final original = role.read(reference);
            expect(style, isNotNull, reason: role.name);
            expect(original, isNotNull, reason: role.name);
            expect(style!.fontSize, original!.fontSize, reason: role.name);
            expect(style.fontWeight, original.fontWeight, reason: role.name);
            expect(style.height, original.height, reason: role.name);
            expect(style.letterSpacing, original.letterSpacing,
                reason: role.name);
            expect(
              style.fontFamily,
              _frauncesRoles.contains(role.name)
                  ? HelmFonts.fraunces
                  : HelmFonts.outfit,
              reason: role.name,
            );
            expect(style.fontFamilyFallback, HelmFonts.arabicFallback);
          }
        }
      });
    }
  });
}

class _FontExpect {
  const _FontExpect({
    required this.asset,
    required this.family,
    required this.weight,
    required this.effectiveFamily,
    required this.effectiveStyle,
    required this.versionPrefix,
    required this.coversArabic,
  });

  final String asset;
  final String family;
  final int weight;
  final String effectiveFamily;
  final String effectiveStyle;
  final String versionPrefix;
  final bool coversArabic;
}

class _LicenseExpect {
  const _LicenseExpect({required this.asset, required this.copyright});

  final String asset;
  final String copyright;
}

class _DeclaredFont {
  const _DeclaredFont({
    required this.family,
    required this.asset,
    required this.weight,
  });

  final String family;
  final String asset;
  final int weight;
}

class _Role {
  const _Role(this.name, this.read);

  final String name;
  final TextStyle? Function(TextTheme theme) read;
}

const List<_Role> _roles = <_Role>[
  _Role('displayLarge', _displayLarge),
  _Role('displayMedium', _displayMedium),
  _Role('displaySmall', _displaySmall),
  _Role('headlineLarge', _headlineLarge),
  _Role('headlineMedium', _headlineMedium),
  _Role('headlineSmall', _headlineSmall),
  _Role('titleLarge', _titleLarge),
  _Role('titleMedium', _titleMedium),
  _Role('titleSmall', _titleSmall),
  _Role('bodyLarge', _bodyLarge),
  _Role('bodyMedium', _bodyMedium),
  _Role('bodySmall', _bodySmall),
  _Role('labelLarge', _labelLarge),
  _Role('labelMedium', _labelMedium),
  _Role('labelSmall', _labelSmall),
];

TextStyle? _displayLarge(TextTheme theme) => theme.displayLarge;
TextStyle? _displayMedium(TextTheme theme) => theme.displayMedium;
TextStyle? _displaySmall(TextTheme theme) => theme.displaySmall;
TextStyle? _headlineLarge(TextTheme theme) => theme.headlineLarge;
TextStyle? _headlineMedium(TextTheme theme) => theme.headlineMedium;
TextStyle? _headlineSmall(TextTheme theme) => theme.headlineSmall;
TextStyle? _titleLarge(TextTheme theme) => theme.titleLarge;
TextStyle? _titleMedium(TextTheme theme) => theme.titleMedium;
TextStyle? _titleSmall(TextTheme theme) => theme.titleSmall;
TextStyle? _bodyLarge(TextTheme theme) => theme.bodyLarge;
TextStyle? _bodyMedium(TextTheme theme) => theme.bodyMedium;
TextStyle? _bodySmall(TextTheme theme) => theme.bodySmall;
TextStyle? _labelLarge(TextTheme theme) => theme.labelLarge;
TextStyle? _labelMedium(TextTheme theme) => theme.labelMedium;
TextStyle? _labelSmall(TextTheme theme) => theme.labelSmall;

String _readPubspec() {
  final candidates = <File>[
    File('pubspec.yaml'),
    File('apps/helm_mobile/pubspec.yaml'),
  ];
  return candidates.firstWhere((file) => file.existsSync()).readAsStringSync();
}

List<_DeclaredFont> _parseFontDeclarations(String pubspec) {
  final lines = const LineSplitter().convert(pubspec);
  final start = lines.indexWhere((line) => line == '  fonts:');
  expect(start, greaterThanOrEqualTo(0));
  final declared = <_DeclaredFont>[];
  String? family;
  String? asset;
  int? weight;

  void flush() {
    final currentFamily = family;
    final currentAsset = asset;
    if (currentFamily != null && currentAsset != null) {
      declared.add(
        _DeclaredFont(
          family: currentFamily,
          asset: currentAsset,
          weight: weight ?? 400,
        ),
      );
    }
    asset = null;
    weight = null;
  }

  for (final line in lines.skip(start + 1)) {
    if (line.isEmpty) break;
    final trimmed = line.trimLeft();
    if (trimmed.startsWith('- family:')) {
      flush();
      family = trimmed.split(':').last.trim();
    } else if (trimmed.startsWith('- asset:') || trimmed.startsWith('asset:')) {
      flush();
      asset = trimmed.split(':').last.trim();
    } else if (trimmed.startsWith('weight:')) {
      weight = int.parse(trimmed.split(':').last.trim());
    }
  }
  flush();
  return declared;
}

class _Face {
  const _Face({
    required this.effectiveFamily,
    required this.effectiveStyle,
    required this.version,
    required this.weight,
    required this.variable,
  });

  final String effectiveFamily;
  final String effectiveStyle;
  final String version;
  final int weight;
  final bool variable;
}

_Face _readFace(ByteData data) {
  expect(data.getUint32(0), 0x00010000, reason: 'TrueType scaler');
  final tables = _tables(data);
  expect(tables.containsKey('fvar'), isFalse);
  final os2 = tables['OS/2']!;
  final names = _nameTable(data, tables['name']!);
  final preferredFamily = names[16];
  final preferredStyle = names[17];
  return _Face(
    effectiveFamily: preferredFamily ?? names[1]!,
    effectiveStyle: preferredStyle ?? names[2]!,
    version: names[5]!,
    weight: data.getUint16(os2.offset + 4),
    variable: tables.containsKey('fvar'),
  );
}

int _glyphId(ByteData data, int codePoint) {
  final tables = _tables(data);
  final cmap = tables['cmap']!;
  final count = data.getUint16(cmap.offset + 2);
  var subtable = -1;
  for (var i = 0; i < count; i++) {
    final record = cmap.offset + 4 + i * 8;
    final platform = data.getUint16(record);
    final encoding = data.getUint16(record + 2);
    final offset = data.getUint32(record + 4);
    if (platform == 3 && encoding == 1) {
      subtable = cmap.offset + offset;
    }
  }
  expect(subtable, greaterThanOrEqualTo(0));
  expect(data.getUint16(subtable), 4, reason: 'cmap format 4');
  final segCount = data.getUint16(subtable + 6) ~/ 2;
  final endAt = subtable + 14;
  final startAt = endAt + segCount * 2 + 2;
  final deltaAt = startAt + segCount * 2;
  final rangeAt = deltaAt + segCount * 2;
  for (var i = 0; i < segCount; i++) {
    final end = data.getUint16(endAt + i * 2);
    final start = data.getUint16(startAt + i * 2);
    if (codePoint < start || codePoint > end) continue;
    final rangeOffset = data.getUint16(rangeAt + i * 2);
    final delta = data.getInt16(deltaAt + i * 2);
    if (rangeOffset == 0) {
      return (delta + codePoint) & 0xFFFF;
    }
    final glyphAt = rangeAt + i * 2 + rangeOffset + 2 * (codePoint - start);
    final glyph = data.getUint16(glyphAt);
    if (glyph == 0) return 0;
    return (glyph + delta) & 0xFFFF;
  }
  return 0;
}

Map<String, ({int offset, int length})> _tables(ByteData data) {
  final count = data.getUint16(4);
  final tables = <String, ({int offset, int length})>{};
  for (var i = 0; i < count; i++) {
    final record = 12 + i * 16;
    final tag = String.fromCharCodes(<int>[
      data.getUint8(record),
      data.getUint8(record + 1),
      data.getUint8(record + 2),
      data.getUint8(record + 3),
    ]);
    tables[tag] = (
      offset: data.getUint32(record + 8),
      length: data.getUint32(record + 12),
    );
  }
  return tables;
}

Map<int, String> _nameTable(ByteData data, ({int offset, int length}) table) {
  final count = data.getUint16(table.offset + 2);
  final storage = data.getUint16(table.offset + 4);
  final names = <int, String>{};
  for (var i = 0; i < count; i++) {
    final record = table.offset + 6 + i * 12;
    final platform = data.getUint16(record);
    final language = data.getUint16(record + 4);
    final nameId = data.getUint16(record + 6);
    final length = data.getUint16(record + 8);
    final offset = data.getUint16(record + 10);
    if (platform != 3) continue;
    final text = _utf16Be(
      data,
      table.offset + storage + offset,
      length,
    );
    if (language == 0x0409 || !names.containsKey(nameId)) {
      names[nameId] = text;
    }
  }
  return names;
}

String _utf16Be(ByteData data, int offset, int length) {
  final units = Uint16List(length ~/ 2);
  for (var i = 0; i < units.length; i++) {
    units[i] = data.getUint16(offset + i * 2);
  }
  return String.fromCharCodes(units);
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/auth/fake_traveler_auth.dart';
import 'package:helm_mobile/main.dart';
import 'package:helm_mobile/theme/helm_appearance_menu.dart';
import 'package:helm_mobile/theme/helm_colors.dart';
import 'package:helm_mobile/theme/helm_theme_controller.dart';
import 'package:helm_mobile/theme/helm_theme_preferences.dart';

void main() {
  group('HelmThemeModeCodec', () {
    test('encodes and decodes the three modes', () {
      expect(HelmThemeModeCodec.encode(ThemeMode.system), 'system');
      expect(HelmThemeModeCodec.encode(ThemeMode.light), 'light');
      expect(HelmThemeModeCodec.encode(ThemeMode.dark), 'dark');
      expect(HelmThemeModeCodec.decode('system'), ThemeMode.system);
      expect(HelmThemeModeCodec.decode('light'), ThemeMode.light);
      expect(HelmThemeModeCodec.decode('dark'), ThemeMode.dark);
    });

    test('falls back to system for missing or invalid values', () {
      expect(HelmThemeModeCodec.decode(null), ThemeMode.system);
      expect(HelmThemeModeCodec.decode(''), ThemeMode.system);
      expect(HelmThemeModeCodec.decode('midnight'), ThemeMode.system);
      expect(HelmThemeModeCodec.decode('SYSTEM'), ThemeMode.system);
    });
  });

  group('HelmThemeController', () {
    test('restores a stored preference before notify', () async {
      final store = MemoryThemePreferenceStore('dark');
      final controller = HelmThemeController(
        store: store,
        initialMode: HelmThemeModeCodec.decode(await store.read()),
      );
      expect(controller.mode, ThemeMode.dark);
    });

    test('persists setMode and ignores no-op updates', () async {
      final store = MemoryThemePreferenceStore();
      final controller = HelmThemeController(store: store);
      var notifications = 0;
      controller.addListener(() => notifications++);

      await controller.setMode(ThemeMode.light);
      expect(controller.mode, ThemeMode.light);
      expect(await store.read(), 'light');
      expect(notifications, 1);

      await controller.setMode(ThemeMode.light);
      expect(notifications, 1);

      await controller.setMode(ThemeMode.system);
      expect(await store.read(), 'system');
      expect(notifications, 2);
    });

    test('memory factory seeds encode + mode', () {
      final controller = HelmThemeController.memory(mode: ThemeMode.dark);
      expect(controller.mode, ThemeMode.dark);
    });
  });

  group('appearance UI', () {
    testWidgets('single tap toggles light→dark and updates MaterialApp',
        (tester) async {
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.light;

      final controller = HelmThemeController.memory();
      final auth = FakeTravelerAuth();
      addTearDown(auth.dispose);
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        HelmApp(auth: auth, themeController: controller),
      );
      expect(
        tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode,
        ThemeMode.system,
      );
      expect(find.byKey(HelmAppearanceMenu.buttonKey), findsOneWidget);
      expect(find.byIcon(Icons.dark_mode_outlined), findsOneWidget);

      await tester.tap(find.byKey(HelmAppearanceMenu.buttonKey));
      await tester.pumpAndSettle();

      expect(controller.mode, ThemeMode.dark);
      expect(
        tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode,
        ThemeMode.dark,
      );
      expect(
        Theme.of(tester.element(find.byType(Scaffold))).colorScheme.surface,
        HelmColors.darkBackground,
      );
      expect(find.byIcon(Icons.light_mode_outlined), findsOneWidget);
    });

    testWidgets('theme toggle keeps selected tab index', (tester) async {
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;

      final controller = HelmThemeController.memory();
      final auth = FakeTravelerAuth();
      addTearDown(auth.dispose);
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        HelmApp(auth: auth, themeController: controller),
      );
      await tester.tap(find.text('Packages'));
      await tester.pump();

      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        2,
      );
      expect(find.byIcon(Icons.light_mode_outlined), findsOneWidget);

      await tester.tap(find.byKey(HelmAppearanceMenu.buttonKey));
      await tester.pumpAndSettle();

      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        2,
      );
      expect(controller.mode, ThemeMode.light);
      expect(
        tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode,
        ThemeMode.light,
      );
    });

    testWidgets('restored dark preference paints dark surfaces on first frame',
        (tester) async {
      final store = MemoryThemePreferenceStore('dark');
      final controller = HelmThemeController(
        store: store,
        initialMode: HelmThemeModeCodec.decode(await store.read()),
      );
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        HelmApp(
          auth: FakeTravelerAuth(),
          themeController: controller,
        ),
      );

      expect(
        tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode,
        ThemeMode.dark,
      );
      expect(
        Theme.of(tester.element(find.byType(Scaffold))).colorScheme.surface,
        HelmColors.darkBackground,
      );
      expect(find.byIcon(Icons.light_mode_outlined), findsOneWidget);
    });
  });
}

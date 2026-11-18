import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/main.dart';

void main() {
  testWidgets('Helm حلم shell renders brand title', (tester) async {
    await tester.pumpWidget(const HelmApp());
    expect(find.text('Helm حلم'), findsOneWidget);
  });
}

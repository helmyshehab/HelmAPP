import 'package:flutter_test/flutter_test.dart';
import 'package:helm_mobile/config/build_info.dart';

void main() {
  test('BuildInfo hides preview label when HELM_GIT_SHA is unset', () {
    expect(BuildInfo.gitSha, isEmpty);
    expect(BuildInfo.shortSha, isEmpty);
    expect(BuildInfo.hasPreviewCommit, isFalse);
    expect(BuildInfo.previewLabel, isEmpty);
  });
}

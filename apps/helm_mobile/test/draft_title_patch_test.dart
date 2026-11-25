import 'package:flutter_test/flutter_test.dart';
import 'package:helm_api_client/helm_api_client.dart';
import 'package:helm_mobile/build/draft_title_patch.dart';

TripDraft _draft({String? title}) {
  return TripDraft(
    id: '11111111-1111-1111-1111-111111111111',
    destinationId: '22222222-2222-2222-2222-222222222222',
    title: title,
    constraints: const {'party': 2},
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  );
}

void main() {
  test('omits title patch when unchanged (destination/constraints untouched)',
      () {
    final saved = _draft(title: 'Bali week');
    final patch = buildTitleOnlyPatch(saved: saved, formTitle: 'Bali week');
    expect(patch.shouldPatch, isFalse);
  });

  test('patches only the changed title value', () {
    final saved = _draft(title: 'Bali week');
    final patch = buildTitleOnlyPatch(saved: saved, formTitle: 'Ubud escape');
    expect(patch.shouldPatch, isTrue);
    expect(patch.title, 'Ubud escape');
  });

  test('clears title with explicit null', () {
    final saved = _draft(title: 'Bali week');
    final patch = buildTitleOnlyPatch(saved: saved, formTitle: '   ');
    expect(patch.shouldPatch, isTrue);
    expect(patch.title, isNull);
  });

  test('canStartMutation blocks duplicate submissions', () {
    expect(canStartMutation(false), isTrue);
    expect(canStartMutation(true), isFalse);
  });
}

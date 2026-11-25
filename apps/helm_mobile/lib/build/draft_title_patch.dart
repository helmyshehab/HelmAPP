import 'package:helm_api_client/helm_api_client.dart';

/// Title-only PATCH plan. Destination and constraints stay omitted.
class DraftTitlePatch {
  const DraftTitlePatch.unchanged()
      : shouldPatch = false,
        title = null;

  const DraftTitlePatch.change(this.title) : shouldPatch = true;

  final bool shouldPatch;

  /// Next title value when [shouldPatch] is true (`null` clears).
  final String? title;
}

/// Compare form title to the last saved draft. Never includes destination/constraints.
DraftTitlePatch buildTitleOnlyPatch({
  required TripDraft saved,
  required String formTitle,
}) {
  final nextTitle = normalizeNullableTitle(formTitle);
  if (nextTitle == saved.title) {
    return const DraftTitlePatch.unchanged();
  }
  return DraftTitlePatch.change(nextTitle);
}

String? normalizeNullableTitle(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

bool canStartMutation(bool inFlight) => !inFlight;

bool isTripDraftNotFoundError(Object error) {
  return error.toString().contains(' failed: 404');
}

String draftListLabel(TripDraft draft) {
  final title = draft.title?.trim();
  if (title != null && title.isNotEmpty) return title;
  return 'Untitled draft';
}

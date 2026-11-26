/// Build-time preview metadata (set via `--dart-define` in CI).
class BuildInfo {
  const BuildInfo._();

  /// Full git SHA of the deployed preview build. Empty for local runs.
  static const String gitSha = String.fromEnvironment('HELM_GIT_SHA');

  /// First 7 characters of [gitSha], or empty when unset.
  static String get shortSha {
    final trimmed = gitSha.trim();
    if (trimmed.isEmpty) return '';
    return trimmed.length <= 7 ? trimmed : trimmed.substring(0, 7);
  }

  static bool get hasPreviewCommit => shortSha.isNotEmpty;

  /// Single-line label shown in the traveler shell when a preview is deployed.
  static String get previewLabel =>
      hasPreviewCommit ? 'Preview · $shortSha' : '';
}

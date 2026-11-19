/**
 * Traveler-facing country label from an ISO-3166 alpha-2 code.
 * Uses the page locale via Intl; falls back to the code when unknown.
 */
export function formatCountryLabel(
  countryCode: string,
  locale: string = "en",
): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return countryCode.trim() || countryCode;
  }

  try {
    const name = new Intl.DisplayNames([locale], { type: "region" }).of(code);
    if (name && name.toUpperCase() !== code) return name;
  } catch {
    // Intl / locale unsupported — fall through
  }

  return code;
}

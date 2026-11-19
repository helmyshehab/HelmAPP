import type {
  CreateDestinationRequest,
  UpdateDestinationRequest,
} from "@helm/api-client-ts";

export type DestinationFormValues = {
  slug: string;
  nameEn: string;
  nameAr: string;
  shortDescriptionEn: string;
  shortDescriptionAr: string;
  summaryEn: string;
  summaryAr: string;
  descriptionEn: string;
  descriptionAr: string;
  countryCode: string;
  cityId: string;
  parentId: string;
  timezone: string;
  latitude: string;
  longitude: string;
  addressText: string;
  websiteUrl: string;
  isFeatured: boolean;
  externalKey: string;
  tagSlugs: string[];
};

export type FieldErrors = Partial<Record<keyof DestinationFormValues, string>>;

export function emptyDestinationForm(): DestinationFormValues {
  return {
    slug: "",
    nameEn: "",
    nameAr: "",
    shortDescriptionEn: "",
    shortDescriptionAr: "",
    summaryEn: "",
    summaryAr: "",
    descriptionEn: "",
    descriptionAr: "",
    countryCode: "",
    cityId: "",
    parentId: "",
    timezone: "",
    latitude: "",
    longitude: "",
    addressText: "",
    websiteUrl: "",
    isFeatured: false,
    externalKey: "",
    tagSlugs: [],
  };
}

function optionalText(value: string): string | undefined {
  const t = value.trim();
  return t ? t : undefined;
}

function optionalNullableText(value: string): string | null | undefined {
  const t = value.trim();
  return t ? t : null;
}

function parseOptionalNumber(
  raw: string,
  field: keyof DestinationFormValues,
  errors: FieldErrors,
): number | null | undefined {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) {
    errors[field] = "Must be a valid number.";
    return undefined;
  }
  return n;
}

function validateSlug(slug: string, errors: FieldErrors) {
  const t = slug.trim();
  if (!t) {
    errors.slug = "Slug is required.";
    return;
  }
  if (t.length > 120) {
    errors.slug = "Slug must be at most 120 characters.";
    return;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t)) {
    errors.slug =
      "Use a URL-safe slug: lowercase letters, numbers, and hyphens.";
  }
}

function validateRequiredName(
  value: string,
  field: "nameEn" | "nameAr",
  label: string,
  errors: FieldErrors,
) {
  const t = value.trim();
  if (!t) {
    errors[field] = `${label} is required.`;
    return;
  }
  if (t.length > 200) {
    errors[field] = `${label} must be at most 200 characters.`;
  }
}

function validateCountry(code: string, errors: FieldErrors) {
  const t = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(t)) {
    errors.countryCode = "Select a country.";
  }
}

function validateWebsite(url: string, errors: FieldErrors) {
  const t = url.trim();
  if (!t) return;
  try {
    const parsed = new URL(t);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      errors.websiteUrl = "Website must be an http(s) URL.";
    }
  } catch {
    errors.websiteUrl = "Website must be a valid URL.";
  }
}

export function validateCreateForm(
  values: DestinationFormValues,
): { ok: true; body: CreateDestinationRequest } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  validateSlug(values.slug, errors);
  validateRequiredName(values.nameEn, "nameEn", "English name", errors);
  validateRequiredName(values.nameAr, "nameAr", "Arabic name", errors);
  validateCountry(values.countryCode, errors);
  validateWebsite(values.websiteUrl, errors);

  const latitude = parseOptionalNumber(values.latitude, "latitude", errors);
  const longitude = parseOptionalNumber(values.longitude, "longitude", errors);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const body: CreateDestinationRequest = {
    slug: values.slug.trim(),
    nameEn: values.nameEn.trim(),
    nameAr: values.nameAr.trim(),
    countryCode: values.countryCode.trim().toUpperCase(),
    isFeatured: values.isFeatured,
  };

  const shortDescriptionEn = optionalText(values.shortDescriptionEn);
  const shortDescriptionAr = optionalText(values.shortDescriptionAr);
  const summaryEn = optionalText(values.summaryEn);
  const summaryAr = optionalText(values.summaryAr);
  const descriptionEn = optionalText(values.descriptionEn);
  const descriptionAr = optionalText(values.descriptionAr);
  const timezone = optionalText(values.timezone);
  const addressText = optionalText(values.addressText);
  const websiteUrl = optionalText(values.websiteUrl);
  const externalKey = optionalText(values.externalKey);
  const cityId = optionalText(values.cityId) ?? null;
  const parentId = optionalText(values.parentId) ?? null;

  if (shortDescriptionEn) body.shortDescriptionEn = shortDescriptionEn;
  if (shortDescriptionAr) body.shortDescriptionAr = shortDescriptionAr;
  if (summaryEn) body.summaryEn = summaryEn;
  if (summaryAr) body.summaryAr = summaryAr;
  if (descriptionEn) body.descriptionEn = descriptionEn;
  if (descriptionAr) body.descriptionAr = descriptionAr;
  if (timezone) body.timezone = timezone;
  if (addressText) body.addressText = addressText;
  if (websiteUrl) body.websiteUrl = websiteUrl;
  if (externalKey) body.externalKey = externalKey;
  if (cityId) body.cityId = cityId;
  if (parentId) body.parentId = parentId;
  if (latitude !== null && latitude !== undefined) body.latitude = latitude;
  if (longitude !== null && longitude !== undefined) body.longitude = longitude;
  if (values.tagSlugs.length > 0) {
    body.tagSlugs = [...new Set(values.tagSlugs.map((s) => s.trim()).filter(Boolean))];
  }

  return { ok: true, body };
}

export function validateUpdateForm(
  values: DestinationFormValues,
  options: { includeSlug: boolean },
): { ok: true; body: UpdateDestinationRequest } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  if (options.includeSlug) {
    validateSlug(values.slug, errors);
  }
  validateRequiredName(values.nameEn, "nameEn", "English name", errors);
  validateRequiredName(values.nameAr, "nameAr", "Arabic name", errors);
  validateCountry(values.countryCode, errors);
  validateWebsite(values.websiteUrl, errors);

  const latitude = parseOptionalNumber(values.latitude, "latitude", errors);
  const longitude = parseOptionalNumber(values.longitude, "longitude", errors);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const body: UpdateDestinationRequest = {
    nameEn: values.nameEn.trim(),
    nameAr: values.nameAr.trim(),
    countryCode: values.countryCode.trim().toUpperCase(),
    shortDescriptionEn: optionalNullableText(values.shortDescriptionEn),
    shortDescriptionAr: optionalNullableText(values.shortDescriptionAr),
    summaryEn: optionalNullableText(values.summaryEn),
    summaryAr: optionalNullableText(values.summaryAr),
    descriptionEn: optionalNullableText(values.descriptionEn),
    descriptionAr: optionalNullableText(values.descriptionAr),
    cityId: optionalText(values.cityId) ?? null,
    parentId: optionalText(values.parentId) ?? null,
    timezone: optionalNullableText(values.timezone),
    addressText: optionalNullableText(values.addressText),
    websiteUrl: optionalNullableText(values.websiteUrl),
    externalKey: optionalNullableText(values.externalKey),
    isFeatured: values.isFeatured,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  };

  if (options.includeSlug) {
    body.slug = values.slug.trim();
  }

  return { ok: true, body };
}

export function valuesFromDestination(input: {
  slug: string;
  nameEn: string;
  nameAr: string;
  shortDescriptionEn?: string | null;
  shortDescriptionAr?: string | null;
  summaryEn?: string | null;
  summaryAr?: string | null;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  countryCode: string;
  cityId?: string | null;
  parentId?: string | null;
  timezone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addressText?: string | null;
  websiteUrl?: string | null;
  isFeatured?: boolean;
  externalKey?: string | null;
  tags?: Array<{ slug: string }>;
}): DestinationFormValues {
  return {
    slug: input.slug ?? "",
    nameEn: input.nameEn ?? "",
    nameAr: input.nameAr ?? "",
    shortDescriptionEn: input.shortDescriptionEn ?? "",
    shortDescriptionAr: input.shortDescriptionAr ?? "",
    summaryEn: input.summaryEn ?? "",
    summaryAr: input.summaryAr ?? "",
    descriptionEn: input.descriptionEn ?? "",
    descriptionAr: input.descriptionAr ?? "",
    countryCode: input.countryCode ?? "",
    cityId: input.cityId ?? "",
    parentId: input.parentId ?? "",
    timezone: input.timezone ?? "",
    latitude:
      input.latitude === null || input.latitude === undefined
        ? ""
        : String(input.latitude),
    longitude:
      input.longitude === null || input.longitude === undefined
        ? ""
        : String(input.longitude),
    addressText: input.addressText ?? "",
    websiteUrl: input.websiteUrl ?? "",
    isFeatured: Boolean(input.isFeatured),
    externalKey: input.externalKey ?? "",
    tagSlugs: (input.tags ?? []).map((t) => t.slug),
  };
}

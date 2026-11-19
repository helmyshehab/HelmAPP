/**
 * Shared Helm Thailand catalogue v1 helpers.
 * Builds helm.catalog.editorial.v1 source + helm.catalog.import.v1 import payloads.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const COMPILED_AT = "2026-11-19";
export const CURRENCY = "THB";
export const COUNTRY_CODE = "TH";

/** Expected Bali-style distribution for a 30-place destination. */
export const EXPECTED_COUNTS = {
  restaurant: 5,
  cafe: 4,
  attraction: 3,
  activity: 4,
  bar_beach_club_nightlife: 4,
  accommodation: 10,
};

export function nullCoords() {
  return { lat: null, lng: null, source: null, verified_at: null };
}

export function unknownPrice(currency = CURRENCY) {
  return {
    tier: null,
    amount_min: null,
    amount_max: null,
    currency,
    basis: null,
    status: "unknown",
  };
}

export function nullRating() {
  return {
    value: null,
    scale: 5,
    review_count: null,
    provider: null,
    verified_at: null,
    scope: null,
  };
}

function rankingSupport() {
  return {
    rating_score: null,
    review_volume: null,
    price_tier: null,
    experience_quality: null,
    distance_to_destination_center: null,
    data_confidence: "low_curated_needs_verification",
    composite_rank: null,
    composite_rank_note:
      "No definitive composite ranking while coordinates, verified prices, and Helm verification are missing.",
  };
}

function accommodationEditorial(officialWebsite, propertyType) {
  return {
    property_type: propertyType,
    verified_star_classification: null,
    marketplace_star_claim: null,
    guest_rating: null,
    price_per_night: null,
    currency: CURRENCY,
    date_checked: null,
    room_categories: null,
    maximum_occupancy: null,
    private_pool: null,
    shared_pool: null,
    breakfast_inclusion: null,
    wifi: null,
    parking: null,
    air_conditioning: null,
    beach_access: null,
    verified_distance_to_beaches: null,
    adults_only: null,
    family_friendly: null,
    honeymoon_suitability: null,
    official_website: officialWebsite,
    booking_url: null,
  };
}

/**
 * Expand a compact place definition into a full builder place object.
 * @param {string} destSlug
 * @param {object} d
 */
export function expandPlace(destSlug, d) {
  const external_key = `${destSlug}-${d.key}`;
  const base = {
    external_key,
    name: d.name,
    name_ar: d.nameAr,
    category: d.cat,
    subcategory: d.sub,
    area: d.area,
    area_note: d.note,
    description: d.desc,
    why_visit: d.why,
    best_for: d.bestFor ?? [d.cat],
    rating: nullRating(),
    price: unknownPrice(),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: d.urls,
    websiteUrl: d.urls[0],
    tags: d.tags ?? [],
  };

  if (d.cat === "restaurant" || d.cat === "cafe") {
    base.dining = d.dining ?? {
      cuisineTypes: [d.sub],
      mealTypes: d.cat === "cafe" ? ["breakfast", "lunch"] : ["lunch", "dinner"],
      dietaryOptions: [],
    };
  }
  if (d.cat === "attraction") {
    base.attraction = d.attraction ?? { attractionType: "other" };
  }
  if (d.cat === "activity") {
    base.activity = d.activity ?? { activityType: "other" };
  }
  if (d.cat === "accommodation") {
    const type = d.accommodationType ?? "hotel";
    base.accommodation_editorial = accommodationEditorial(d.urls[0], type);
    base.accommodation = { accommodationType: type };
  }
  return base;
}

function isTourismListingUrl(url) {
  return /tourismthailand\.org|thailand\.travel|mots\.go\.th|bangkok\.go\.th|phuket\.go\.th/.test(
    url,
  );
}

function sourceForPlace(p) {
  if (p.source_urls?.length) {
    return p.source_urls.map((url) => {
      if (isTourismListingUrl(url)) {
        return {
          sourceType: "other",
          name: "Official tourism / destination listing",
          url,
          notes:
            "Destination listing captured for identity provenance only. Not Helm-verified inventory.",
          collectedAt: COMPILED_AT,
        };
      }
      return {
        sourceType: "official_website",
        name: "Official / brand website reference",
        url,
        notes:
          "URL captured as a research lead only. Content not treated as Helm-verified inventory.",
        collectedAt: COMPILED_AT,
      };
    });
  }
  return [
    {
      sourceType: "manual_research",
      name: "Helm curated Thailand dataset v1 research lead",
      notes: "Staging research lead. Not Helm-verified.",
      collectedAt: COMPILED_AT,
    },
  ];
}

function importExternalKey(destSlug, editorialKey) {
  const prefix = `${destSlug}-`;
  const local = editorialKey.startsWith(prefix)
    ? editorialKey.slice(prefix.length)
    : editorialKey;
  return `id:${destSlug}:${local}`;
}

function toEditorialRecord(destSlug, p) {
  const record = {
    external_key: p.external_key,
    name: p.name,
    name_ar: p.name_ar,
    country_code: COUNTRY_CODE,
    destination_slug: destSlug,
    category: p.category,
    subcategory: p.subcategory,
    area: p.area,
    area_note: p.area_note,
    description: p.description,
    why_visit: p.why_visit,
    best_for: p.best_for,
    rating: p.rating,
    price: p.price,
    address: p.address,
    coordinates: p.coordinates,
    opening_hours: p.opening_hours,
    visit_duration_minutes: p.visit_duration_minutes,
    booking_recommended: p.booking_recommended,
    source_urls: p.source_urls,
    tags: p.tags,
    data_status: "curated_needs_verification",
    publication_status: "draft",
    last_verified_at: null,
    ranking_support: rankingSupport(),
  };
  if (p.accommodation_editorial) {
    record.accommodation = p.accommodation_editorial;
  }
  return record;
}

function toImportPlace(destSlug, p) {
  /** @type {Record<string, unknown>} */
  const place = {
    externalKey: importExternalKey(destSlug, p.external_key),
    destinationSlug: destSlug,
    category: p.category,
    subcategory: p.subcategory,
    slug: p.external_key,
    nameEn: p.name,
    nameAr: p.name_ar,
    shortDescriptionEn: p.why_visit.slice(0, 500),
    descriptionEn: [`${p.description}`, `Area: ${p.area}. ${p.area_note}`].join(
      "\n\n",
    ),
    tags: p.tags,
    updateIfExists: false,
    sources: sourceForPlace(p),
  };
  if (p.websiteUrl) place.websiteUrl = p.websiteUrl;
  if (p.dining) place.dining = p.dining;
  if (p.attraction) place.attraction = p.attraction;
  if (p.activity) place.activity = p.activity;
  if (p.nightlife) place.nightlife = p.nightlife;
  if (p.accommodation) {
    place.accommodation = {
      accommodationType: p.accommodation.accommodationType,
    };
  }
  return place;
}

function countCategories(places) {
  const counts = {
    restaurant: 0,
    cafe: 0,
    attraction: 0,
    activity: 0,
    bar_beach_club_nightlife: 0,
    accommodation: 0,
  };
  for (const p of places) {
    if (p.category === "restaurant") counts.restaurant += 1;
    else if (p.category === "cafe") counts.cafe += 1;
    else if (p.category === "attraction") counts.attraction += 1;
    else if (p.category === "activity") counts.activity += 1;
    else if (["bar", "beach_club", "nightlife"].includes(p.category)) {
      counts.bar_beach_club_nightlife += 1;
    } else if (p.category === "accommodation") counts.accommodation += 1;
    else throw new Error(`Unexpected category ${p.category}`);
  }
  return counts;
}

/**
 * @param {object} dest
 * @param {string} dest.slug
 * @param {string} dest.nameEn
 * @param {string} dest.nameAr
 * @param {string} dest.summaryEn
 * @param {string} dest.summaryAr
 * @param {string} dest.shortDescriptionEn
 * @param {string[]} dest.tags
 * @param {string} dest.geographyNote
 * @param {string} dest.region
 * @param {object[]} dest.compactPlaces
 * @param {string} rootAbs
 */
export function buildDestinationDataset(dest, rootAbs) {
  const places = dest.compactPlaces.map((d) => expandPlace(dest.slug, d));
  if (places.length !== 30) {
    throw new Error(`${dest.slug}: expected 30 places, got ${places.length}`);
  }
  const counts = countCategories(places);
  for (const [k, v] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[k] !== v) {
      throw new Error(`${dest.slug}: ${k} count ${counts[k]} != ${v}`);
    }
  }

  const datasetVersion = `${dest.slug}-curated-v1`;
  const editorial = {
    dataset: datasetVersion,
    format: "helm.catalog.editorial.v1",
    compiled_at: COMPILED_AT,
    locale_primary: "en",
    locale_secondary: "ar",
    research_status:
      "Staging research leads for Thailand catalogue foundation. Not a verified inventory. Prefer Helm Admin editorial curation before publish.",
    country: {
      name: "Thailand",
      iso2: COUNTRY_CODE,
      currency: CURRENCY,
      note:
        "Apply-time prerequisite: geo.countries must include TH and pricing.currencies must include THB (not present in default seed.sql as of this dataset).",
    },
    destination: {
      name: dest.nameEn,
      name_ar: dest.nameAr,
      slug: dest.slug,
      external_key: `id:${dest.slug}`,
      type: "destination_area",
      type_note:
        "Editorial type only — catalog.destinations has no destination_type column; not imported as a typed enum.",
      region: dest.region,
      parent: "Thailand",
      parent_note:
        "Editorial parent label. Import format does not set parent_id; countryCode TH is required at apply time.",
      country_code: COUNTRY_CODE,
      recommended_duration: dest.recommendedDuration ?? "3–5 days",
      tags: dest.tags,
      data_status: "curated_needs_verification",
      publication_status: "draft",
      unpublished: true,
      summary_en: dest.summaryEn,
      summary_ar: dest.summaryAr,
    },
    category_distribution: counts,
    geography_note: dest.geographyNote,
    integrity: {
      do_not_invent: [
        "exact_coordinates",
        "opening_hours",
        "booking_urls",
        "confirmed_supplier_prices",
        "google_maps_place_ids",
        "provider_ids",
        "visit_duration_minutes",
        "booking_recommended",
        "typicalDurationMinutes",
        "bookingRequired",
        "starRating",
        "amenities",
        "private_pool",
        "shared_pool",
        "accommodation_price_per_night",
        "ratings_when_unverified",
      ],
      accommodation_import:
        "Only accommodationType mapped; starRating and amenities omitted until verified",
      lifecycle: "all_records_draft_curated_needs_verification",
    },
    places: places.map((p) => toEditorialRecord(dest.slug, p)),
    mapping: {
      import_file: `${dest.slug}-curated-v1.json`,
      import_format: "helm.catalog.import.v1",
      external_key_rule: `editorial.external_key → import.externalKey id:${dest.slug}:<suffix>`,
    },
  };

  const importPayload = {
    formatVersion: "helm.catalog.import.v1",
    sourceLabel: datasetVersion,
    destinations: [
      {
        externalKey: `id:${dest.slug}`,
        slug: dest.slug,
        nameEn: dest.nameEn,
        nameAr: dest.nameAr,
        countryCode: COUNTRY_CODE,
        summaryEn: dest.summaryEn,
        summaryAr: dest.summaryAr,
        shortDescriptionEn: dest.shortDescriptionEn,
        tags: dest.tags,
        updateIfExists: false,
        sources: [
          {
            sourceType: "manual_research",
            name: `Helm curated ${dest.nameEn} destination notes`,
            notes:
              "Draft curated destination. Unpublished. Needs verification before publish. Thailand geo (TH/THB) is an apply-time prerequisite.",
            collectedAt: COMPILED_AT,
          },
        ],
      },
    ],
    places: places.map((p) => toImportPlace(dest.slug, p)),
  };

  const outDir = join(rootAbs, "data/imports/thailand", dest.slug);
  mkdirSync(outDir, { recursive: true });
  const sourcePath = join(outDir, `${dest.slug}-curated-v1.source.json`);
  const importPath = join(outDir, `${dest.slug}-curated-v1.json`);
  writeFileSync(sourcePath, `${JSON.stringify(editorial, null, 2)}\n`);
  writeFileSync(importPath, `${JSON.stringify(importPayload, null, 2)}\n`);
  return { sourcePath, importPath, counts, placeCount: places.length };
}

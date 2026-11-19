#!/usr/bin/env node
/**
 * Builds Ubud curated dataset v1:
 * - data/imports/indonesia/ubud/ubud-curated-v1.source.json (rich editorial)
 * - data/imports/indonesia/ubud/ubud-curated-v1.json (helm.catalog.import.v1)
 *
 * Does not invent coordinates, opening hours, booking URLs, or confirmed prices.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "data/imports/indonesia/ubud");
const COMPILED_AT = "2026-11-19";
const DATASET_VERSION = "ubud-curated-v1";

/** @typedef {'restaurant'|'cafe'|'attraction'|'activity'|'bar'|'nightlife'} PlaceCategory */

/**
 * Price tier → import priceLevel (1–4). Unknown tiers stay null / omitted.
 * @param {string|null|undefined} tier
 * @returns {number|null}
 */
function priceTierToLevel(tier) {
  if (!tier) return null;
  switch (tier) {
    case "budget":
      return 1;
    case "budget_mid_range":
    case "mid_range":
      return 2;
    case "upscale":
      return 3;
    case "luxury":
      return 4;
    default:
      return null;
  }
}

/**
 * @param {object} p
 */
function rankingSupport(p) {
  return {
    rating_score: p.rating?.value ?? null,
    review_volume: p.rating?.review_count ?? null,
    price_tier: p.price?.tier ?? null,
    experience_quality: null,
    distance_to_destination_center: null,
    data_confidence: "low_curated_needs_verification",
    composite_rank: null,
    composite_rank_note:
      "No definitive composite ranking while coordinates, verified prices, and Helm verification are missing.",
  };
}

/** Canonical curated place list (exactly 20). */
const PLACES = [
  {
    external_key: "ubud-hujan-locale",
    name: "Hujan Locale",
    name_ar: "هوجان لوكال",
    category: "restaurant",
    subcategory: "modern_indonesian",
    area: "Ubud",
    area_note: "Central Ubud dining",
    description:
      "Modern Indonesian restaurant in Ubud known for regional ingredients presented in a contemporary dining format.",
    why_visit:
      "A polished introduction to Indonesian flavours without leaving the Ubud dining circuit.",
    best_for: ["dinner", "indonesian_cuisine", "date_night"],
    rating: {
      value: 4.5,
      scale: 5,
      review_count: 1691,
      provider: "Tripadvisor",
      verified_at: null,
      scope: "public_listing_snapshot",
    },
    price: {
      tier: "mid_range",
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: "tier_only",
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [],
    tags: ["indonesian", "modern", "dinner", "ubud"],
    dining: {
      cuisineTypes: ["indonesian", "modern_indonesian"],
      mealTypes: ["lunch", "dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "ubud-kubu-at-mandapa",
    name: "Kubu at Mandapa",
    name_ar: "كوبو في ماندابا",
    category: "restaurant",
    subcategory: "fine_dining",
    area: "Ubud",
    area_note: "Mandapa resort area, riverside fine dining",
    description:
      "Fine-dining restaurant associated with Mandapa, a Ritz-Carlton Reserve property, emphasizing riverside setting and elevated tasting menus.",
    why_visit: "Destination fine dining with a strong sense of place beside the river.",
    best_for: ["fine_dining", "special_occasion", "luxury_travel"],
    rating: {
      value: 4.9,
      scale: 5,
      review_count: 1489,
      provider: "Tripadvisor",
      verified_at: null,
      scope: "public_listing_snapshot",
    },
    price: {
      tier: "luxury",
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: "tier_only",
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: true,
    source_urls: [],
    tags: ["fine_dining", "luxury", "riverside", "ubud"],
    dining: {
      cuisineTypes: ["fine_dining", "indonesian_inspired"],
      mealTypes: ["dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "ubud-moksa",
    name: "Moksa Ubud",
    name_ar: "موكسا أوبود",
    category: "restaurant",
    subcategory: "plant_based",
    area: "Ubud",
    area_note: "Ubud plant-based dining",
    description:
      "Plant-based restaurant in Ubud focused on fresh produce and vegetarian/vegan plates in a garden setting.",
    why_visit: "One of Ubud’s better-known plant-based dining destinations.",
    best_for: ["vegan", "vegetarian", "healthy_dining"],
    rating: {
      value: 4.7,
      scale: 5,
      review_count: 1154,
      provider: "Tripadvisor",
      verified_at: null,
      scope: "public_listing_snapshot",
    },
    price: {
      tier: "mid_range",
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: "tier_only",
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [],
    tags: ["plant_based", "vegan", "garden", "ubud"],
    dining: {
      cuisineTypes: ["plant_based", "vegetarian"],
      mealTypes: ["lunch", "dinner"],
      dietaryOptions: ["vegan", "vegetarian"],
    },
  },
  {
    external_key: "ubud-murnis-warung",
    name: "Murni’s Warung",
    name_ar: "مورنيز وارونغ",
    category: "restaurant",
    subcategory: "indonesian_balinese",
    area: "Ubud",
    area_note: "Campuhan / central Ubud classic warung",
    description:
      "Long-standing Balinese/Indonesian warung overlooking the Campuhan river gorge — a local institution.",
    why_visit: "Classic Ubud warung dining with a riverside setting and deep local history.",
    best_for: ["balinese_food", "warung", "lunch"],
    rating: {
      value: 4.3,
      scale: 5,
      review_count: 1849,
      provider: "Tripadvisor",
      verified_at: null,
      scope: "public_listing_snapshot",
    },
    price: {
      tier: "mid_range",
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: "tier_only",
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [],
    tags: ["balinese", "warung", "riverside", "classic"],
    dining: {
      cuisineTypes: ["indonesian", "balinese"],
      mealTypes: ["lunch", "dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "ubud-aperitif-restaurant",
    name: "Apéritif Restaurant",
    name_ar: "مطعم أبيريتيف",
    category: "restaurant",
    subcategory: "fine_dining",
    area: "Ubud",
    area_note: "Ubud fine dining",
    description:
      "Fine-dining restaurant in Ubud known for refined tasting menus and cocktail-forward hospitality.",
    why_visit: "Elevated evening dining for travellers seeking a special-occasion table in Ubud.",
    best_for: ["fine_dining", "cocktails", "special_occasion"],
    rating: {
      value: 4.9,
      scale: 5,
      review_count: 434,
      provider: "Tripadvisor",
      verified_at: null,
      scope: "public_listing_snapshot",
    },
    price: {
      tier: "luxury",
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: "tier_only",
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: true,
    source_urls: [],
    tags: ["fine_dining", "luxury", "cocktails", "ubud"],
    dining: {
      cuisineTypes: ["fine_dining", "contemporary"],
      mealTypes: ["dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "ubud-suka-ubud",
    name: "Suka Ubud",
    name_ar: "سوكا أوبود",
    category: "cafe",
    subcategory: "brunch_specialty_coffee",
    area: "Ubud",
    area_note: "Ubud cafe / brunch",
    description:
      "Cafe known for brunch plates and specialty coffee in the Ubud cafe scene.",
    why_visit: "Strong brunch and coffee stop for daytime plans in Ubud.",
    best_for: ["brunch", "coffee", "daytime"],
    rating: {
      value: 4.8,
      scale: 5,
      review_count: 511,
      provider: null,
      verified_at: null,
      scope: "public_listing_snapshot_provider_unspecified",
    },
    price: {
      tier: "mid_range",
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: "tier_only",
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [],
    tags: ["brunch", "coffee", "cafe", "ubud"],
    dining: {
      cuisineTypes: ["cafe", "brunch"],
      mealTypes: ["breakfast", "brunch", "lunch"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "ubud-watercress",
    name: "Watercress Ubud",
    name_ar: "ووتركريس أوبود",
    category: "cafe",
    subcategory: "brunch_cafe",
    area: "Ubud",
    area_note: "Ubud brunch cafe",
    description:
      "Popular Ubud brunch cafe with a broad daytime menu and busy local reputation.",
    why_visit: "Reliable brunch cafe with strong traveller review volume.",
    best_for: ["brunch", "cafe", "groups"],
    rating: {
      value: 4.5,
      scale: 5,
      review_count: 1768,
      provider: null,
      verified_at: null,
      scope: "public_listing_snapshot_provider_unspecified",
    },
    price: {
      tier: "mid_range",
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: "tier_only",
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [],
    tags: ["brunch", "cafe", "ubud"],
    dining: {
      cuisineTypes: ["cafe", "brunch"],
      mealTypes: ["breakfast", "brunch", "lunch"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "ubud-ivy-cafe",
    name: "Ivy Cafe",
    name_ar: "مقهى آيفي",
    category: "cafe",
    subcategory: "all_day_cafe",
    area: "Ubud",
    area_note: "Ubud all-day cafe",
    description:
      "All-day cafe in Ubud with a large review footprint among travellers.",
    why_visit: "Flexible daytime cafe stop with consistently high public ratings.",
    best_for: ["cafe", "all_day", "coffee"],
    rating: {
      value: 5.0,
      scale: 5,
      review_count: 1996,
      provider: null,
      verified_at: null,
      scope: "public_listing_snapshot_provider_unspecified",
    },
    price: {
      tier: "mid_range",
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: "tier_only",
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [],
    tags: ["cafe", "all_day", "ubud"],
    dining: {
      cuisineTypes: ["cafe"],
      mealTypes: ["breakfast", "lunch"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "ubud-gangga-coffee",
    name: "Gangga Coffee Ubud",
    name_ar: "غانغا كوفي أوبود",
    category: "cafe",
    subcategory: "coffee_shop",
    area: "Ubud",
    area_note: "Ubud specialty coffee",
    description:
      "Coffee-focused cafe in Ubud suited to shorter specialty-coffee stops.",
    why_visit: "Compact coffee stop when you want beans and a quieter cafe pace.",
    best_for: ["coffee", "specialty_coffee", "quick_stop"],
    rating: {
      value: 4.7,
      scale: 5,
      review_count: 384,
      provider: null,
      verified_at: null,
      scope: "public_listing_snapshot_provider_unspecified",
    },
    price: {
      tier: "budget_mid_range",
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: "tier_only",
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [],
    tags: ["coffee", "specialty_coffee", "cafe"],
    dining: {
      cuisineTypes: ["coffee"],
      mealTypes: ["breakfast", "snacks"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "ubud-sacred-monkey-forest",
    name: "Sacred Monkey Forest Sanctuary",
    name_ar: "محمية غابة القرود المقدسة",
    category: "attraction",
    subcategory: "nature_wildlife_cultural_site",
    area: "Padangtegal, Ubud",
    area_note: "Within greater Ubud; not a single walking-distance cluster with all other listings",
    description:
      "Forest sanctuary and temple complex in Padangtegal known for long-tailed macaques and shaded walking paths.",
    why_visit: "Signature Ubud nature-and-culture visit combining forest paths and temple grounds.",
    best_for: ["nature", "wildlife", "families", "first_time_ubud"],
    rating: {
      value: 4.2,
      scale: 5,
      review_count: 35730,
      provider: null,
      verified_at: null,
      scope: "public_listing_snapshot_provider_unspecified",
    },
    price: {
      tier: null,
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: null,
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: 90,
    booking_recommended: false,
    source_urls: [],
    tags: ["nature", "wildlife", "temple", "ubud"],
    attraction: {
      attractionType: "natural",
      typicalDurationMinutes: 90,
      bookingRequired: false,
      suitableFor: ["families", "first_time_visitors"],
    },
  },
  {
    external_key: "ubud-campuhan-ridge-walk",
    name: "Campuhan Ridge Walk",
    name_ar: "ممر كامبوهان ريدج",
    category: "attraction",
    subcategory: "scenic_walk",
    area: "Campuhan, Ubud",
    area_note: "Scenic ridge walk from Campuhan / central Ubud approaches",
    description:
      "Open ridge walking path through grassy hills above the Campuhan river confluence — a popular free scenic walk.",
    why_visit: "Easy scenic walk with open views close to central Ubud.",
    best_for: ["walking", "sunrise", "views", "free_activities"],
    rating: {
      value: 4.3,
      scale: 5,
      review_count: 6789,
      provider: null,
      verified_at: null,
      scope: "public_listing_snapshot_provider_unspecified",
    },
    price: {
      tier: null,
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: null,
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: 60,
    booking_recommended: false,
    source_urls: [],
    tags: ["walk", "views", "nature", "free"],
    attraction: {
      attractionType: "viewpoint",
      typicalDurationMinutes: 60,
      bookingRequired: false,
      suitableFor: ["walkers", "sunrise"],
    },
  },
  {
    external_key: "ubud-tirta-empul",
    name: "Tirta Empul Temple",
    name_ar: "معبد تيرتا إمبُل",
    category: "attraction",
    subcategory: "hindu_temple_cultural_site",
    area: "Tampaksiring",
    area_note:
      "Excursion destination in Tampaksiring — not central Ubud walking distance",
    description:
      "Hindu water temple in Tampaksiring known for purification pools fed by a natural spring.",
    why_visit: "Important cultural site and day excursion from Ubud into Tampaksiring.",
    best_for: ["culture", "temple", "day_trip"],
    rating: {
      value: 4.4,
      scale: 5,
      review_count: 3644,
      provider: null,
      verified_at: null,
      scope: "public_listing_snapshot_provider_unspecified",
    },
    price: {
      tier: null,
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: null,
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: 90,
    booking_recommended: false,
    source_urls: [],
    tags: ["temple", "culture", "tampaksiring", "day_trip"],
    attraction: {
      attractionType: "cultural",
      typicalDurationMinutes: 90,
      bookingRequired: false,
      suitableFor: ["culture", "day_trip"],
    },
  },
  {
    external_key: "ubud-mount-batur-sunrise-trek",
    name: "Mount Batur Sunrise Trek",
    name_ar: "تسلق شروق جبل باتور",
    category: "activity",
    subcategory: "guided_volcano_trek",
    area: "Kintamani",
    area_note:
      "Kintamani / Mount Batur excursion — typically pre-dawn departure from Ubud area",
    description:
      "Guided sunrise trek on Mount Batur in the Kintamani volcanic region northeast of Ubud.",
    why_visit: "Classic Bali adventure day trip for active travellers based in Ubud.",
    best_for: ["adventure", "sunrise", "trekking", "day_trip"],
    rating: {
      value: 5.0,
      scale: 5,
      review_count: 1351,
      provider: null,
      verified_at: null,
      scope: "public_listing_snapshot_provider_unspecified",
    },
    price: {
      tier: null,
      amount_min: 22,
      amount_max: null,
      currency: "USD",
      basis: "indicative_advertised_starting_price",
      status: "indicative_not_a_quote",
      notes:
        "Advertised starting price observed in public listings. Not a confirmed supplier quote. Convert/validate before publishing.",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: 360,
    booking_recommended: true,
    source_urls: [],
    tags: ["trek", "volcano", "sunrise", "kintamani", "excursion"],
    activity: {
      activityType: "adventure",
      typicalDurationMinutes: 360,
      bookingRequired: true,
    },
  },
  {
    external_key: "ubud-atv-quad-bike-adventure",
    name: "Ubud ATV Quad Bike Adventure",
    name_ar: "مغامرة الدراجات الرباعية في أوبود",
    category: "activity",
    subcategory: "atv_off_road",
    area: "Greater Ubud / surrounding villages",
    area_note: "Off-road routes typically around village roads and farmland outside the town centre",
    description:
      "Guided ATV / quad-bike adventure through countryside trails near the Ubud area.",
    why_visit: "High-energy off-road activity popular with short-stay travellers.",
    best_for: ["adventure", "groups", "active"],
    rating: {
      value: 4.9,
      scale: 5,
      review_count: 1995,
      provider: null,
      verified_at: null,
      scope: "public_listing_snapshot_provider_unspecified",
    },
    price: {
      tier: null,
      amount_min: 29,
      amount_max: null,
      currency: "USD",
      basis: "indicative_advertised_starting_price",
      status: "indicative_not_a_quote",
      notes:
        "Advertised starting price observed in public listings. Not a confirmed supplier quote.",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: 180,
    booking_recommended: true,
    source_urls: [],
    tags: ["atv", "adventure", "off_road", "ubud"],
    activity: {
      activityType: "adventure",
      typicalDurationMinutes: 180,
      bookingRequired: true,
    },
  },
  {
    external_key: "ubud-ayung-river-rafting",
    name: "Ayung River White-Water Rafting",
    name_ar: "تجديف نهر أيونغ",
    category: "activity",
    subcategory: "white_water_rafting",
    area: "Payangan / Ayung River",
    area_note:
      "Payangan / Ayung River excursion — not a central Ubud walking venue",
    description:
      "White-water rafting on the Ayung River through jungle gorges north of Ubud (Payangan area).",
    why_visit: "Signature Bali water adventure reachable as an excursion from Ubud.",
    best_for: ["adventure", "water_sports", "groups"],
    rating: {
      value: 4.9,
      scale: 5,
      review_count: 615,
      provider: null,
      verified_at: null,
      scope: "public_listing_snapshot_provider_unspecified",
    },
    price: {
      tier: null,
      amount_min: 23,
      amount_max: null,
      currency: "USD",
      basis: "indicative_advertised_starting_price",
      status: "indicative_not_a_quote",
      notes:
        "Advertised starting price observed in public listings. Not a confirmed supplier quote.",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: 240,
    booking_recommended: true,
    source_urls: [],
    tags: ["rafting", "ayung", "payangan", "water_sports", "excursion"],
    activity: {
      activityType: "water_sports",
      typicalDurationMinutes: 240,
      bookingRequired: true,
    },
  },
  {
    external_key: "ubud-balinese-cooking-class",
    name: "Balinese Cooking Class & Market Tour",
    name_ar: "دورة طبخ بالية وجولة سوق",
    category: "activity",
    subcategory: "cooking_class_cultural_experience",
    area: "Ubud",
    area_note: "Usually includes a local market visit plus hands-on cooking near Ubud",
    description:
      "Hands-on Balinese cooking class, often paired with a guided market tour for fresh ingredients.",
    why_visit: "Cultural food experience that pairs well with Ubud’s culinary reputation.",
    best_for: ["culture", "food", "families", "hands_on"],
    rating: {
      value: 4.9,
      scale: 5,
      review_count: 396,
      provider: null,
      verified_at: null,
      scope: "public_listing_snapshot_provider_unspecified",
    },
    price: {
      tier: null,
      amount_min: 18,
      amount_max: null,
      currency: "USD",
      basis: "indicative_advertised_starting_price",
      status: "indicative_not_a_quote",
      notes:
        "Advertised starting price observed in public listings. Not a confirmed supplier quote.",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: 240,
    booking_recommended: true,
    source_urls: [],
    tags: ["cooking_class", "culture", "food", "market"],
    activity: {
      activityType: "tour",
      typicalDurationMinutes: 240,
      bookingRequired: true,
    },
  },
  {
    external_key: "ubud-donna",
    name: "Donna",
    name_ar: "دونا",
    category: "bar",
    subcategory: "restaurant_cocktail_bar",
    area: "Ubud",
    area_note: "Ubud restaurant–cocktail bar",
    description:
      "Restaurant and cocktail bar in Ubud combining dinner service with a strong drinks programme.",
    why_visit: "Evening venue when you want dinner and cocktails in one stop.",
    best_for: ["cocktails", "dinner", "nightlife_light"],
    rating: {
      value: 4.9,
      scale: 5,
      review_count: 2463,
      provider: "Tripadvisor",
      verified_at: null,
      scope: "public_listing_snapshot",
    },
    price: {
      tier: null,
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: null,
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [],
    tags: ["cocktails", "bar", "dinner", "ubud"],
    dining: {
      cuisineTypes: ["contemporary", "cocktails"],
      mealTypes: ["dinner", "drinks"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "ubud-no-mas",
    name: "No Más",
    name_ar: "نو ماس",
    category: "nightlife",
    subcategory: "live_music_cocktail_bar",
    area: "Ubud",
    area_note: "Ubud live-music cocktail venue",
    description:
      "Cocktail bar with live music energy — an evening nightlife option in Ubud.",
    why_visit: "Live-music drinks stop for later evenings in town.",
    best_for: ["live_music", "cocktails", "nightlife"],
    rating: {
      value: 4.4,
      scale: 5,
      review_count: 232,
      provider: "business_listing_snapshot",
      verified_at: null,
      scope: "business_listing_snapshot",
    },
    price: {
      tier: null,
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: null,
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [],
    tags: ["live_music", "cocktails", "nightlife"],
    nightlife: {
      venueType: "music_venue",
      musicGenres: ["live"],
    },
  },
  {
    external_key: "ubud-blue-door",
    name: "The Blue Door Bar, Restaurant & Club",
    name_ar: "ذا بلو دور",
    category: "nightlife",
    subcategory: "club_live_music",
    area: "Ubud",
    area_note: "Ubud club / late nightlife venue",
    description:
      "Bar, restaurant, and club venue in Ubud oriented toward later nightlife and live music.",
    why_visit: "Later-night option when the evening needs a clubbier energy.",
    best_for: ["nightlife", "club", "live_music"],
    rating: {
      value: 4.8,
      scale: 5,
      review_count: 114,
      provider: "business_listing_snapshot",
      verified_at: null,
      scope: "business_listing_snapshot",
    },
    price: {
      tier: null,
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: null,
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [],
    tags: ["club", "live_music", "nightlife"],
    nightlife: {
      venueType: "nightclub",
      musicGenres: ["live", "dance"],
    },
  },
  {
    external_key: "ubud-lokal-bar",
    name: "Lokal Bar Ubud",
    name_ar: "لوكال بار أوبود",
    category: "nightlife",
    subcategory: "cocktail_live_music_bar",
    area: "Ubud",
    area_note: "Ubud cocktail / live-music bar",
    description:
      "Cocktail bar with live-music programming in Ubud’s evening scene.",
    why_visit: "Smaller-venue cocktails and live music without a full club night.",
    best_for: ["cocktails", "live_music", "nightlife"],
    rating: {
      value: 4.9,
      scale: 5,
      review_count: 28,
      provider: "business_listing_snapshot",
      verified_at: null,
      scope: "business_listing_snapshot",
    },
    price: {
      tier: null,
      amount_min: null,
      amount_max: null,
      currency: "IDR",
      basis: null,
      status: "unknown",
    },
    address: null,
    coordinates: { lat: null, lng: null, source: null, verified_at: null },
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [],
    tags: ["cocktails", "live_music", "bar", "nightlife"],
    nightlife: {
      venueType: "bar_nightlife",
      musicGenres: ["live"],
    },
  },
];

function toEditorialRecord(p) {
  return {
    external_key: p.external_key,
    name: p.name,
    name_ar: p.name_ar,
    country_code: "ID",
    destination_slug: "ubud",
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
    ranking_support: rankingSupport(p),
  };
}

function importExternalKey(editorialKey) {
  // Hierarchical idempotent key: id:<destination>:<local-key-without-destination-prefix>
  const local = editorialKey.startsWith("ubud-")
    ? editorialKey.slice("ubud-".length)
    : editorialKey;
  return `id:ubud:${local}`;
}

function ratingPlatform(rating) {
  if (rating.provider === "Tripadvisor") return "Tripadvisor";
  if (rating.provider === "business_listing_snapshot") {
    return "business_listing_snapshot";
  }
  // Provider unspecified in brief — do not invent Tripadvisor attribution.
  return "provider_unspecified";
}

function sourceForPlace(p) {
  const provider = p.rating.provider;
  if (provider === "Tripadvisor") {
    return {
      sourceType: "maps_listing",
      name: "Tripadvisor public listing snapshot",
      notes:
        "Rating value and review_count preserved from supplied Tripadvisor snapshot. Not Helm-verified.",
      collectedAt: COMPILED_AT,
    };
  }
  if (provider === "business_listing_snapshot") {
    return {
      sourceType: "other",
      name: "Business listing snapshot",
      notes:
        "Rating value and review_count preserved from a business-listing snapshot. Not Helm-verified. Distinct from Tripadvisor.",
      collectedAt: COMPILED_AT,
    };
  }
  return {
    sourceType: "manual_research",
    name: "Helm curated Ubud dataset v1",
    notes:
      "Rating value and review_count preserved from the curated brief; original listing provider was not specified. Not Helm-verified.",
    collectedAt: COMPILED_AT,
  };
}

function toImportPlace(p) {
  const level = priceTierToLevel(p.price?.tier);
  /** @type {Record<string, unknown>} */
  const place = {
    externalKey: importExternalKey(p.external_key),
    destinationSlug: "ubud",
    category: p.category,
    subcategory: p.subcategory,
    slug: p.external_key,
    nameEn: p.name,
    nameAr: p.name_ar,
    shortDescriptionEn: p.why_visit.slice(0, 500),
    descriptionEn: [
      p.description,
      `Area: ${p.area}. ${p.area_note}`,
      p.price?.status === "indicative_not_a_quote"
        ? `Indicative advertised starting price: ${p.price.currency} ${p.price.amount_min} (${p.price.basis}; not a confirmed supplier quote).`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n"),
    tags: p.tags,
    updateIfExists: false,
    sources: [sourceForPlace(p)],
    rating: {
      value: p.rating.value,
      scale: p.rating.scale,
      reviewCount: p.rating.review_count,
      platform: ratingPlatform(p.rating),
      observedAt: COMPILED_AT,
    },
  };

  if (level != null) place.priceLevel = level;
  // Never set latitude/longitude/address/website when unknown.
  if (p.dining) place.dining = p.dining;
  if (p.attraction) place.attraction = p.attraction;
  if (p.activity) place.activity = p.activity;
  if (p.nightlife) place.nightlife = p.nightlife;

  return place;
}

const editorial = {
  dataset: DATASET_VERSION,
  format: "helm.catalog.editorial.v1",
  compiled_at: COMPILED_AT,
  locale_primary: "en",
  locale_secondary: "ar",
  country: {
    name: "Indonesia",
    iso2: "ID",
    currency: "IDR",
    note:
      "Apply-time prerequisite: geo.countries must include ID and pricing.currencies must include IDR (not present in default seed.sql as of this dataset).",
  },
  destination: {
    name: "Ubud",
    name_ar: "أوبود",
    slug: "ubud",
    external_key: "id:ubud",
    type: "destination_area",
    type_note:
      "Editorial type only — catalog.destinations has no destination_type column; not imported as a typed enum.",
    region: "Central Bali",
    parent: "Indonesia",
    parent_note:
      "Editorial parent label. Import format does not set parent_id; no Indonesia destination row is required for countryCode ID.",
    country_code: "ID",
    recommended_duration: "2–4 days",
    tags: [
      "culture",
      "nature",
      "jungle",
      "rice_terraces",
      "wellness",
      "adventure",
      "food",
      "cafes",
    ],
    data_status: "curated_needs_verification",
    publication_status: "draft",
    unpublished: true,
    summary_en:
      "Central Bali’s cultural heart — rice terraces, temples, cafes, and day excursions into Kintamani, Tampaksiring, and the Ayung River.",
    summary_ar:
      "قلب بالي الثقافي — مدرجات الأرز والمعابد والمقاهي ورحلات يومية إلى كينتاماني وتامباكسيرينغ ونهر أيونغ.",
  },
  category_distribution: {
    restaurant: 5,
    cafe: 4,
    attraction: 3,
    activity: 4,
    bar_nightlife: 4,
  },
  integrity: {
    do_not_invent: [
      "exact_coordinates",
      "opening_hours",
      "booking_urls",
      "confirmed_supplier_prices",
      "google_maps_place_ids",
      "provider_ids",
    ],
    activity_prices: "indicative_advertised_starting_price_only",
    lifecycle: "all_records_draft_curated_needs_verification",
  },
  places: PLACES.map(toEditorialRecord),
  mapping: {
    import_file: "ubud-curated-v1.json",
    import_format: "helm.catalog.import.v1",
    external_key_rule:
      "editorial.external_key (e.g. ubud-hujan-locale) → import.externalKey id:ubud:<suffix> (e.g. id:ubud:hujan-locale); import.slug keeps editorial key",
    unsupported_in_import: [
      "destination.type / destination_area",
      "destination.parent hierarchy",
      "why_visit / best_for (folded into shortDescriptionEn / tags where useful)",
      "opening_hours",
      "structured price amounts (only priceLevel 1–4)",
      "coordinates when null (omitted)",
      "ranking_support block",
      "data_status curated_needs_verification (import creates draft lifecycle)",
      "indicative activity USD amounts as first-class price rows",
    ],
  },
};

const importPayload = {
  formatVersion: "helm.catalog.import.v1",
  sourceLabel: DATASET_VERSION,
  destinations: [
    {
      externalKey: "id:ubud",
      slug: "ubud",
      nameEn: "Ubud",
      nameAr: "أوبود",
      countryCode: "ID",
      // citySlug omitted — Ubud city row may not exist in geo; countryCode alone is required.
      summaryEn: editorial.destination.summary_en,
      summaryAr: editorial.destination.summary_ar,
      shortDescriptionEn:
        "Central Bali cultural destination — temples, rice terraces, cafes, and nearby excursions. Recommended stay 2–4 days.",
      tags: editorial.destination.tags,
      updateIfExists: false,
      sources: [
        {
          sourceType: "manual_research",
          name: "Helm curated Ubud destination notes",
          notes:
            "Draft curated destination. Unpublished. Needs verification before publish.",
          collectedAt: COMPILED_AT,
        },
      ],
    },
  ],
  places: PLACES.map(toImportPlace),
};

mkdirSync(OUT_DIR, { recursive: true });
const sourcePath = join(OUT_DIR, "ubud-curated-v1.source.json");
const importPath = join(OUT_DIR, "ubud-curated-v1.json");
writeFileSync(sourcePath, `${JSON.stringify(editorial, null, 2)}\n`);
writeFileSync(importPath, `${JSON.stringify(importPayload, null, 2)}\n`);
console.log(`Wrote ${sourcePath}`);
console.log(`Wrote ${importPath}`);
console.log(`Places: ${importPayload.places.length}`);

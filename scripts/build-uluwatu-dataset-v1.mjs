#!/usr/bin/env node
/**
 * Builds Uluwatu curated dataset v1 (30 places):
 * - data/imports/indonesia/uluwatu/uluwatu-curated-v1.source.json
 * - data/imports/indonesia/uluwatu/uluwatu-curated-v1.json (helm.catalog.import.v1)
 *
 * Research leads ≠ verified facts. Unknown ratings/prices/coords/amenities stay null/omitted.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "data/imports/indonesia/uluwatu");
const COMPILED_AT = "2026-11-19";
const DATASET_VERSION = "uluwatu-curated-v1";

function nullCoords() {
  return { lat: null, lng: null, source: null, verified_at: null };
}

function unknownPrice(currency = "IDR") {
  return {
    tier: null,
    amount_min: null,
    amount_max: null,
    currency,
    basis: null,
    status: "unknown",
  };
}

function nullRating() {
  return {
    value: null,
    scale: 5,
    review_count: null,
    provider: null,
    verified_at: null,
    scope: null,
  };
}

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

/** Exactly 30 research-lead places. */
const PLACES = [
  // —— Restaurants (6 including Ours) ——
  {
    external_key: "uluwatu-the-warung-alila",
    name: "The Warung at Alila Villas Uluwatu",
    name_ar: "ذا وارونغ في أليلا فيلات أولوواتو",
    category: "restaurant",
    subcategory: "indonesian_fine_casual",
    area: "Pecatu",
    area_note: "On the Alila Villas Uluwatu cliff campus — not a central-town walking cluster",
    description:
      "Elevated Indonesian dining associated with Alila Villas Uluwatu, frequently cited for contemporary local dishes in a cliffside resort setting.",
    why_visit: "A polished Indonesian meal with a strong sense of Bukit place.",
    best_for: ["dinner", "indonesian_cuisine", "special_occasion"],
    rating: nullRating(),
    price: { ...unknownPrice(), tier: "upscale", basis: "tier_only" },
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.alilahotels.com/uluwatu/dining/the-warung/"],
    websiteUrl: "https://www.alilahotels.com/uluwatu/dining/the-warung/",
    tags: ["indonesian", "resort_dining", "pecatu", "cliff"],
    dining: {
      cuisineTypes: ["indonesian", "balinese"],
      mealTypes: ["lunch", "dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "uluwatu-ulu-garden",
    name: "Ulu Garden",
    name_ar: "ولو غاردن",
    category: "restaurant",
    subcategory: "garden_restaurant",
    area: "Padang Padang / Pecatu",
    area_note: "On Jl. Pantai Padang-Padang (ULU Tribe) — not a beach-club listing",
    description:
      "Open-air contemporary Indonesian garden restaurant on Padang Padang Beach Street (ULU Tribe), with daytime through evening dining and cultural programming cited on the brand site.",
    why_visit: "Relaxed garden dining close to the Padang Padang coast.",
    best_for: ["indonesian_food", "garden", "all_day"],
    rating: nullRating(),
    price: { ...unknownPrice(), tier: "mid_range", basis: "tier_only" },
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://ulutribe.com/ulu-garden/"],
    websiteUrl: "https://ulutribe.com/ulu-garden/",
    tags: ["garden", "indonesian", "padang_padang"],
    dining: {
      cuisineTypes: ["indonesian", "contemporary"],
      mealTypes: ["breakfast", "lunch", "dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "uluwatu-gooseberry",
    name: "Gooseberry",
    name_ar: "غوسبيري",
    category: "restaurant",
    subcategory: "french_dining",
    area: "Bingin / Pecatu",
    area_note: "Above Bingin Beach (Gang Pirta) — French restaurant, not a beach club",
    description:
      "Modern French restaurant above Bingin Beach with classic technique, garden/poolside seating, and daytime through dinner service per the brand site.",
    why_visit: "Date-night French dining away from the busiest beach-club scene.",
    best_for: ["dinner", "date_night", "french_cuisine"],
    rating: nullRating(),
    price: { ...unknownPrice(), tier: "upscale", basis: "tier_only" },
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.gooseberry-restaurant.com/"],
    websiteUrl: "https://www.gooseberry-restaurant.com/",
    tags: ["french", "dinner", "bingin"],
    dining: {
      cuisineTypes: ["french"],
      mealTypes: ["breakfast", "lunch", "dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "uluwatu-mana",
    name: "Mana",
    name_ar: "مانا",
    category: "restaurant",
    subcategory: "cliffside_dining",
    area: "Suluban / Uluwatu Surf Villas",
    area_note:
      "Cliffside restaurant at Uluwatu Surf Villas — frequently cited for sunset views; confirm current hours before publish",
    description:
      "Cliffside restaurant and bar associated with Uluwatu Surf Villas, repeatedly listed for sunset dining and ocean views over the Suluban / Uluwatu break area.",
    why_visit: "Sunset cliff dining with a strong Bukit viewpoint reputation.",
    best_for: ["sunset", "dinner", "drinks"],
    rating: nullRating(),
    price: { ...unknownPrice(), tier: "mid_range", basis: "tier_only" },
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://uluwatusurfvillas.com/restaurant/"],
    websiteUrl: "https://uluwatusurfvillas.com/restaurant/",
    tags: ["sunset", "cliff", "dinner", "uluwatu"],
    dining: {
      cuisineTypes: ["contemporary", "coastal"],
      mealTypes: ["lunch", "dinner", "drinks"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "uluwatu-teja",
    name: "Teja Uluwatu",
    name_ar: "تيجا أولوواتو",
    category: "restaurant",
    subcategory: "live_fire_dining",
    area: "Pecatu / Uluwatu",
    area_note: "Jl. Mamo, Pecatu — live-fire Modern European; not a Canggu venue",
    description:
      "Live-fire Modern European restaurant in Pecatu focused on flame-grilled steaks and dry-aged seafood, frequently recommended for sunset cliff dining.",
    why_visit: "Fire-kissed dinner with a strong sunset-dining reputation on the Bukit.",
    best_for: ["dinner", "sunset", "steak"],
    rating: nullRating(),
    price: { ...unknownPrice(), tier: "upscale", basis: "tier_only" },
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.tejauluwatu.com/"],
    websiteUrl: "https://www.tejauluwatu.com/",
    tags: ["live_fire", "dinner", "sunset", "pecatu"],
    dining: {
      cuisineTypes: ["modern_european", "grill"],
      mealTypes: ["dinner"],
      dietaryOptions: [],
    },
  },

  // —— Cafes (3 after Ours reclassification) ——
  {
    external_key: "uluwatu-suka-espresso",
    name: "Suka Espresso",
    name_ar: "سوكا إسبريسو",
    category: "cafe",
    subcategory: "specialty_coffee_brunch",
    area: "Uluwatu / Pecatu",
    area_note: "Cafe circuit on the Bukit — confirm branch address before publish",
    description:
      "Specialty-coffee and brunch cafe frequently recommended for breakfast and daytime stops in Uluwatu.",
    why_visit: "Reliable coffee and brunch stop for Bukit mornings.",
    best_for: ["brunch", "coffee", "daytime"],
    rating: nullRating(),
    price: { ...unknownPrice(), tier: "mid_range", basis: "tier_only" },
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.sukaespresso.com/"],
    websiteUrl: "https://www.sukaespresso.com/",
    tags: ["coffee", "brunch", "cafe"],
    dining: {
      cuisineTypes: ["cafe", "brunch"],
      mealTypes: ["breakfast", "brunch", "lunch"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "uluwatu-bambu-cafe",
    name: "Bambu Cafe",
    name_ar: "بامبو كافيه",
    category: "cafe",
    subcategory: "healthy_cafe",
    area: "Bingin / Pecatu",
    area_note:
      "On the Bambu Fitness Bali campus at Jl. Pantai Bingin 8 — open to non-members per brand cafe page",
    description:
      "Healthy cafe on the Bambu Fitness Bali campus in Bingin, with breakfast, bowls, smoothies, and specialty coffee listed on the brand cafe page.",
    why_visit: "Daytime cafe stop when you want a quieter brunch pace.",
    best_for: ["breakfast", "lunch", "healthy"],
    rating: nullRating(),
    price: { ...unknownPrice(), tier: "mid_range", basis: "tier_only" },
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.bambufitnessbali.com/bambu-cafe"],
    websiteUrl: "https://www.bambufitnessbali.com/bambu-cafe",
    tags: ["cafe", "breakfast", "healthy", "bingin"],
    dining: {
      cuisineTypes: ["cafe"],
      mealTypes: ["breakfast", "lunch"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "uluwatu-ours",
    name: "Ours Uluwatu",
    name_ar: "أورز أولوواتو",
    category: "restaurant",
    subcategory: "all_day_dining",
    area: "Labuansait / Pecatu",
    area_note:
      "Reclassified from cafe → restaurant per brand positioning. Official site brands Ours as an all-day restaurant (breakfast through dinner, cocktails/wine)",
    description:
      "All-day restaurant on Jl. Labuansait in Pecatu. Brand site describes breakfast-to-dinner dining, pasta nights, and a cocktail/wine list — not a specialty-coffee cafe.",
    why_visit: "All-day Bukit restaurant stop from breakfast through evening.",
    best_for: ["breakfast", "dinner", "all_day"],
    rating: nullRating(),
    price: { ...unknownPrice(), tier: "mid_range", basis: "tier_only" },
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.oursbali.com/"],
    websiteUrl: "https://www.oursbali.com/",
    tags: ["all_day", "restaurant", "labuansait"],
    dining: {
      cuisineTypes: ["contemporary", "international"],
      mealTypes: ["breakfast", "lunch", "dinner", "drinks"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "uluwatu-alchemy",
    name: "Alchemy Uluwatu",
    name_ar: "ألكيمي أولوواتو",
    category: "cafe",
    subcategory: "plant_based_cafe",
    area: "Bingin / Pecatu",
    area_note:
      "Replaced Lands End Cafe (weak brand provenance). Alchemy Uluwatu is the Bingin plant-based venue on the brand site — distinct from Alchemy Ubud/Canggu",
    description:
      "Plant-based cafe/restaurant in Bingin (Alchemy Bali Uluwatu location), with an organic / regenerative ingredient focus and gluten-free menu framing on the brand site.",
    why_visit: "Plant-based daytime stop with a clear Bingin brand presence.",
    best_for: ["vegan", "healthy", "brunch", "cafe"],
    rating: nullRating(),
    price: { ...unknownPrice(), tier: "mid_range", basis: "tier_only" },
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.alchemybali.co/uluwatu"],
    websiteUrl: "https://www.alchemybali.co/uluwatu",
    tags: ["cafe", "plant_based", "vegan", "bingin"],
    dining: {
      cuisineTypes: ["plant_based", "cafe"],
      mealTypes: ["breakfast", "lunch", "dinner"],
      dietaryOptions: ["vegan", "gluten_free"],
    },
  },

  // —— Attractions (4 after Green Bowl reclassification) ——
  {
    external_key: "uluwatu-pura-luhur",
    name: "Uluwatu Temple (Pura Luhur Uluwatu)",
    name_ar: "معبد أولوواتو (بورا لوهور أولوواتو)",
    category: "attraction",
    subcategory: "hindu_temple_cultural_site",
    area: "Pecatu / Uluwatu cliffs",
    area_note: "Cliff-top temple complex — not a beach club; allow time for transport and stairs",
    description:
      "Iconic sea-cliff Hindu temple (Pura Luhur Uluwatu), one of Bali’s key directional temples, with dramatic ocean views and resident macaques.",
    why_visit: "Signature Bukit cultural landmark and sunset viewpoint.",
    best_for: ["culture", "sunset", "first_time_uluwatu"],
    rating: nullRating(),
    price: unknownPrice(),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://lovebali.baliprov.go.id/destination/detail/231/kawasan-luar-pura-uluwatu-(uluwatu-temple)",
    ],
    tags: ["temple", "culture", "cliffs", "pecatu"],
    attraction: {
      attractionType: "cultural",
      suitableFor: ["culture", "sunset", "first_time_visitors"],
    },
  },
  {
    external_key: "uluwatu-padang-padang-beach",
    name: "Padang Padang Beach",
    name_ar: "شاطئ بادانغ بادانغ",
    category: "attraction",
    subcategory: "beach",
    area: "Padang Padang / Labuan Sait",
    area_note:
      "Also known locally as Labuan Sait Beach; cliff-access beach — not walking distance to all Uluwatu listings",
    description:
      "Well-known Bukit beach (Padang Padang / Labuan Sait) with cliff access, popular for swimming when conditions allow and for nearby dining.",
    why_visit: "Classic Bukit beach stop with strong traveller recognition.",
    best_for: ["beach", "swim", "photos"],
    rating: nullRating(),
    price: unknownPrice(),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://lovebali.baliprov.go.id/destination/detail/242/pantai-labuan-sait",
    ],
    tags: ["beach", "padang_padang", "labuan_sait", "bukit"],
    attraction: {
      attractionType: "natural",
      suitableFor: ["beach", "families"],
    },
  },
  {
    external_key: "uluwatu-suluban-beach",
    name: "Suluban Beach (Blue Point)",
    name_ar: "شاطئ سولوبان (بلو بوينت)",
    category: "attraction",
    subcategory: "surf_beach",
    area: "Suluban / Uluwatu",
    area_note: "Cave/cliff access to the Uluwatu surf zone — experienced surfers dominate the break",
    description:
      "Cliff- and cave-access beach at the famous Uluwatu surf break (Suluban / Blue Point), with warungs and viewing platforms above.",
    why_visit: "Watch world-class surf and access the Uluwatu break area.",
    best_for: ["surf_watching", "beach", "photos"],
    rating: nullRating(),
    price: unknownPrice(),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://www.indonesia.travel/us/en/destination/bali-nusa-tenggara/bali/bali---suluban-beach",
    ],
    tags: ["surf", "suluban", "blue_point", "beach"],
    attraction: {
      attractionType: "natural",
      suitableFor: ["surfers", "viewers"],
    },
  },
  {
    external_key: "uluwatu-green-bowl-beach",
    name: "Green Bowl Beach (Pantai Batu Pageh)",
    name_ar: "شاطئ غرين بول (بانتاي باتو باجيه)",
    category: "attraction",
    subcategory: "beach",
    area: "Ungasan / Green Bowl",
    area_note:
      "Reclassified from activity → attraction. Official tourism beach destination (Pantai Green Bowl / Pantai Batu Pageh). Stair access is how visitors reach the beach — not a branded activity operator",
    description:
      "Secluded Ungasan cove also known as Pantai Batu Pageh / Green Bowl Beach, reached by a long cliff staircase. Listed as a beach destination on Bali provincial and Badung tourism pages.",
    why_visit: "Quieter Bukit beach cove reached by a cliff staircase.",
    best_for: ["beach", "photos", "surf_watching"],
    rating: nullRating(),
    price: unknownPrice(),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://lovebali.baliprov.go.id/destination/detail/1606371174760/pantai-green-bowl-%28green-bowl-beach%29",
      "https://sita.badungkab.go.id/destinasiwisata/pantai-batu-pageh",
    ],
    tags: ["green_bowl", "ungasan", "beach", "batu_pageh"],
    attraction: {
      attractionType: "natural",
      suitableFor: ["beach", "surfers", "adventurous_visitors"],
    },
  },

  // —— Activities (3 after Green Bowl reclassification) ——
  {
    external_key: "uluwatu-kecak-dance",
    name: "Kecak Dance at Uluwatu Temple",
    name_ar: "رقصة الكيتشاك في معبد أولوواتو",
    category: "activity",
    subcategory: "cultural_performance",
    area: "Pecatu / Uluwatu Temple amphitheatre",
    area_note:
      "Performance event identity supported by Bali provincial tourism materials. Ticket price, availability, and booking remain unverified — keep null/omitted",
    description:
      "Kecak (and fire) dance performed at the Uluwatu Temple cliff amphitheatre. Provincial tourism materials describe daily Kecak performances at the temple setting; this record does not assert current ticket inventory or prices.",
    why_visit: "Cultural performance paired with one of Bali’s most dramatic temple settings.",
    best_for: ["culture", "sunset", "first_time_uluwatu"],
    rating: nullRating(),
    price: unknownPrice(),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://disparda.baliprov.go.id/pura-uluwatu",
      "https://kemlu.go.id/files/publikasi/additional_file/1762932702691437de2beb3__EN__Bali___Travel_Guide_Book__2025_.pdf",
    ],
    tags: ["kecak", "culture", "sunset", "temple"],
    activity: { activityType: "tour" },
  },
  {
    external_key: "uluwatu-surf-lessons-uluwatu",
    name: "Surf Lessons Uluwatu",
    name_ar: "دروس ركوب الأمواج أولوواتو",
    category: "activity",
    subcategory: "surf_lesson",
    area: "Bingin / Labuansait / Pecatu",
    area_note:
      "Replaced generic “Bukit Peninsula Surf Lesson”. Named operator (Jack / Surf Lessons Uluwatu) based on Jl. Labuansait — break choice depends on swell and ability",
    description:
      "Named Bukit surf coaching business (Surf Lessons Uluwatu) offering private and small-group lessons around Bingin and nearby beginner-friendlier breaks, per the operator site.",
    why_visit: "Book a named local instructor instead of a generic “surf lesson” label.",
    best_for: ["surf", "beginners", "active"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://surflessonsuluwatu.com/"],
    websiteUrl: "https://surflessonsuluwatu.com/",
    tags: ["surf", "lesson", "bingin", "named_operator"],
    activity: { activityType: "water_sports" },
  },
  {
    external_key: "uluwatu-morning-light-yoga",
    name: "Morning Light Yoga",
    name_ar: "مورنينغ لايت يوغا",
    category: "activity",
    subcategory: "yoga_class",
    area: "Suluban / Uluwatu Surf Villas",
    area_note:
      "Replaced generic “Bingin Beach Day”. Named yoga studio on the Uluwatu Surf Villas campus — open-air shala; drop-in framing per brand yoga page",
    description:
      "Morning Light Yoga studio at Uluwatu Surf Villas — daily open-air yoga classes with ocean/jungle setting described on the property yoga page.",
    why_visit: "Named Bukit yoga class with a clear operator page, not a packaged public-beach day.",
    best_for: ["yoga", "wellness", "morning"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://uluwatusurfvillas.com/yoga/"],
    websiteUrl: "https://uluwatusurfvillas.com/yoga/",
    tags: ["yoga", "wellness", "uluwatu", "named_operator"],
    activity: { activityType: "wellness" },
  },

  // —— Bars / beach clubs / nightlife (4) ——
  {
    external_key: "uluwatu-single-fin",
    name: "Single Fin",
    name_ar: "سينغل فين",
    category: "beach_club",
    subcategory: "surf_beach_club",
    area: "Suluban / Uluwatu",
    area_note: "Above the Uluwatu surf zone — iconic sunset spot; expect crowds",
    description:
      "Legendary cliffside surf bar / beach club overlooking the Uluwatu break, known for daytime views and busy sunset sessions.",
    why_visit: "Classic Uluwatu sunset and surf-watching social stop.",
    best_for: ["sunset", "surf_watching", "drinks"],
    rating: nullRating(),
    price: { ...unknownPrice(), tier: "mid_range", basis: "tier_only" },
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.singlefinbali.com/"],
    websiteUrl: "https://www.singlefinbali.com/",
    tags: ["beach_club", "sunset", "surf", "suluban"],
    dining: {
      cuisineTypes: ["bar_food", "drinks"],
      mealTypes: ["lunch", "dinner", "drinks"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "uluwatu-sundays-beach-club",
    name: "Sundays Beach Club",
    name_ar: "صنديز بيتش كلوب",
    category: "beach_club",
    subcategory: "private_beach_club",
    area: "Ungasan / southern Bukit",
    area_note:
      "Private beach club affiliated with The Ungasan — day passes / VIP experiences per brand site; book ahead on busy days",
    description:
      "Private beach club on the southern Bukit (Ungasan) known for a full day-beach experience rather than a quick drink stop.",
    why_visit: "Spend a full day on a managed private beach with food and facilities.",
    best_for: ["beach_day", "groups", "relaxed"],
    rating: nullRating(),
    price: { ...unknownPrice(), tier: "upscale", basis: "tier_only" },
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.sundaysbeachclub.com/"],
    websiteUrl: "https://www.sundaysbeachclub.com/",
    tags: ["beach_club", "ungasan", "day_pass"],
    dining: {
      cuisineTypes: ["beach_club"],
      mealTypes: ["lunch", "drinks"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "uluwatu-ulu-cliffhouse",
    name: "Ulu Cliffhouse",
    name_ar: "ولو كليف هاوس",
    category: "beach_club",
    subcategory: "cliff_beach_club",
    area: "Labuansait / Uluwatu cliffs",
    area_note:
      "Adults-only cliffside pool club with dining and suites — verify dress code / minimum spend before arrival",
    description:
      "Cliffside pool club and dining destination on the Uluwatu coast (Labuansait), with daybed reservations and restaurants per the brand site.",
    why_visit: "Cliff views with a full beach-club day program.",
    best_for: ["beach_club", "views", "groups"],
    rating: nullRating(),
    price: { ...unknownPrice(), tier: "upscale", basis: "tier_only" },
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.ulucliffhouse.com/"],
    websiteUrl: "https://www.ulucliffhouse.com/",
    tags: ["beach_club", "cliffs", "uluwatu"],
    dining: {
      cuisineTypes: ["beach_club"],
      mealTypes: ["lunch", "drinks"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "uluwatu-el-kabron",
    name: "El Kabron Beach Club",
    name_ar: "إل كابرون بيتش كلوب",
    category: "nightlife",
    subcategory: "cliff_club_nightlife",
    area: "Pecatu / Bingin cliffs",
    area_note:
      "Jl. Pantai Cemongkak, Pecatu — Spanish-themed cliff club; evenings can run later than daytime beach clubs",
    description:
      "Cliffside luxury beach club / nightlife venue in Pecatu, known for sunset parties and later evening energy per the brand site.",
    why_visit: "Later Bukit night option with cliff views.",
    best_for: ["nightlife", "sunset", "drinks"],
    rating: nullRating(),
    price: { ...unknownPrice(), tier: "upscale", basis: "tier_only" },
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.elkabron.com/"],
    websiteUrl: "https://www.elkabron.com/",
    tags: ["nightlife", "beach_club", "pecatu"],
    nightlife: {
      venueType: "bar_nightlife",
      musicGenres: ["dj", "sunset"],
    },
  },

  // —— Accommodation (10) ——
  {
    external_key: "uluwatu-radisson-blu",
    name: "Radisson Blu Resort & Villas Bali Uluwatu",
    name_ar: "رادسون بلو ريزورت وفيلات بالي أولوواتو",
    category: "accommodation",
    subcategory: "resort",
    area: "Pecatu",
    area_note: "Pecatu resort campus — brand listing places it near Padang Padang / Bingin by road",
    description:
      "Radisson Blu branded resort and villas in the Pecatu / Uluwatu area. Marketplace listings commonly describe ocean-area resort facilities; Helm has not verified rates or amenity claims.",
    why_visit: "Full-service resort base for exploring the Bukit.",
    best_for: ["resort", "families", "luxury_mid"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://www.radissonhotels.com/en-us/hotels/radisson-blu-bali-uluwatu",
    ],
    websiteUrl:
      "https://www.radissonhotels.com/en-us/hotels/radisson-blu-bali-uluwatu",
    tags: ["resort", "pecatu", "radisson"],
    accommodation_editorial: {
      property_type: "resort",
      verified_star_classification: null,
      marketplace_star_claim: null,
      guest_rating: null,
      price_per_night: null,
      currency: "IDR",
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
      official_website:
        "https://www.radissonhotels.com/en-us/hotels/radisson-blu-bali-uluwatu",
      booking_url: null,
    },
    accommodation: { accommodationType: "resort" },
  },
  {
    external_key: "uluwatu-nisi-villas",
    name: "Nisí Villas",
    name_ar: "نيسي فيلات",
    category: "accommodation",
    subcategory: "villa",
    area: "Bingin / Pecatu",
    area_note:
      "Renamed from “Nisí Villas & Suites”. Brand villas pages present private-pool villas as the operating product; Nisí Suites still advertised as arriving Q3 2026 with early-access signup — suites inventory not treated as open",
    description:
      "Boutique private-pool villa stay in Bingin (Nisí Villas). Record covers villa inventory only. Do not invent unit-level amenities, rates, or suite inventory.",
    why_visit: "Villa-style stay alternative to large resorts in Bingin.",
    best_for: ["villas", "couples", "privacy"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://nisivillas.com/", "https://nisivillas.com/villas"],
    websiteUrl: "https://nisivillas.com/",
    tags: ["villa", "bingin"],
    accommodation_editorial: {
      property_type: "villa",
      verified_star_classification: null,
      marketplace_star_claim: null,
      guest_rating: null,
      price_per_night: null,
      currency: "IDR",
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
      official_website: "https://nisivillas.com/",
      booking_url: null,
    },
    accommodation: { accommodationType: "villa" },
  },
  {
    external_key: "uluwatu-grun",
    name: "Grün Uluwatu",
    name_ar: "غرون أولوواتو",
    category: "accommodation",
    subcategory: "eco_resort",
    area: "Pecatu",
    area_note:
      "Jl. Pura Kulat, Pecatu — Grün Resorts treehouse / ocean-view villas; marketplace star claims are not Helm-verified",
    description:
      "Eco resort in Pecatu (Grün Resorts) with treehouse and ocean-view villa products. Amenity and star claims from OTAs remain unverified for Helm.",
    why_visit: "Nature-forward resort base closer to Bingin / Uluwatu temple road network.",
    best_for: ["eco", "couples", "design"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://grunresorts.com/grun-uluwatu/"],
    websiteUrl: "https://grunresorts.com/grun-uluwatu/",
    tags: ["resort", "eco", "pecatu", "grun"],
    accommodation_editorial: {
      property_type: "resort",
      verified_star_classification: null,
      marketplace_star_claim: null,
      guest_rating: null,
      price_per_night: null,
      currency: "IDR",
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
      official_website: "https://grunresorts.com/grun-uluwatu/",
      booking_url: null,
    },
    accommodation: { accommodationType: "resort" },
  },
  {
    external_key: "uluwatu-alila-villas",
    name: "Alila Villas Uluwatu",
    name_ar: "أليلا فيلات أولوواتو",
    category: "accommodation",
    subcategory: "luxury_villa_resort",
    area: "Pecatu",
    area_note: "Cliff-top villa resort — official brand site positions it as a luxury villa resort",
    description:
      "Luxury cliff-top villa resort by Alila in Pecatu. Official brand materials describe private villa stays; Helm has not verified rates, occupancy, or unit-level pool claims.",
    why_visit: "Flagship luxury villa resort stay on the southern Bukit cliffs.",
    best_for: ["luxury", "honeymoon", "villas"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.alilahotels.com/uluwatu"],
    tags: ["luxury", "villa", "resort", "pecatu", "alila"],
    accommodation_editorial: {
      property_type: "villa",
      verified_star_classification: null,
      marketplace_star_claim: null,
      guest_rating: null,
      price_per_night: null,
      currency: "IDR",
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
      official_website: "https://www.alilahotels.com/uluwatu",
      booking_url: null,
    },
    accommodation: { accommodationType: "villa" },
    websiteUrl: "https://www.alilahotels.com/uluwatu",
  },
  {
    external_key: "uluwatu-surf-villas",
    name: "Uluwatu Surf Villas",
    name_ar: "فيلات سيرف أولوواتو",
    category: "accommodation",
    subcategory: "villa",
    area: "Suluban / Pecatu",
    area_note:
      "Jl. Pantai Suluban cliff-front villas per brand site — related to Mana restaurant and Morning Light Yoga on the same campus",
    description:
      "Cliff-front villa property above the Uluwatu / Suluban surf zone. Brand site describes villa stays with saltwater pools; Helm has not verified rates or unit-level amenities.",
    why_visit: "Villa base aimed at surf-trip travellers.",
    best_for: ["surf", "villas", "groups"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://uluwatusurfvillas.com/"],
    websiteUrl: "https://uluwatusurfvillas.com/",
    tags: ["villa", "surf", "suluban"],
    accommodation_editorial: {
      property_type: "villa",
      verified_star_classification: null,
      marketplace_star_claim: null,
      guest_rating: null,
      price_per_night: null,
      currency: "IDR",
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
      official_website: "https://uluwatusurfvillas.com/",
      booking_url: null,
    },
    accommodation: { accommodationType: "villa" },
  },
  {
    external_key: "uluwatu-melali-bingin",
    name: "Melali Bingin",
    name_ar: "ميلالي بينغين",
    category: "accommodation",
    subcategory: "boutique_hotel",
    area: "Bingin / Pecatu",
    area_note:
      "Jl. Buana Sari, Gg Pirta Bingin — brand presents boutique rooms (pool villa + sunset suites). Brand notes neighbouring construction noise in 2026 and temporary breakfast unavailability",
    description:
      "Small boutique stay in Bingin (Melali). Brand site describes a pool villa and sunset suites; amenities and rates remain unverified for Helm. Construction-period caveats appear on the brand homepage.",
    why_visit: "Stay close to Bingin’s cliff-beach scene without a mega-resort footprint.",
    best_for: ["bingin", "surf", "boutique"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://melalibingin.com/"],
    websiteUrl: "https://melalibingin.com/",
    tags: ["bingin", "boutique_hotel", "pecatu"],
    accommodation_editorial: {
      property_type: "boutique_hotel",
      verified_star_classification: null,
      marketplace_star_claim: null,
      guest_rating: null,
      price_per_night: null,
      currency: "IDR",
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
      official_website: "https://melalibingin.com/",
      booking_url: null,
    },
    accommodation: { accommodationType: "boutique_hotel" },
  },
  {
    external_key: "uluwatu-terra-cottages",
    name: "Terra Cottages Bali",
    name_ar: "تيرا كوتاجز بالي",
    category: "accommodation",
    subcategory: "boutique_hotel",
    area: "Bingin / Pecatu",
    area_note:
      "Jl. Pantai Bingin boutique hotel — brand notes Bingin beachfront construction context; beach still described as open",
    description:
      "Terracotta / boutique cottage hotel near Bingin Beach. Brand site confirms boutique hotel positioning; do not invent cottage counts, rates, or pool types.",
    why_visit: "Boutique cottage stay close to Bingin’s cliff-beach access.",
    best_for: ["cottages", "bingin", "mid_range"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.terracottagesbali.com/"],
    websiteUrl: "https://www.terracottagesbali.com/",
    tags: ["cottages", "boutique_hotel", "bingin"],
    accommodation_editorial: {
      property_type: "boutique_hotel",
      verified_star_classification: null,
      marketplace_star_claim: null,
      guest_rating: null,
      price_per_night: null,
      currency: "IDR",
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
      official_website: "https://www.terracottagesbali.com/",
      booking_url: null,
    },
    accommodation: { accommodationType: "boutique_hotel" },
  },
  {
    external_key: "uluwatu-origin",
    name: "Origin Uluwatu",
    name_ar: "أوريجين أولوواتو",
    category: "accommodation",
    subcategory: "tented_villa",
    area: "Pecatu / Uluwatu",
    area_note:
      "Jl. Ancak Sari, Pecatu — tented villa / glamping product; unit-level private-pool claims need verification",
    description:
      "Tented-villa stay (Origin Collection) in Pecatu marketed as open-air villas near Bukit beaches. Star rating, rates, and amenity matrix remain unverified for Helm.",
    why_visit: "Nature-forward villa alternative to large cliff resorts.",
    best_for: ["villas", "design", "couples"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.originuluwatu.com/"],
    websiteUrl: "https://www.originuluwatu.com/",
    tags: ["villa", "glamping", "uluwatu", "origin"],
    accommodation_editorial: {
      property_type: "villa",
      verified_star_classification: null,
      marketplace_star_claim: null,
      guest_rating: null,
      price_per_night: null,
      currency: "IDR",
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
      official_website: "https://www.originuluwatu.com/",
      booking_url: null,
    },
    accommodation: { accommodationType: "villa" },
  },
  {
    external_key: "uluwatu-seascape-resort",
    name: "Seascape Resort & Spa Uluwatu by Ini Vie Hospitality",
    name_ar: "سيسكيب ريزورت وسبا أولوواتو",
    category: "accommodation",
    subcategory: "resort",
    area: "Labuan Sait / Pecatu",
    area_note: "Ini Vie Hospitality cliffside resort — Svaha Spa Bingin cited on brand materials",
    description:
      "Resort and spa stay under Ini Vie Hospitality branding in the Labuan Sait / Uluwatu area. Rates, spa inclusion, and beach access remain unverified.",
    why_visit: "Resort + spa base for a multi-night Bukit trip.",
    best_for: ["resort", "spa", "couples"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://inivie.com/seascapeuluwatu"],
    websiteUrl: "https://inivie.com/seascapeuluwatu",
    tags: ["resort", "spa", "uluwatu"],
    accommodation_editorial: {
      property_type: "resort",
      verified_star_classification: null,
      marketplace_star_claim: null,
      guest_rating: null,
      price_per_night: null,
      currency: "IDR",
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
      official_website: "https://inivie.com/seascapeuluwatu",
      booking_url: null,
    },
    accommodation: { accommodationType: "resort" },
  },
  {
    external_key: "uluwatu-nema",
    name: "Nema. Uluwatu",
    name_ar: "نيما أولوواتو",
    category: "accommodation",
    subcategory: "boutique_hotel",
    area: "Pecatu / Uluwatu",
    area_note: "Boutique hotel near Thomas Beach area per brand site — inventory still needs Helm verification",
    description:
      "Boutique hotel stay in Pecatu / Uluwatu (nemauluwatu.com). Do not invent star class, private-pool claims, or nightly rates.",
    why_visit: "Design-led boutique hotel option on the Bukit.",
    best_for: ["boutique", "design", "couples"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://nemauluwatu.com/"],
    websiteUrl: "https://nemauluwatu.com/",
    tags: ["boutique_hotel", "uluwatu", "nema"],
    accommodation_editorial: {
      property_type: "boutique_hotel",
      verified_star_classification: null,
      marketplace_star_claim: null,
      guest_rating: null,
      price_per_night: null,
      currency: "IDR",
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
      official_website: "https://nemauluwatu.com/",
      booking_url: null,
    },
    accommodation: { accommodationType: "boutique_hotel" },
  },
];

function toEditorialRecord(p) {
  const record = {
    external_key: p.external_key,
    name: p.name,
    name_ar: p.name_ar,
    country_code: "ID",
    destination_slug: "uluwatu",
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
  if (p.accommodation_editorial) {
    record.accommodation = p.accommodation_editorial;
  }
  return record;
}

function importExternalKey(editorialKey) {
  const local = editorialKey.startsWith("uluwatu-")
    ? editorialKey.slice("uluwatu-".length)
    : editorialKey;
  return `id:uluwatu:${local}`;
}

function isTourismListingUrl(url) {
  return /lovebali\.baliprov|indonesia\.travel|sisparnas\.kemenpar|sita\.badungkab|disparda\.baliprov|kemlu\.go\.id/.test(
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
            "Destination listing captured for identity provenance only. Fees, hours, and conditions not treated as Helm-verified inventory.",
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
      name: "Helm curated Uluwatu dataset v1 research lead",
      notes:
        "Curated research lead for staging. Ratings, prices, amenities, and coordinates intentionally null until verified. Not Helm-verified.",
      collectedAt: COMPILED_AT,
    },
  ];
}

function toImportPlace(p) {
  const level = priceTierToLevel(p.price?.tier);
  /** @type {Record<string, unknown>} */
  const place = {
    externalKey: importExternalKey(p.external_key),
    destinationSlug: "uluwatu",
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

  // Only attach rating when both value and provider exist (never invent).
  if (
    p.rating &&
    typeof p.rating.value === "number" &&
    p.rating.provider &&
    typeof p.rating.review_count === "number"
  ) {
    place.rating = {
      value: p.rating.value,
      scale: p.rating.scale ?? 5,
      reviewCount: p.rating.review_count,
      platform: p.rating.provider,
      observedAt: COMPILED_AT,
    };
  }

  if (level != null) place.priceLevel = level;
  if (p.websiteUrl) place.websiteUrl = p.websiteUrl;

  if (p.dining) place.dining = p.dining;
  if (p.attraction) place.attraction = p.attraction;
  if (p.activity) place.activity = p.activity;
  if (p.nightlife) place.nightlife = p.nightlife;
  // Accommodation import: type only — no invented starRating/amenities.
  if (p.accommodation) {
    place.accommodation = {
      accommodationType: p.accommodation.accommodationType,
    };
  }

  return place;
}

if (PLACES.length !== 30) {
  throw new Error(`Expected 30 places, got ${PLACES.length}`);
}

const editorial = {
  dataset: DATASET_VERSION,
  format: "helm.catalog.editorial.v1",
  compiled_at: COMPILED_AT,
  locale_primary: "en",
  locale_secondary: "ar",
  research_status:
    "Research leads for staging. Not a verified inventory. Replace unsuitable/closed/unverifiable leads before publish.",
  country: {
    name: "Indonesia",
    iso2: "ID",
    currency: "IDR",
    note:
      "Apply-time prerequisite: geo.countries must include ID and pricing.currencies must include IDR (not present in default seed.sql as of this dataset).",
  },
  destination: {
    name: "Uluwatu",
    name_ar: "أولوواتو",
    slug: "uluwatu",
    external_key: "id:uluwatu",
    type: "destination_area",
    type_note:
      "Editorial type only — catalog.destinations has no destination_type column.",
    region: "Bukit Peninsula, South Bali",
    parent: "Indonesia",
    parent_note: "Editorial parent label. Import format does not set parent_id.",
    country_code: "ID",
    recommended_duration: "3–5 days",
    sub_areas: [
      "Pecatu",
      "Bingin",
      "Padang Padang",
      "Suluban",
      "Ungasan",
      "Melasti",
      "Uluwatu cliffs",
    ],
    tags: [
      "surf",
      "beach",
      "cliffs",
      "beach_clubs",
      "temple",
      "sunset",
      "villas",
      "bukit",
    ],
    data_status: "curated_needs_verification",
    publication_status: "draft",
    unpublished: true,
    summary_en:
      "Bukit Peninsula cliffs, surf beaches, beach clubs, and Pura Luhur Uluwatu — spanning Pecatu, Bingin, Padang Padang, Suluban, Ungasan and nearby localities. Not all listings are walking distance from each other.",
    summary_ar:
      "منحدرات شبه جزيرة بوكيت وشواطئ الأمواج ونوادي الشاطئ ومعبد بورا لوهور أولوواتو — عبر بيكاتو وبينغين وبادانغ بادانغ وسولوبان وأونغاسان والمناطق المجاورة.",
  },
  category_distribution: {
    restaurant: 6,
    cafe: 3,
    attraction: 4,
    activity: 3,
    bar_beach_club_nightlife: 4,
    accommodation: 10,
    note:
      "Distribution follows verified entity classifications after final approval audit (Ours→restaurant; Green Bowl→attraction). Not forced to earlier 5/4/3/4 quotas.",
  },
  integrity: {
    do_not_invent: [
      "exact_coordinates",
      "opening_hours",
      "booking_urls",
      "confirmed_supplier_prices",
      "marketplace_prices_as_helm_rates",
      "google_maps_place_ids",
      "provider_ids",
      "visit_duration_minutes",
      "booking_recommended",
      "typicalDurationMinutes",
      "bookingRequired",
      "star_ratings_as_verified",
      "amenities",
      "private_pool_vs_shared_pool",
      "guest_ratings_without_provider",
    ],
    ratings: "null_until_provider_and_value_verified",
    accommodation_import:
      "Only accommodationType mapped; starRating and amenities omitted until verified",
    lifecycle: "all_records_draft_curated_needs_verification",
  },
  places: PLACES.map(toEditorialRecord),
  mapping: {
    import_file: "uluwatu-curated-v1.json",
    import_format: "helm.catalog.import.v1",
    external_key_rule:
      "editorial.external_key (uluwatu-…) → import.externalKey id:uluwatu:<suffix>; import.slug keeps editorial key",
    accommodation_fields:
      "Rich accommodation_* editorial block stays in source JSON; import only sends category accommodation + accommodation.accommodationType",
  },
};

const importPayload = {
  formatVersion: "helm.catalog.import.v1",
  sourceLabel: DATASET_VERSION,
  destinations: [
    {
      externalKey: "id:uluwatu",
      slug: "uluwatu",
      nameEn: "Uluwatu",
      nameAr: "أولوواتو",
      countryCode: "ID",
      summaryEn: editorial.destination.summary_en,
      summaryAr: editorial.destination.summary_ar,
      shortDescriptionEn:
        "Bukit Peninsula cliffs, surf, beach clubs, and Pura Luhur Uluwatu. Recommended stay 3–5 days. Draft curated destination.",
      tags: editorial.destination.tags,
      updateIfExists: false,
      sources: [
        {
          sourceType: "manual_research",
          name: "Helm curated Uluwatu destination notes",
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
writeFileSync(
  join(OUT_DIR, "uluwatu-curated-v1.source.json"),
  `${JSON.stringify(editorial, null, 2)}\n`,
);
writeFileSync(
  join(OUT_DIR, "uluwatu-curated-v1.json"),
  `${JSON.stringify(importPayload, null, 2)}\n`,
);
console.log(`Wrote ${join(OUT_DIR, "uluwatu-curated-v1.source.json")}`);
console.log(`Wrote ${join(OUT_DIR, "uluwatu-curated-v1.json")}`);
console.log(`Places: ${importPayload.places.length}`);

#!/usr/bin/env node
/**
 * Builds Seminyak curated dataset v1 (30 places):
 * - data/imports/indonesia/seminyak/seminyak-curated-v1.source.json
 * - data/imports/indonesia/seminyak/seminyak-curated-v1.json (helm.catalog.import.v1)
 *
 * Research leads ≠ verified facts. Unknown ratings/prices/coords/amenities stay null/omitted.
 * Seminyak, Legian, and Kuta are not interchangeable; Petitenget / Kayu Aya / Double Six labeled carefully.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "data/imports/indonesia/seminyak");
const COMPILED_AT = "2026-11-19";
const DATASET_VERSION = "seminyak-curated-v1";

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

/** @param {string} officialWebsite @param {string} propertyType */
function accommodationEditorial(officialWebsite, propertyType) {
  return {
    property_type: propertyType,
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
    official_website: officialWebsite,
    booking_url: null,
  };
}

/** Exactly 30 research-lead places. */
const PLACES = [
  // —— Restaurants (5) ——
  {
    external_key: "seminyak-la-lucciola",
    name: "La Lucciola",
    name_ar: "لا لوتشيولا",
    category: "restaurant",
    subcategory: "italian_mediterranean",
    area: "Petitenget",
    area_note:
      "Pantai Petitenget / Jl. Kayu Aya foreshore — beside Pura Petitenget (not Legian or Kuta Beach)",
    description:
      "Long-running beachfront Italian and Mediterranean restaurant on Petitenget Beach known for ocean views and all-day dining. Official brand presents it as a Seminyak Petitenget institution; Helm has not verified rates or hours.",
    why_visit: "Beachfront Italian dining on Petitenget.",
    best_for: ["dinner", "italian", "sunset"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://lalucciolabali.com/", "https://lalucciolabali.com/booking/"],
    websiteUrl: "https://lalucciolabali.com/",
    tags: ["italian", "petitenget", "beachfront"],
    dining: {
      cuisineTypes: ["italian", "mediterranean"],
      mealTypes: ["breakfast", "lunch", "dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "seminyak-mama-san",
    name: "Mama San",
    name_ar: "ماما سان",
    category: "restaurant",
    subcategory: "southeast_asian",
    area: "Kerobokan / Seminyak",
    area_note:
      "Jl. Raya Kerobokan No.135, Kerobokan Kelod — Seminyak dining strip edge (not Canggu Berawa)",
    description:
      "Modern Southeast Asian restaurant and bar in Seminyak/Kerobokan with dim sum, curries, grilled proteins, and a late lounge. Official site places it on Jalan Raya Kerobokan as a long-running Seminyak dining destination.",
    why_visit: "Bold Southeast Asian sharing plates in Seminyak.",
    best_for: ["dinner", "southeast_asian", "cocktails"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://mamasanbali.com/"],
    websiteUrl: "https://mamasanbali.com/",
    tags: ["southeast_asian", "kerobokan", "dinner"],
    dining: {
      cuisineTypes: ["southeast_asian", "indonesian_inspired"],
      mealTypes: ["lunch", "dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "seminyak-barbacoa",
    name: "Barbacoa",
    name_ar: "بارباكووا",
    category: "restaurant",
    subcategory: "latin_american_grill",
    area: "Seminyak",
    area_note: "Central Seminyak — open-flame Latin American asado and grill house (opened 2013 per brand)",
    description:
      "Fire-driven Latin American restaurant in Seminyak focused on asado pits, charcoal grill, and wood-fired cooking, with steaks, whole-pig roasts, and seafood. Brand describes a warehouse-style dining room; Helm has not verified prices.",
    why_visit: "Open-flame Latin American grilling in Seminyak.",
    best_for: ["dinner", "grill", "steak"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://barbacoa-bali.com/"],
    websiteUrl: "https://barbacoa-bali.com/",
    tags: ["latin_american", "grill", "seminyak"],
    dining: {
      cuisineTypes: ["latin_american", "grill"],
      mealTypes: ["dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "seminyak-ultimo",
    name: "Ultimo",
    name_ar: "أولتيمو",
    category: "restaurant",
    subcategory: "italian",
    area: "Kayu Aya / Oberoi",
    area_note: "Jl. Kayu Aya No.78 (Oberoi / Eat Street strip) — Seminyak, not Legian Beach Road",
    description:
      "Italian restaurant on Seminyak’s Kayu Aya (Oberoi) strip serving fuss-free authentic Italian plates in a contemporary dining room with live music. Official site lists the Seminyak Kayu Aya address.",
    why_visit: "Relaxed Italian dinner on Kayu Aya.",
    best_for: ["dinner", "italian", "kayu_aya"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://ultimorestaurant.com/"],
    websiteUrl: "https://ultimorestaurant.com/",
    tags: ["italian", "kayu_aya", "dinner"],
    dining: {
      cuisineTypes: ["italian"],
      mealTypes: ["dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "seminyak-motel-mexicola",
    name: "Motel Mexicola Seminyak",
    name_ar: "موتيل مكسيكولا سيمنياق",
    category: "restaurant",
    subcategory: "mexican",
    area: "Seminyak",
    area_note:
      "Jl. Kayu Jati No.9X, Seminyak — original Mexicola Seminyak outpost (distinct from Motel Mexicola Canggu/Uluwatu brands)",
    description:
      "Vibrant Mexican restaurant and bar in Seminyak with hand-pressed tortillas, taqueria plates, and a large festive courtyard. Official Seminyak page distinguishes this original outpost from later Canggu and Uluwatu locations.",
    why_visit: "High-energy Mexican dining in Seminyak.",
    best_for: ["dinner", "mexican", "groups"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://motelmexicola.info/seminyak/"],
    websiteUrl: "https://motelmexicola.info/seminyak/",
    tags: ["mexican", "seminyak", "dinner"],
    dining: {
      cuisineTypes: ["mexican"],
      mealTypes: ["lunch", "dinner"],
      dietaryOptions: [],
    },
  },

  // —— Cafes (4) ——
  {
    external_key: "seminyak-sisterfields",
    name: "Sisterfields",
    name_ar: "سيستر فيلدز",
    category: "cafe",
    subcategory: "brunch_specialty_coffee",
    area: "Seminyak / Kerobokan Kelod",
    area_note: "Jl. Kayu Cendana No.7 — Australian-style brunch café in central Seminyak",
    description:
      "Popular all-day café bringing Australian brunch culture to Seminyak with specialty coffee, brunch plates, and evening cocktails. Official site lists walk-in breakfast/lunch service on Kayu Cendana.",
    why_visit: "Go-to Seminyak brunch and coffee stop.",
    best_for: ["brunch", "coffee", "breakfast"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://sisterfieldsbali.com/"],
    websiteUrl: "https://sisterfieldsbali.com/",
    tags: ["brunch", "coffee", "seminyak"],
    dining: {
      cuisineTypes: ["cafe", "brunch", "australian_inspired"],
      mealTypes: ["breakfast", "lunch", "dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "seminyak-revolver",
    name: "Revolver Seminyak",
    name_ar: "ريفولفر سيمنياق",
    category: "cafe",
    subcategory: "specialty_coffee",
    area: "Kayu Aya / Oberoi",
    area_note: "Jl. Kayu Aya No.51 — boutique café-bar on the Oberoi strip (Seminyak location page)",
    description:
      "Specialty coffee café and casual bar on Kayu Aya serving comfort food, coffee, and cocktails. Official Revolver Bali Seminyak page identifies this Kayu Aya site.",
    why_visit: "Specialty coffee and casual plates on Kayu Aya.",
    best_for: ["coffee", "brunch", "kayu_aya"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://revolverbali.com/pages/seminyak", "https://revolverbali.com/"],
    websiteUrl: "https://revolverbali.com/pages/seminyak",
    tags: ["coffee", "kayu_aya", "cafe"],
    dining: {
      cuisineTypes: ["cafe", "coffee"],
      mealTypes: ["breakfast", "lunch", "dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "seminyak-kynd",
    name: "KYND Seminyak",
    name_ar: "كايند سيمنياق",
    category: "cafe",
    subcategory: "plant_forward_cafe",
    area: "Seminyak",
    area_note:
      "Original KYND Café Seminyak (est. 2017 per brand) — distinct from KYND Canggu and KYND Uluwatu",
    description:
      "Plant-forward café and community brand flagship in Seminyak with indoor/outdoor seating and retail. Official KYND Community site lists Seminyak as the original and largest Bali café location.",
    why_visit: "Bright plant-forward café in Seminyak.",
    best_for: ["brunch", "plant_based", "coffee"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://www.kyndcommunity.com/",
      "https://www.kyndcommunity.com/pages/kyndcafe",
    ],
    websiteUrl: "https://www.kyndcommunity.com/",
    tags: ["plant_forward", "seminyak", "brunch"],
    dining: {
      cuisineTypes: ["cafe", "plant_forward"],
      mealTypes: ["breakfast", "lunch", "dinner"],
      dietaryOptions: ["vegetarian_friendly"],
    },
  },
  {
    external_key: "seminyak-corner-house",
    name: "Corner House Bali",
    name_ar: "كورنر هاوس بالي",
    category: "cafe",
    subcategory: "all_day_casual",
    area: "Kayu Aya / Eat Street",
    area_note: "Jl. Kayu Aya No.10 — top of Eat Street / Oberoi strip, Seminyak",
    description:
      "All-day casual café and dining room on Seminyak’s Kayu Aya Eat Street with breakfast through late plates and cocktails. Official site places the venue at Jl. Kayu Aya No.10.",
    why_visit: "All-day casual dining on Eat Street.",
    best_for: ["brunch", "casual", "kayu_aya"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://cornerhousebali.com/"],
    websiteUrl: "https://cornerhousebali.com/",
    tags: ["cafe", "eat_street", "kayu_aya"],
    dining: {
      cuisineTypes: ["cafe", "international"],
      mealTypes: ["breakfast", "lunch", "dinner"],
      dietaryOptions: [],
    },
  },

  // —— Attractions (3) ——
  {
    external_key: "seminyak-pura-petitenget",
    name: "Pura Petitenget",
    name_ar: "بورا بيتيتينغيت",
    category: "attraction",
    subcategory: "hindu_temple_cultural_site",
    area: "Petitenget",
    area_note:
      "Beach-end temple at Petitenget / Kerobokan Kelod — working sea temple; not Tanah Lot and not Uluwatu",
    description:
      "Compact coastal Hindu temple at the north end of the Seminyak–Petitenget beach strip, traditionally linked to Dang Hyang Nirartha. Visitors should follow temple dress and attendant guidance. Distinct from Uluwatu and Tanah Lot.",
    why_visit: "A working sea temple at Petitenget Beach.",
    best_for: ["culture", "temple", "petitenget"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://www.indonesia.travel/id/en/destination/bali-nusa-tenggara/bali/seminyak-the-truly-best-experiences-on-the-enchanting-island-of-bali",
      "https://lovebali.baliprov.go.id/destination/detail/254/pantai-peti-tenget",
    ],
    websiteUrl:
      "https://www.indonesia.travel/id/en/destination/bali-nusa-tenggara/bali/seminyak-the-truly-best-experiences-on-the-enchanting-island-of-bali",
    tags: ["temple", "petitenget", "culture"],
    attraction: { attractionType: "cultural" },
  },
  {
    external_key: "seminyak-petitenget-beach",
    name: "Petitenget Beach",
    name_ar: "شاطئ بيتيتينغيت",
    category: "attraction",
    subcategory: "beach_natural",
    area: "Petitenget",
    area_note:
      "Northern Seminyak coastal sand (Desa Kerobokan / Kuta Utara) — quieter than central Seminyak access lanes; not Kuta Beach",
    description:
      "West-facing beach at Petitenget known for sunset views and proximity to beach clubs and Pura Petitenget. Official Love Bali listing describes wide sloping sand and larger waves. Treat as a named beach locality, not a ticketed attraction.",
    why_visit: "Sunset beach stretch at Seminyak’s northern end.",
    best_for: ["sunset", "beach", "petitenget"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://lovebali.baliprov.go.id/destination/detail/254/pantai-peti-tenget",
      "https://www.indonesia.travel/id/en/destination/bali-nusa-tenggara/bali/seminyak-the-truly-best-experiences-on-the-enchanting-island-of-bali",
    ],
    websiteUrl: "https://lovebali.baliprov.go.id/destination/detail/254/pantai-peti-tenget",
    tags: ["beach", "petitenget", "sunset"],
    attraction: { attractionType: "natural" },
  },
  {
    external_key: "seminyak-seminyak-beach",
    name: "Seminyak Beach",
    name_ar: "شاطئ سيمنياق",
    category: "attraction",
    subcategory: "beach_natural",
    area: "Seminyak",
    area_note:
      "Central Seminyak beach access (e.g. near Jl. Dhyana Pura / Camplung Tanduk) — continuous sand south toward Legian/Kuta but not the same destination as Kuta Beach village",
    description:
      "Seminyak’s main beach strip for surfing and sunsets, quieter by day than Kuta yet part of the same continuous southwest coast sand. Official Indonesia Travel notes Seminyak Beach as favored for surfable waves and ocean panoramas. Not interchangeable with Legian or Kuta village centers.",
    why_visit: "Core Seminyak beach for surf and sunset.",
    best_for: ["beach", "surf", "sunset"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://www.indonesia.travel/id/en/destination/bali-nusa-tenggara/bali/seminyak-the-truly-best-experiences-on-the-enchanting-island-of-bali",
    ],
    websiteUrl:
      "https://www.indonesia.travel/id/en/destination/bali-nusa-tenggara/bali/seminyak-the-truly-best-experiences-on-the-enchanting-island-of-bali",
    tags: ["beach", "seminyak", "surf"],
    attraction: { attractionType: "natural" },
  },

  // —— Activities (4) ——
  {
    external_key: "seminyak-da-waves-surf",
    name: "Da Waves Surf School",
    name_ar: "مدرسة دا ويفز لركوب الأمواج",
    category: "activity",
    subcategory: "surf_lesson",
    area: "Double Six / southern Seminyak",
    area_note:
      "Jl. Double Six, Seminyak — southern Seminyak edge toward Legian; not Kuta Beach school strip",
    description:
      "Surf school offering beginner and intermediate lessons, guiding, and board rental from Jalan Double Six in Seminyak. Official site lists the Double Six Seminyak base; lesson prices on the site are not treated as Helm supplier quotes.",
    why_visit: "Bookable surf lessons on Seminyak’s southern beach edge.",
    best_for: ["surf", "lessons", "beginners"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://dawavessurf.com/surf-lesson/", "https://dawavessurf.com/contact-us/"],
    websiteUrl: "https://dawavessurf.com/surf-lesson/",
    tags: ["surf", "double_six", "lessons"],
    activity: { activityType: "water_sports" },
  },
  {
    external_key: "seminyak-jiwa-yoga",
    name: "Jiwa Bali Yoga",
    name_ar: "يوغا جيوا بالي",
    category: "activity",
    subcategory: "yoga_studio",
    area: "Petitenget",
    area_note: "Jl. Petitenget (studio contact lists No.78 / North Seminyak Petitenget hub)",
    description:
      "Yoga studio in North Seminyak / Petitenget offering heated Bikram and Sumits classes plus yin, pilates, and flow. Official site places the studio on Jalan Petitenget near Seminyak shopping and beach clubs.",
    why_visit: "Heated yoga classes in Petitenget.",
    best_for: ["yoga", "wellness", "petitenget"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://jiwabali.com/", "https://jiwabali.com/the-yoga", "https://jiwabali.com/contact-us"],
    websiteUrl: "https://jiwabali.com/",
    tags: ["yoga", "petitenget", "wellness"],
    activity: { activityType: "wellness" },
  },
  {
    external_key: "seminyak-bodyworks-spa",
    name: "Bodyworks Spa",
    name_ar: "بودي ووركس سبا",
    category: "activity",
    subcategory: "spa_wellness",
    area: "Petitenget",
    area_note: "Jl. Lebak Sari No.3, Petitenget — day spa (founded 1994 per brand)",
    description:
      "Family-owned day spa in Petitenget offering massages, facials, and wellness treatments. Official About page places the spa on Jalan Lebak Sari in Petitenget, Seminyak.",
    why_visit: "Established day-spa treatments in Petitenget.",
    best_for: ["spa", "wellness", "petitenget"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.bodyworksbali.com/about", "https://www.bodyworksbali.com/"],
    websiteUrl: "https://www.bodyworksbali.com/",
    tags: ["spa", "petitenget", "wellness"],
    activity: { activityType: "wellness" },
  },
  {
    external_key: "seminyak-potato-head-yoga",
    name: "Yoga at Desa Potato Head",
    name_ar: "يوغا في ديسا بوتيتو هيد",
    category: "activity",
    subcategory: "yoga_class",
    area: "Petitenget",
    area_note: "Desa Potato Head, Jl. Petitenget No.51B — scheduled all-level yoga sessions on campus",
    description:
      "All-level yoga sessions hosted at Desa Potato Head Seminyak (Merasa / Sunset Park venues per brand wellbeing page). Distinct from overnight Potato Head Suites lodging; this record covers the bookable yoga activity offering.",
    why_visit: "Campus yoga sessions at Desa Potato Head.",
    best_for: ["yoga", "wellness", "petitenget"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://seminyak.potatohead.co/wellbeing/yoga", "https://seminyak.potatohead.co/"],
    websiteUrl: "https://seminyak.potatohead.co/wellbeing/yoga",
    tags: ["yoga", "potato_head", "wellness"],
    activity: { activityType: "wellness" },
  },

  // —— Nightlife (4) ——
  {
    external_key: "seminyak-potato-head-beach-club",
    name: "Potato Head Beach Club",
    name_ar: "بوتيتو هيد بيتش كلوب",
    category: "beach_club",
    subcategory: "beach_club",
    area: "Petitenget",
    area_note: "Jl. Petitenget No.51B — Desa Potato Head Seminyak beachfront club",
    description:
      "Iconic Petitenget beach club within Desa Potato Head with infinity pool, dining, and sunset sessions. Official Seminyak Potato Head pages market the Beach Club as the original good-times beachfront venue.",
    why_visit: "Signature Petitenget beach-club sunset scene.",
    best_for: ["beach_club", "sunset", "petitenget"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://seminyak.potatohead.co/feast/beach-club/",
      "https://seminyak.potatohead.co/",
    ],
    websiteUrl: "https://seminyak.potatohead.co/feast/beach-club/",
    tags: ["beach_club", "petitenget", "potato_head"],
    dining: {
      cuisineTypes: ["international"],
      mealTypes: ["lunch", "dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "seminyak-ku-de-ta",
    name: "Ku De Ta",
    name_ar: "كو دي تا",
    category: "beach_club",
    subcategory: "beach_club",
    area: "Kayu Aya / Seminyak Beach",
    area_note: "Jl. Kayu Aya No.9 — Seminyak beachfront club (not Petitenget Potato Head)",
    description:
      "Long-running Seminyak beach club and restaurant on Kayu Aya with ocean views, daybeds, dining, and evening events. Official site positions Ku De Ta as a Seminyak beachfront destination from sunrise through late.",
    why_visit: "Classic Seminyak beach-club day-to-night.",
    best_for: ["beach_club", "sunset", "kayu_aya"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://kudeta.com/", "https://kudeta.com/menu"],
    websiteUrl: "https://kudeta.com/",
    tags: ["beach_club", "seminyak", "kayu_aya"],
    dining: {
      cuisineTypes: ["international"],
      mealTypes: ["breakfast", "lunch", "dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "seminyak-woobar",
    name: "Woobar Bali",
    name_ar: "ووبار بالي",
    category: "beach_club",
    subcategory: "beach_club",
    area: "Petitenget",
    area_note: "Beach club at W Bali – Seminyak, Jl. Petitenget — hotel-linked beachfront venue",
    description:
      "Beachfront club at W Bali Seminyak transitioning from daytime beach club to evening nightlife. Official Woobar Bali site lists Seminyak beach-club hours and reservations via the W property.",
    why_visit: "W Seminyak beach club into nightlife.",
    best_for: ["beach_club", "nightlife", "petitenget"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.woobarbali.com/", "https://www.woobarbali.com/restaurant"],
    websiteUrl: "https://www.woobarbali.com/",
    tags: ["beach_club", "w_bali", "petitenget"],
    dining: {
      cuisineTypes: ["international"],
      mealTypes: ["lunch", "dinner"],
      dietaryOptions: [],
    },
  },
  {
    external_key: "seminyak-red-carpet",
    name: "Red Carpet Champagne Bar",
    name_ar: "ريد كاربت شامبين بار",
    category: "bar",
    subcategory: "champagne_bar",
    area: "Kayu Aya / Oberoi",
    area_note: "Jl. Kayu Aya No.42, Seminyak — champagne and cocktail bar on the Oberoi strip",
    description:
      "Champagne-focused bar on Kayu Aya with an extensive bubbly list, cocktails, food, and live music. Official site places the bar at Jalan Kayu Aya 42 in Seminyak.",
    why_visit: "Champagne and classic-hits nightlife on Kayu Aya.",
    best_for: ["champagne", "nightlife", "kayu_aya"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.redcarpetchampagnebar.com/"],
    websiteUrl: "https://www.redcarpetchampagnebar.com/",
    tags: ["bar", "champagne", "kayu_aya"],
  },

  // —— Accommodation (10) ——
  {
    external_key: "seminyak-alila-seminyak",
    name: "Alila Seminyak",
    name_ar: "أليلا سيمنياق",
    category: "accommodation",
    subcategory: "resort",
    area: "Petitenget",
    area_note: "Jl. Taman Ganesha / Petitenget — Alila beach resort (distinct from Alila Ubud / Alila Villas Uluwatu)",
    description:
      "Alila brand oceanfront beach resort in Seminyak / Petitenget with rooms and suites from deluxe through beach suite and penthouse categories on the official property page. Helm has not verified rates or amenity inventories. Distinct from Alila Ubud and Alila Villas Uluwatu already in other destination datasets.",
    why_visit: "Design-led beach resort in Petitenget.",
    best_for: ["stay", "beachfront", "petitenget"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://www.alilahotels.com/seminyak",
      "https://www.alilahotels.com/seminyak/dining/beach-bar/",
    ],
    websiteUrl: "https://www.alilahotels.com/seminyak",
    tags: ["resort", "petitenget", "alila"],
    accommodation_editorial: accommodationEditorial(
      "https://www.alilahotels.com/seminyak",
      "resort",
    ),
    accommodation: { accommodationType: "resort" },
  },
  {
    external_key: "seminyak-the-legian",
    name: "The Legian Seminyak",
    name_ar: "ذا ليجيان سيمنياق",
    category: "accommodation",
    subcategory: "boutique_hotel",
    area: "Seminyak Beach",
    area_note:
      "Beachfront Seminyak suites hotel (LHM Hotels) — name references Legian brand lineage but property is Seminyak beachfront, not Legian village",
    description:
      "All-suite beachfront hotel on Seminyak Beach with studio through multi-bedroom suites and club-style services. Official LHM Hotels page markets The Legian Seminyak as a Seminyak beach property.",
    why_visit: "All-suite beachfront stay on Seminyak Beach.",
    best_for: ["stay", "suites", "beachfront"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.lhm-hotels.com/en/the-legian-seminyak-bali"],
    websiteUrl: "https://www.lhm-hotels.com/en/the-legian-seminyak-bali",
    tags: ["boutique_hotel", "seminyak_beach", "suites"],
    accommodation_editorial: accommodationEditorial(
      "https://www.lhm-hotels.com/en/the-legian-seminyak-bali",
      "boutique_hotel",
    ),
    accommodation: { accommodationType: "boutique_hotel" },
  },
  {
    external_key: "seminyak-w-bali",
    name: "W Bali - Seminyak",
    name_ar: "دبليو بالي سيمنياق",
    category: "accommodation",
    subcategory: "resort",
    area: "Petitenget",
    area_note: "Jl. Petitenget, Kerobokan / Seminyak — Marriott W beach resort",
    description:
      "W Hotels beach resort in Seminyak with rooms, suites, and villas plus on-site dining and Woobar. Official Marriott page lists the Petitenget address; amenity and rate claims are not verified by Helm.",
    why_visit: "Energetic beach resort base in Petitenget.",
    best_for: ["stay", "resort", "nightlife_adjacent"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://www.marriott.com/en-us/hotels/dpswh-w-bali-seminyak/overview/",
    ],
    websiteUrl: "https://www.marriott.com/en-us/hotels/dpswh-w-bali-seminyak/overview/",
    tags: ["resort", "petitenget", "w_hotels"],
    accommodation_editorial: accommodationEditorial(
      "https://www.marriott.com/en-us/hotels/dpswh-w-bali-seminyak/overview/",
      "resort",
    ),
    accommodation: { accommodationType: "resort" },
  },
  {
    external_key: "seminyak-potato-head-suites",
    name: "Potato Head Suites",
    name_ar: "بوتيتو هيد سويتس",
    category: "accommodation",
    subcategory: "boutique_hotel",
    area: "Petitenget",
    area_note: "Desa Potato Head, Jl. Petitenget No.51B — boutique suites beside the Beach Club",
    description:
      "Boutique suite hotel within Desa Potato Head Seminyak designed with Indonesian craft materials, with guest access to campus dining and Beach Club products per brand. Distinct from the Beach Club venue record.",
    why_visit: "Design-led suites inside Desa Potato Head.",
    best_for: ["stay", "boutique", "petitenget"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://seminyak.potatohead.co/art-design/andra-matin-potato-head-suites",
      "https://seminyak.potatohead.co/",
    ],
    websiteUrl: "https://seminyak.potatohead.co/art-design/andra-matin-potato-head-suites",
    tags: ["boutique_hotel", "potato_head", "petitenget"],
    accommodation_editorial: accommodationEditorial(
      "https://seminyak.potatohead.co/art-design/andra-matin-potato-head-suites",
      "boutique_hotel",
    ),
    accommodation: { accommodationType: "boutique_hotel" },
  },
  {
    external_key: "seminyak-the-samaya",
    name: "The Samaya Seminyak",
    name_ar: "ذا سامايا سيمنياق",
    category: "accommodation",
    subcategory: "villa",
    area: "Seminyak Beach / Laksmana",
    area_note: "Jl. Laksmana, Seminyak Beach — beachfront and courtyard private-pool villas",
    description:
      "Beachfront villa resort on Seminyak Beach with one- to three-bedroom pool villas across beachside and Royal Courtyard settings. Official Samaya Seminyak site markets private-pool villas; pool and rate details are not verified inventory for Helm.",
    why_visit: "Private-pool villas on Seminyak Beach.",
    best_for: ["stay", "villa", "beachfront"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://thesamaya.com/seminyak"],
    websiteUrl: "https://thesamaya.com/seminyak",
    tags: ["villa", "seminyak_beach", "samaya"],
    accommodation_editorial: accommodationEditorial("https://thesamaya.com/seminyak", "villa"),
    accommodation: { accommodationType: "villa" },
  },
  {
    external_key: "seminyak-oberoi-bali",
    name: "The Oberoi, Bali",
    name_ar: "ذا أوبروي بالي",
    category: "accommodation",
    subcategory: "resort",
    area: "Seminyak Beach / Kayu Aya",
    area_note: "Jl. Kayu Aya — pavilion-style resort on Seminyak Beach (Oberoi Hotels)",
    description:
      "Pavilion-style beach resort set in tropical gardens on Seminyak Beach with ocean-facing dining and cultural amphitheatre performances. Official Oberoi Bali page places the resort on Seminyak Beach / Jalan Kayu Aya.",
    why_visit: "Garden pavilion resort on Seminyak Beach.",
    best_for: ["stay", "resort", "beachfront"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.oberoihotels.com/hotels-in-bali/"],
    websiteUrl: "https://www.oberoihotels.com/hotels-in-bali/",
    tags: ["resort", "seminyak_beach", "oberoi"],
    accommodation_editorial: accommodationEditorial(
      "https://www.oberoihotels.com/hotels-in-bali/",
      "resort",
    ),
    accommodation: { accommodationType: "resort" },
  },
  {
    external_key: "seminyak-peppers",
    name: "Peppers Seminyak",
    name_ar: "بيبرز سيمنياق",
    category: "accommodation",
    subcategory: "villa",
    area: "Petitenget / Seminyak",
    area_note: "Private-pool villa resort in Seminyak (Peppers brand)",
    description:
      "Villa resort in Seminyak offering one- to multi-bedroom private-pool villas with living/dining kitchens and tropical gardens. Official Peppers Seminyak site markets villa categories; amenity inventories remain unverified for Helm.",
    why_visit: "Private-pool villa resort in Seminyak.",
    best_for: ["stay", "villa", "families"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.peppersseminyak.com/"],
    websiteUrl: "https://www.peppersseminyak.com/",
    tags: ["villa", "seminyak", "peppers"],
    accommodation_editorial: accommodationEditorial("https://www.peppersseminyak.com/", "villa"),
    accommodation: { accommodationType: "villa" },
  },
  {
    external_key: "seminyak-hotel-indigo",
    name: "Hotel Indigo Bali Seminyak Beach",
    name_ar: "هوتيل إنديجو بالي سيمنياق بيتش",
    category: "accommodation",
    subcategory: "resort",
    area: "Seminyak Beach / Camplung Tanduk",
    area_note: "Jl. Camplung Tanduk No.10 — beachfront Seminyak resort (IHG Hotel Indigo)",
    description:
      "Beachfront Seminyak resort with rooms, suites, and private-pool villas plus destination dining and Sava Spa. Official Hotel Indigo Seminyak site lists the Camplung Tanduk beach address.",
    why_visit: "Neighborhood-styled beach resort in central Seminyak.",
    best_for: ["stay", "beachfront", "resort"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://seminyak.hotelindigo.com/en"],
    websiteUrl: "https://seminyak.hotelindigo.com/en",
    tags: ["resort", "seminyak_beach", "hotel_indigo"],
    accommodation_editorial: accommodationEditorial("https://seminyak.hotelindigo.com/en", "resort"),
    accommodation: { accommodationType: "resort" },
  },
  {
    external_key: "seminyak-the-seminyak-beach-resort",
    name: "The Seminyak Beach Resort & Spa",
    name_ar: "ذا سيمنياق بيتش ريزورت آند سبا",
    category: "accommodation",
    subcategory: "resort",
    area: "Seminyak Beach",
    area_note: "Beachfront Seminyak resort and villas with spa and infinity pool (brand site)",
    description:
      "Independent beachfront resort and villas on Seminyak Beach with rooms, ocean suites, and pool villas plus spa and dining. Official theseminyak.com markets beachfront lodging; rates and amenity lists are not Helm-verified.",
    why_visit: "Beachfront resort & spa stay in Seminyak.",
    best_for: ["stay", "beachfront", "spa"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: ["https://www.theseminyak.com/"],
    websiteUrl: "https://www.theseminyak.com/",
    tags: ["resort", "seminyak_beach", "spa"],
    accommodation_editorial: accommodationEditorial("https://www.theseminyak.com/", "resort"),
    accommodation: { accommodationType: "resort" },
  },
  {
    external_key: "seminyak-amadea",
    name: "Amadea Resort & Villas Seminyak",
    name_ar: "أماديا ريزورت وفيلات سيمنياق",
    category: "accommodation",
    subcategory: "resort",
    area: "Kayu Aya / Eat Street",
    area_note: "Jl. Kayu Aya No.55, Seminyak — resort on Eat Street / Oberoi strip (Prime Plaza)",
    description:
      "Tropical resort on Seminyak’s Eat Street with rooms, suites, and private-pool villas near dining and shopping. Official Amadea / Prime Plaza pages place the property at Jl. Kayu Aya 55; amenity and rate claims are not Helm-verified.",
    why_visit: "Central Seminyak resort on Eat Street.",
    best_for: ["stay", "eat_street", "resort"],
    rating: nullRating(),
    price: unknownPrice("IDR"),
    address: null,
    coordinates: nullCoords(),
    opening_hours: null,
    visit_duration_minutes: null,
    booking_recommended: null,
    source_urls: [
      "https://arvs.pphotels.com/",
      "https://arvs.pphotels.com/helpful-info/contact-us/",
    ],
    websiteUrl: "https://arvs.pphotels.com/",
    tags: ["resort", "kayu_aya", "amadea"],
    accommodation_editorial: accommodationEditorial("https://arvs.pphotels.com/", "resort"),
    accommodation: { accommodationType: "resort" },
  },
];

function toEditorialRecord(p) {
  const record = {
    external_key: p.external_key,
    name: p.name,
    name_ar: p.name_ar,
    country_code: "ID",
    destination_slug: "seminyak",
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
  const local = editorialKey.startsWith("seminyak-")
    ? editorialKey.slice("seminyak-".length)
    : editorialKey;
  return `id:seminyak:${local}`;
}

function isTourismListingUrl(url) {
  return /lovebali\.baliprov|indonesia\.travel|sisparnas\.kemenpar|disparda\.baliprov|budayabali\.com|badungkab\.go\.id/.test(
    url,
  );
}

function isSecondaryGuideUrl(url) {
  return /balihandbook\.com|thebaliguideline\.com|baliholidaysecrets\.com/.test(url);
}

function sourceForPlace(p) {
  if (p.source_urls?.length) {
    return p.source_urls.map((url) => {
      if (isTourismListingUrl(url)) {
        return {
          sourceType: "other",
          name: "Official tourism / cultural / destination listing",
          url,
          notes:
            "Destination or cultural listing captured for identity provenance only. Fees, hours, and conditions not treated as Helm-verified inventory.",
          collectedAt: COMPILED_AT,
        };
      }
      if (isSecondaryGuideUrl(url)) {
        return {
          sourceType: "other",
          name: "Secondary destination guide",
          url,
          notes:
            "Secondary guide, not an official tourism source. Captured for locality identity provenance only.",
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
      name: "Helm curated Seminyak dataset v1 research lead",
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
    destinationSlug: "seminyak",
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

  if (
    p.rating &&
    typeof p.rating.value === "number" &&
    typeof p.rating.review_count === "number"
  ) {
    place.rating = {
      value: p.rating.value,
      scale: p.rating.scale ?? 5,
      reviewCount: p.rating.review_count,
      platform: p.rating.provider || "provider_unspecified",
      observedAt: COMPILED_AT,
    };
  }

  if (p.category !== "accommodation" && level != null) place.priceLevel = level;
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
    name: "Seminyak",
    name_ar: "سيمنياق",
    slug: "seminyak",
    external_key: "id:seminyak",
    type: "destination_area",
    type_note:
      "Editorial type only — catalog.destinations has no destination_type column; not imported as a typed enum.",
    region: "Southwest Bali / Badung / Kuta Utara",
    parent: "Indonesia",
    parent_note:
      "Editorial parent label. Import format does not set parent_id; no Indonesia destination row is required for countryCode ID.",
    country_code: "ID",
    recommended_duration: "3–5 days",
    tags: [
      "beach",
      "dining",
      "beach_clubs",
      "nightlife",
      "shopping",
      "wellness",
      "petitenget",
      "kayu_aya",
      "seminyak_beach",
    ],
    data_status: "curated_needs_verification",
    publication_status: "draft",
    unpublished: true,
    summary_en:
      "Upscale southwest Bali beach and dining destination spanning Seminyak Beach, Kayu Aya (Oberoi), and Petitenget — distinct from Legian and Kuta.",
    summary_ar:
      "وجهة شاطئية وتذوق راقية في جنوب غرب بالي عبر شاطئ سيمنياق وكايو آيا (أوبروي) وبيتيتينغيت — متميزة عن ليجيان وكوتا.",
  },
  category_distribution: {
    restaurant: 5,
    cafe: 4,
    attraction: 3,
    activity: 4,
    bar_beach_club_nightlife: 4,
    accommodation: 10,
  },
  geography_note:
    "Seminyak localities (Seminyak Beach, Kayu Aya/Oberoi/Eat Street, Petitenget, Double Six southern edge, Kerobokan Kelod fringe) are labeled separately. Do not treat Seminyak, Legian, and Kuta as interchangeable villages. Canggu and Uluwatu places are out of scope.",
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
    accommodation_fields:
      "Rich accommodation editorial block stays in source JSON; import only sends category accommodation + accommodation.accommodationType",
    lifecycle: "all_records_draft_curated_needs_verification",
  },
  places: PLACES.map(toEditorialRecord),
  mapping: {
    import_file: "seminyak-curated-v1.json",
    import_format: "helm.catalog.import.v1",
    external_key_rule:
      "editorial.external_key (e.g. seminyak-la-lucciola) → import.externalKey id:seminyak:<suffix>; import.slug keeps editorial key",
    unsupported_in_import: [
      "destination.type / destination_area",
      "destination.parent hierarchy",
      "why_visit / best_for (folded into shortDescriptionEn / tags where useful)",
      "opening_hours",
      "structured price amounts (only priceLevel 1–4 when tier known)",
      "coordinates when null (omitted)",
      "ranking_support block",
      "accommodation starRating / amenities / price_per_night when unverified",
    ],
  },
};

const importPayload = {
  formatVersion: "helm.catalog.import.v1",
  sourceLabel: DATASET_VERSION,
  destinations: [
    {
      externalKey: "id:seminyak",
      slug: "seminyak",
      nameEn: "Seminyak",
      nameAr: "سيمنياق",
      countryCode: "ID",
      summaryEn: editorial.destination.summary_en,
      summaryAr: editorial.destination.summary_ar,
      shortDescriptionEn:
        "Upscale southwest Bali beach and dining destination spanning Seminyak Beach, Kayu Aya, and Petitenget. Distinct from Legian and Kuta. Recommended stay 3–5 days.",
      tags: editorial.destination.tags,
      updateIfExists: false,
      sources: [
        {
          sourceType: "manual_research",
          name: "Helm curated Seminyak destination notes",
          notes:
            "Draft curated destination. Unpublished. Needs verification before publish. Seminyak is not interchangeable with Legian or Kuta.",
          collectedAt: COMPILED_AT,
        },
      ],
    },
  ],
  places: PLACES.map(toImportPlace),
};

mkdirSync(OUT_DIR, { recursive: true });
const sourcePath = join(OUT_DIR, "seminyak-curated-v1.source.json");
const importPath = join(OUT_DIR, "seminyak-curated-v1.json");
writeFileSync(sourcePath, `${JSON.stringify(editorial, null, 2)}\n`);
writeFileSync(importPath, `${JSON.stringify(importPayload, null, 2)}\n`);
console.log(`Wrote ${sourcePath}`);
console.log(`Wrote ${importPath}`);
console.log(`Places: ${importPayload.places.length}`);

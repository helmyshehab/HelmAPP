/// Small local subset of Ubud curated catalog entries (dataset v1).
/// Names/descriptions are catalog-backed; rates and amenities are omitted.
library;

class UbudDemoPlace {
  const UbudDemoPlace({
    required this.slug,
    required this.externalKey,
    required this.nameEn,
    required this.category,
    required this.shortDescriptionEn,
    this.area,
    this.activityDescriptionEn,
  });

  final String slug;
  final String externalKey;
  final String nameEn;
  final String category;
  final String shortDescriptionEn;
  final String? area;
  final String? activityDescriptionEn;
}

/// Deterministic demo catalog — every entry maps to `ubud-curated-v1`.
const ubudDemoPlaces = <UbudDemoPlace>[
  UbudDemoPlace(
    slug: 'ubud-hujan-locale',
    externalKey: 'id:ubud:hujan-locale',
    nameEn: 'Hujan Locale',
    category: 'restaurant',
    shortDescriptionEn:
        'A polished introduction to Indonesian flavours without leaving the Ubud dining circuit.',
  ),
  UbudDemoPlace(
    slug: 'ubud-moksa',
    externalKey: 'id:ubud:moksa',
    nameEn: 'Moksa Ubud',
    category: 'restaurant',
    shortDescriptionEn:
        'One of Ubud’s better-known plant-based dining destinations.',
  ),
  UbudDemoPlace(
    slug: 'ubud-murnis-warung',
    externalKey: 'id:ubud:murnis-warung',
    nameEn: 'Murni’s Warung',
    category: 'restaurant',
    shortDescriptionEn:
        'Classic Ubud warung dining with a riverside setting and deep local history.',
  ),
  UbudDemoPlace(
    slug: 'ubud-suka-ubud',
    externalKey: 'id:ubud:suka-ubud',
    nameEn: 'Suka Ubud',
    category: 'cafe',
    shortDescriptionEn:
        'Strong brunch and coffee stop for daytime plans in Ubud.',
  ),
  UbudDemoPlace(
    slug: 'ubud-watercress',
    externalKey: 'id:ubud:watercress',
    nameEn: 'Watercress Ubud',
    category: 'cafe',
    shortDescriptionEn:
        'Reliable brunch cafe with strong traveller review volume.',
  ),
  UbudDemoPlace(
    slug: 'ubud-ivy-cafe',
    externalKey: 'id:ubud:ivy-cafe',
    nameEn: 'Ivy Cafe',
    category: 'cafe',
    shortDescriptionEn:
        'Flexible daytime cafe stop with consistently high public ratings.',
  ),
  UbudDemoPlace(
    slug: 'ubud-sacred-monkey-forest',
    externalKey: 'id:ubud:sacred-monkey-forest',
    nameEn: 'Sacred Monkey Forest Sanctuary',
    category: 'attraction',
    area: 'Padangtegal, Ubud',
    activityDescriptionEn:
        'Forest sanctuary and temple complex with long-tailed macaques and shaded walking paths.',
    shortDescriptionEn:
        'Signature Ubud nature-and-culture visit combining forest paths and temple grounds.',
  ),
  UbudDemoPlace(
    slug: 'ubud-campuhan-ridge-walk',
    externalKey: 'id:ubud:campuhan-ridge-walk',
    nameEn: 'Campuhan Ridge Walk',
    category: 'attraction',
    area: 'Campuhan, Ubud',
    activityDescriptionEn:
        'An open ridge path through grassy hills above the Campuhan river confluence.',
    shortDescriptionEn:
        'Easy scenic walk with open views close to central Ubud.',
  ),
  UbudDemoPlace(
    slug: 'ubud-tirta-empul',
    externalKey: 'id:ubud:tirta-empul',
    nameEn: 'Tirta Empul Temple',
    category: 'attraction',
    area: 'Tampaksiring',
    activityDescriptionEn:
        'Hindu water temple known for purification pools fed by a natural spring.',
    shortDescriptionEn:
        'Important cultural site and day excursion from Ubud into Tampaksiring.',
  ),
  UbudDemoPlace(
    slug: 'ubud-mount-batur-sunrise-trek',
    externalKey: 'id:ubud:mount-batur-sunrise-trek',
    nameEn: 'Mount Batur Sunrise Trek',
    category: 'activity',
    area: 'Kintamani',
    activityDescriptionEn:
        'Guided sunrise trek on Mount Batur in the volcanic region northeast of Ubud.',
    shortDescriptionEn:
        'Classic Bali adventure day trip for active travellers based in Ubud.',
  ),
  UbudDemoPlace(
    slug: 'ubud-atv-quad-bike-adventure',
    externalKey: 'id:ubud:atv-quad-bike-adventure',
    nameEn: 'Ubud ATV Quad Bike Adventure',
    category: 'activity',
    area: 'Greater Ubud and surrounding villages',
    activityDescriptionEn:
        'Guided quad-bike ride on countryside trails near Ubud.',
    shortDescriptionEn:
        'High-energy off-road activity popular with short-stay travellers.',
  ),
  UbudDemoPlace(
    slug: 'ubud-ayung-river-rafting',
    externalKey: 'id:ubud:ayung-river-rafting',
    nameEn: 'Ayung River White-Water Rafting',
    category: 'activity',
    area: 'Payangan / Ayung River',
    activityDescriptionEn:
        'White-water rafting through the Ayung River’s jungle gorges north of Ubud.',
    shortDescriptionEn:
        'Signature Bali water adventure reachable as an excursion from Ubud.',
  ),
  UbudDemoPlace(
    slug: 'ubud-balinese-cooking-class',
    externalKey: 'id:ubud:balinese-cooking-class',
    nameEn: 'Balinese Cooking Class & Market Tour',
    category: 'activity',
    area: 'Ubud',
    activityDescriptionEn:
        'Hands-on Balinese cooking class, often paired with a guided market visit for fresh ingredients.',
    shortDescriptionEn:
        'Cultural food experience that pairs well with Ubud’s culinary reputation.',
  ),
  UbudDemoPlace(
    slug: 'ubud-donna',
    externalKey: 'id:ubud:donna',
    nameEn: 'Donna',
    category: 'bar',
    shortDescriptionEn:
        'Evening venue when you want dinner and cocktails in one stop.',
  ),
  UbudDemoPlace(
    slug: 'ubud-swasti-eco-cottages',
    externalKey: 'id:ubud:swasti-eco-cottages',
    nameEn: 'Swasti Eco Cottages',
    category: 'accommodation',
    shortDescriptionEn:
        'Budget-friendly private cottages with a wellness / garden focus near Monkey Forest.',
  ),
  UbudDemoPlace(
    slug: 'ubud-village-hotel',
    externalKey: 'id:ubud:village-hotel',
    nameEn: 'Ubud Village Hotel',
    category: 'accommodation',
    shortDescriptionEn:
        'Central Ubud boutique base for walkable nights out and Monkey Forest access.',
  ),
  UbudDemoPlace(
    slug: 'ubud-adiwana-jembawan',
    externalKey: 'id:ubud:adiwana-jembawan',
    nameEn: 'Adiwana Resort Jembawan',
    category: 'accommodation',
    shortDescriptionEn:
        'Mid-range boutique wellness stay walking-distance from Ubud town sites.',
  ),
  UbudDemoPlace(
    slug: 'ubud-komaneka-bisma',
    externalKey: 'id:ubud:komaneka-bisma',
    nameEn: 'Komaneka at Bisma',
    category: 'accommodation',
    shortDescriptionEn:
        'Valley-view boutique stay a short hop from central Ubud.',
  ),
  UbudDemoPlace(
    slug: 'ubud-alila-ubud',
    externalKey: 'id:ubud:alila-ubud',
    nameEn: 'Alila Ubud',
    category: 'accommodation',
    shortDescriptionEn:
        'River-valley luxury resort for a quieter Ubud-area base.',
  ),
  UbudDemoPlace(
    slug: 'ubud-capella-ubud',
    externalKey: 'id:ubud:capella-ubud',
    nameEn: 'Capella Ubud, Bali',
    category: 'accommodation',
    shortDescriptionEn:
        'Distinctive luxury tented-camp stay in the Ubud jungle hinterland.',
  ),
];

UbudDemoPlace? ubudPlaceBySlug(String slug) {
  for (final place in ubudDemoPlaces) {
    if (place.slug == slug) return place;
  }
  return null;
}

List<UbudDemoPlace> ubudPlacesInCategories(Set<String> categories) {
  return ubudDemoPlaces
      .where((p) => categories.contains(p.category))
      .toList(growable: false);
}

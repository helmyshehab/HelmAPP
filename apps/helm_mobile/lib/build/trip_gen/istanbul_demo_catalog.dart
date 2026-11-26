/// Local Istanbul demo places for Packages Customize preview (not live inventory).
library;

import 'ubud_demo_catalog.dart';

/// Reuses [UbudDemoPlace] shape so TripPreviewPlan / stops stay unchanged.
const istanbulDemoPlaces = <UbudDemoPlace>[
  UbudDemoPlace(
    slug: 'istanbul-ajia-hotel',
    externalKey: 'tr:istanbul:ajia-hotel',
    nameEn: 'Ajia Hotel',
    category: 'accommodation',
    shortDescriptionEn: 'Bosphorus-facing boutique stay for a central Istanbul base.',
  ),
  UbudDemoPlace(
    slug: 'hagia-sophia-exterior',
    externalKey: 'tr:istanbul:hagia-sophia-exterior',
    nameEn: 'Hagia Sophia (exterior context)',
    category: 'attraction',
    shortDescriptionEn: 'Historic landmark reference for catalog discovery.',
    area: 'Sultanahmet',
  ),
  UbudDemoPlace(
    slug: 'istanbul-grand-bazaar',
    externalKey: 'tr:istanbul:grand-bazaar',
    nameEn: 'Grand Bazaar',
    category: 'attraction',
    shortDescriptionEn: 'Covered historic market for a classic Istanbul wander.',
    area: 'Beyazıt',
  ),
  UbudDemoPlace(
    slug: 'istanbul-galata-tower',
    externalKey: 'tr:istanbul:galata-tower',
    nameEn: 'Galata Tower',
    category: 'attraction',
    shortDescriptionEn: 'Landmark tower stop with city and water views.',
    area: 'Galata',
  ),
];

UbudDemoPlace? istanbulPlaceBySlug(String slug) {
  for (final place in istanbulDemoPlaces) {
    if (place.slug == slug) return place;
  }
  return null;
}

/// Resolve a demo place from either destination catalog.
UbudDemoPlace? demoPlaceBySlug(String slug) =>
    ubudPlaceBySlug(slug) ?? istanbulPlaceBySlug(slug);

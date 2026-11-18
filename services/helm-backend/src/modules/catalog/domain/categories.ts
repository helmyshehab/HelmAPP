/** Place categories aligned with catalog.place_category (+ Step 5 bar/beach_club). */

export const PLACE_CATEGORIES = [
  'accommodation',
  'restaurant',
  'cafe',
  'bar',
  'beach_club',
  'attraction',
  'activity',
  'nightlife',
  'transport',
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

/** Customer-facing category groups (discovery UX). */
export const CATEGORY_GROUPS = [
  {
    id: 'accommodation',
    labelEn: 'Accommodation',
    labelAr: 'الإقامة',
    categories: ['accommodation'] as const,
    subcategories: [
      'hotel',
      'resort',
      'villa',
      'apartment',
      'guesthouse',
      'boutique_hotel',
    ],
  },
  {
    id: 'food_and_drink',
    labelEn: 'Food and drink',
    labelAr: 'الطعام والشراب',
    categories: ['restaurant', 'cafe', 'bar', 'beach_club'] as const,
    subcategories: ['restaurant', 'cafe', 'bar', 'beach_club'],
  },
  {
    id: 'attractions',
    labelEn: 'Attractions',
    labelAr: 'المعالم',
    categories: ['attraction'] as const,
    subcategories: ['landmark', 'museum', 'cultural', 'natural', 'viewpoint'],
  },
  {
    id: 'activities',
    labelEn: 'Activities',
    labelAr: 'الأنشطة',
    categories: ['activity'] as const,
    subcategories: ['adventure', 'water_sports', 'tour', 'outdoor', 'wellness'],
  },
  {
    id: 'nightlife',
    labelEn: 'Nightlife',
    labelAr: 'الحياة الليلية',
    categories: ['nightlife'] as const,
    subcategories: ['nightclub', 'music_venue', 'festival_venue'],
  },
  {
    id: 'transportation',
    labelEn: 'Transportation',
    labelAr: 'المواصلات',
    categories: ['transport'] as const,
    subcategories: ['airport_transfer', 'car_rental', 'local', 'intercity'],
  },
] as const;

export function isPlaceCategory(value: string): value is PlaceCategory {
  return (PLACE_CATEGORIES as readonly string[]).includes(value);
}

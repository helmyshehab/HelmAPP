import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isBuildCompatiblePackageContent,
  parseBuildCompatiblePackageContent,
  parseTripPreviewContent,
  requiredPublishedSlugs,
} from '../src/modules/packages/domain/trip-preview-content.ts';

const istanbulContent = {
  kind: 'trip_preview',
  version: 1,
  answers: {
    budgetEgp: 90000,
    destination: 'istanbul',
    travelerCount: 2,
    lifestyle: 'culture',
    nights: 3,
    amenities: ['Breakfast included'],
  },
  selections: {
    flightId: 'economy-example',
    hotelSlug: 'istanbul-ajia-hotel',
    includedActivitySlugs: ['hagia-sophia-exterior'],
  },
  itinerary: {
    days: [
      { dayNumber: 1, stopSlugs: ['hagia-sophia-exterior', 'istanbul-grand-bazaar'] },
      { dayNumber: 2, stopSlugs: ['istanbul-galata-tower'] },
      { dayNumber: 3, stopSlugs: ['hagia-sophia-exterior'] },
    ],
  },
};

const ubudLegacy = {
  kind: 'ubud_trip_preview',
  version: 1,
  answers: {
    budgetEgp: 85000,
    destination: 'ubud',
    travelerCount: 2,
    lifestyle: 'culture',
    nights: 2,
    amenities: ['Pool'],
  },
  selections: {
    flightId: 'economy-example',
    hotelSlug: 'ubud-village-hotel',
    includedActivitySlugs: ['ubud-sacred-monkey-forest'],
  },
  itinerary: {
    days: [
      { dayNumber: 1, stopSlugs: ['ubud-sacred-monkey-forest', 'ubud-moksa'] },
      { dayNumber: 2, stopSlugs: ['ubud-moksa'] },
    ],
  },
};

test('parseTripPreviewContent accepts Istanbul fixture shape', () => {
  const parsed = parseTripPreviewContent(istanbulContent);
  assert.equal(parsed.answers.destination, 'istanbul');
  assert.deepEqual(requiredPublishedSlugs(parsed).sort(), [
    'hagia-sophia-exterior',
    'istanbul-ajia-hotel',
    'istanbul-galata-tower',
    'istanbul-grand-bazaar',
  ]);
  assert.equal(isBuildCompatiblePackageContent(istanbulContent), true);
});

test('parseBuildCompatiblePackageContent dual-reads legacy ubud_trip_preview', () => {
  const parsed = parseBuildCompatiblePackageContent(ubudLegacy);
  assert.equal(parsed.kind, 'ubud_trip_preview');
  assert.equal(isBuildCompatiblePackageContent(ubudLegacy), true);
});

test('parseTripPreviewContent rejects unknown Istanbul hotel', () => {
  assert.throws(() =>
    parseTripPreviewContent({
      ...istanbulContent,
      selections: {
        ...istanbulContent.selections,
        hotelSlug: 'not-a-hotel',
      },
    }),
  );
});

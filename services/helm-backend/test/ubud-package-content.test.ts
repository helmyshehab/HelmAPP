import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isBuildCompatiblePackageContent,
  parseUbudPackageContent,
  requiredPublishedSlugs,
} from '../src/modules/packages/domain/ubud-package-content.ts';

const validContent = {
  kind: 'ubud_trip_preview',
  version: 1,
  answers: {
    budgetEgp: 85000,
    destination: 'ubud',
    travelerCount: 2,
    lifestyle: 'culture',
    nights: 3,
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
      { dayNumber: 3, stopSlugs: ['ubud-sacred-monkey-forest'] },
    ],
  },
};

test('parseUbudPackageContent accepts Build-compatible fixture shape', () => {
  const parsed = parseUbudPackageContent(validContent);
  assert.equal(parsed.answers.nights, 3);
  assert.deepEqual(requiredPublishedSlugs(parsed).sort(), [
    'ubud-moksa',
    'ubud-sacred-monkey-forest',
    'ubud-village-hotel',
  ]);
  assert.equal(isBuildCompatiblePackageContent(validContent), true);
});

test('parseUbudPackageContent rejects nights/itinerary mismatch', () => {
  assert.throws(() =>
    parseUbudPackageContent({
      ...validContent,
      answers: { ...validContent.answers, nights: 2 },
    }),
  );
});

test('parseUbudPackageContent rejects included activity missing from itinerary', () => {
  assert.throws(() =>
    parseUbudPackageContent({
      ...validContent,
      selections: {
        ...validContent.selections,
        includedActivitySlugs: ['ubud-tirta-empul'],
      },
    }),
  );
});

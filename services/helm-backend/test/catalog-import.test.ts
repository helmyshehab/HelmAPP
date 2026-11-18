import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCatalogImport } from '../src/modules/catalog/domain/import-format.ts';

const validPlace = {
  externalKey: 'bali:uluwatu:temple',
  destinationSlug: 'bali',
  category: 'attraction' as const,
  subcategory: 'landmark',
  slug: 'uluwatu-temple',
  nameEn: 'Uluwatu Temple',
  nameAr: 'معبد أولوواتو',
  updateIfExists: false,
};

test('valid import payload parses', () => {
  const result = validateCatalogImport({
    formatVersion: 'helm.catalog.import.v1',
    sourceLabel: 'curated-bali-v1',
    places: [validPlace],
  });
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.data?.places.length, 1);
});

test('rejects wrong format version', () => {
  const result = validateCatalogImport({
    formatVersion: 'nope',
    places: [validPlace],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test('rejects duplicate externalKey in payload', () => {
  const result = validateCatalogImport({
    formatVersion: 'helm.catalog.import.v1',
    places: [validPlace, { ...validPlace, slug: 'other' }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.path.includes('externalKey')));
});

test('rejects invented rating without platform', () => {
  const result = validateCatalogImport({
    formatVersion: 'helm.catalog.import.v1',
    places: [
      {
        ...validPlace,
        rating: { value: 4.5, observedAt: '2026-01-01' },
      },
    ],
  });
  assert.equal(result.ok, false);
});

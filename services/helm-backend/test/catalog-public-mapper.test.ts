import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertNoInternalLeak,
  toPublicPlace,
} from '../src/modules/catalog/application/public-catalog.mapper.ts';

test('public mapper strips verification and rejection metadata', () => {
  const pub = toPublicPlace({
    id: 'a1111111-1111-1111-1111-111111111111',
    slug: 'hagia-sophia-exterior',
    nameEn: 'Hagia Sophia',
    lifecycleStatus: 'published',
    verifiedBy: '77777777-7777-7777-7777-777777777777',
    rejectionReason: 'should not leak',
    externalKey: 'seed:secret',
    ratingValue: null,
  });
  assert.equal(pub.status, 'published');
  assert.equal('lifecycleStatus' in pub, false);
  assert.equal('verifiedBy' in pub, false);
  assert.equal('rejectionReason' in pub, false);
  assert.equal('externalKey' in pub, false);
  assertNoInternalLeak(pub);
});

test('assertNoInternalLeak throws when internals present', () => {
  assert.throws(() => assertNoInternalLeak({ rejectionReason: 'nope' }));
});

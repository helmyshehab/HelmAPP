import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_ONLY_TARGETS,
  canTransition,
  isCreatableStatus,
  isPubliclyVisible,
} from '../src/modules/catalog/domain/lifecycle.ts';

test('draft can move to pending_verification', () => {
  assert.equal(canTransition('draft', 'pending_verification'), true);
});

test('draft cannot jump to published', () => {
  assert.equal(canTransition('draft', 'published'), false);
});

test('verified can be approved then published', () => {
  assert.equal(canTransition('verified', 'approved'), true);
  assert.equal(canTransition('approved', 'published'), true);
});

test('published only archives', () => {
  assert.equal(canTransition('published', 'archived'), true);
  assert.equal(canTransition('published', 'draft'), false);
  assert.equal(canTransition('published', 'rejected'), false);
});

test('only published is publicly visible', () => {
  assert.equal(isPubliclyVisible('published'), true);
  assert.equal(isPubliclyVisible('approved'), false);
  assert.equal(isPubliclyVisible('verified'), false);
  assert.equal(isPubliclyVisible('draft'), false);
});

test('admin-only targets include verify/approve/publish/archive', () => {
  assert.ok(ADMIN_ONLY_TARGETS.includes('verified'));
  assert.ok(ADMIN_ONLY_TARGETS.includes('approved'));
  assert.ok(ADMIN_ONLY_TARGETS.includes('published'));
  assert.ok(ADMIN_ONLY_TARGETS.includes('archived'));
  assert.equal(ADMIN_ONLY_TARGETS.includes('pending_verification'), false);
});

test('creatable statuses are curation-safe', () => {
  assert.equal(isCreatableStatus('draft'), true);
  assert.equal(isCreatableStatus('published'), false);
  assert.equal(isCreatableStatus('verified'), false);
});

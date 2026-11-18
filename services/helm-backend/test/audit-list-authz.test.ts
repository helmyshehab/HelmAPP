import assert from 'node:assert/strict';
import test from 'node:test';
import { AppException } from '../src/common/errors/app.exception.ts';
import { AuditAdminController } from '../src/modules/audit/api/audit-admin.controller.ts';
import type { AuthPrincipal } from '../src/infrastructure/ports/auth.port.ts';

function principal(
  roles: AuthPrincipal['roles'],
  rolesSource: AuthPrincipal['rolesSource'] = 'database',
): AuthPrincipal {
  return {
    userId: '55555555-5555-5555-5555-555555555555',
    roles,
    rolesSource,
  };
}

test('operators cannot list audit events', async () => {
  const audit = {
    listByEntity: async () => {
      throw new Error('should not list');
    },
  };
  const controller = new AuditAdminController(audit as never);
  try {
    await controller.list(principal(['operator']), {
      entityType: 'destination',
      entityId: 'a1111111-1111-1111-1111-111111111111',
    });
    assert.fail('expected forbidden');
  } catch (err) {
    assert.ok(err instanceof AppException);
    assert.equal(err.code, 'FORBIDDEN');
  }
});

test('fallback roles fail closed for audit list', async () => {
  const audit = {
    listByEntity: async () => {
      throw new Error('should not list');
    },
  };
  const controller = new AuditAdminController(audit as never);
  try {
    await controller.list(principal(['administrator'], 'fallback'), {
      entityType: 'destination',
      entityId: 'a1111111-1111-1111-1111-111111111111',
    });
    assert.fail('expected forbidden');
  } catch (err) {
    assert.ok(err instanceof AppException);
    assert.equal(err.code, 'FORBIDDEN');
  }
});

test('administrator can list audit events', async () => {
  const audit = {
    listByEntity: async () => ({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    }),
  };
  const controller = new AuditAdminController(audit as never);
  const result = await controller.list(principal(['administrator']), {
    entityType: 'destination',
    entityId: 'a1111111-1111-1111-1111-111111111111',
  });
  assert.equal(result.total, 0);
});

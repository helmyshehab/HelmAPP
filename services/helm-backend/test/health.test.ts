import assert from 'node:assert/strict';
import test from 'node:test';
import { HealthController } from '../src/common/health.controller';

test('health returns ok', () => {
  const controller = new HealthController();
  const result = controller.getHealth();
  assert.equal(result.status, 'ok');
  assert.equal(result.service, 'helm-backend');
});

test('meta returns Helm brand', () => {
  const controller = new HealthController();
  const result = controller.getMeta();
  assert.equal(result.name, 'Helm حلم');
  assert.equal(result.apiVersion, 'v1');
});

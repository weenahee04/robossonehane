import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQrPayload } from '../src/services/wash-flow.js';
import { normalizeProviderStatus } from '../src/services/payment-flow.js';

test('parseQrPayload supports app URI format', () => {
  assert.deepEqual(parseQrPayload('roboss://branch-01/machine-09'), {
    branchId: 'branch-01',
    machineId: 'machine-09',
  });
});

test('parseQrPayload supports legacy delimited format', () => {
  assert.deepEqual(parseQrPayload('roboss|branch-01|machine-09'), {
    branchId: 'branch-01',
    machineId: 'machine-09',
  });
});

test('parseQrPayload supports JSON format', () => {
  assert.deepEqual(parseQrPayload('{"branchId":"branch-01","machineId":"machine-09"}'), {
    branchId: 'branch-01',
    machineId: 'machine-09',
  });
});

test('parseQrPayload rejects invalid payloads', () => {
  assert.equal(parseQrPayload('hello-world'), null);
});

test('normalizeProviderStatus maps common provider variants', () => {
  assert.equal(normalizeProviderStatus('success'), 'confirmed');
  assert.equal(normalizeProviderStatus('declined'), 'failed');
  assert.equal(normalizeProviderStatus('canceled'), 'cancelled');
  assert.equal(normalizeProviderStatus('timeout'), 'expired');
  assert.equal(normalizeProviderStatus('unknown'), 'pending');
});

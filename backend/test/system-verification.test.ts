import test from 'node:test';
import assert from 'node:assert/strict';
import { runSystemVerification } from './helpers/system-verification.ts';

test('ROBOSS system verification covers customer, admin, payment, machine, and data flows', async () => {
  const result = await runSystemVerification();

  const failedSteps = result.steps.filter((step) => !step.passed);
  assert.equal(
    failedSteps.length,
    0,
    `Failed verification steps: ${failedSteps.map((step) => `${step.name} (${step.detail})`).join('; ')}`
  );
});

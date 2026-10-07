import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_TIERS, nextTierUp, topTier, VERIFY_RATE } from '../public/models.mjs';
import { cheapestSufficientTier, verifyAttempt, runTask, POLICIES } from '../public/router.mjs';

test('ladder is ordered cheapest-first with rising capability and cost', () => {
  assert.equal(MODEL_TIERS.length, 3);
  for (let i = 1; i < MODEL_TIERS.length; i++) {
    assert.ok(MODEL_TIERS[i].capability > MODEL_TIERS[i - 1].capability, 'capability rises');
    assert.ok(MODEL_TIERS[i].costPerUnit > MODEL_TIERS[i - 1].costPerUnit, 'cost rises');
  }
});

test('cheapestSufficientTier picks the lowest tier that can handle the work', () => {
  assert.equal(cheapestSufficientTier(1).id, 'volume');
  assert.equal(cheapestSufficientTier(2).id, 'volume');
  assert.equal(cheapestSufficientTier(3).id, 'balanced');
  assert.equal(cheapestSufficientTier(6).id, 'balanced');
  assert.equal(cheapestSufficientTier(7).id, 'judgment');
  assert.equal(cheapestSufficientTier(10).id, 'judgment');
  assert.equal(cheapestSufficientTier(11), null);
});

test('nextTierUp climbs the ladder and stops at the top', () => {
  assert.equal(nextTierUp(MODEL_TIERS[0]).id, 'balanced');
  assert.equal(nextTierUp(MODEL_TIERS[1]).id, 'judgment');
  assert.equal(nextTierUp(topTier()), null);
});

test('verifyAttempt passes only when capability covers the TRUE difficulty', () => {
  const tricky = { trueDifficulty: 8 };
  assert.equal(verifyAttempt(tricky, MODEL_TIERS[0]), false);
  assert.equal(verifyAttempt(tricky, MODEL_TIERS[1]), false);
  assert.equal(verifyAttempt(tricky, MODEL_TIERS[2]), true);
});

test('routed-verified starts cheap and escalates one tier per failed self-check', () => {
  const task = { id: 'x', name: 'underestimated', estimatedDifficulty: 2, trueDifficulty: 9, units: 5 };
  const tr = runTask(task, 'routed-verified');
  assert.deepEqual(tr.attempts.map(a => a.tier), ['volume', 'balanced', 'judgment']);
  assert.deepEqual(tr.attempts.map(a => a.verified), [false, false, true]);
  assert.equal(tr.escalations, 2);
  assert.equal(tr.outcome, 'verified');
});

test('correct estimates verify on the first attempt — no wasted escalation', () => {
  const task = { id: 'y', name: 'easy', estimatedDifficulty: 2, trueDifficulty: 2, units: 3 };
  const tr = runTask(task, 'routed-verified');
  assert.equal(tr.attempts.length, 1);
  assert.equal(tr.attempts[0].tier, 'volume');
  assert.equal(tr.outcome, 'verified');
});

test('a task beyond the whole ladder burns every tier and reports exhausted', () => {
  const task = { id: 'z', name: 'impossible', estimatedDifficulty: 1, trueDifficulty: 11, units: 2 };
  const tr = runTask(task, 'routed-verified');
  assert.equal(tr.attempts.length, 3);
  assert.equal(tr.outcome, 'exhausted');
});

test('always-flagship uses the top tier once; cheapest-unverified never checks', () => {
  const task = { id: 'w', name: 'hard', estimatedDifficulty: 1, trueDifficulty: 9, units: 4 };
  const flag = runTask(task, 'always-flagship');
  assert.deepEqual(flag.attempts.map(a => a.tier), ['judgment']);
  assert.equal(flag.outcome, 'verified');
  const cheap = runTask(task, 'cheapest-unverified');
  assert.deepEqual(cheap.attempts.map(a => a.tier), ['volume']);
  assert.equal(cheap.attempts[0].verified, null);
  assert.equal(cheap.outcome, 'accepted-wrong');
});

test('verification is priced as a fraction of a volume attempt', () => {
  const task = { id: 'v', name: 'priced', estimatedDifficulty: 1, trueDifficulty: 1, units: 10 };
  const tr = runTask(task, 'routed-verified');
  assert.equal(tr.attempts[0].cost, 10); // volume: 1 × 10 units
  assert.equal(tr.attempts[0].verifyCost, +(VERIFY_RATE * 10).toFixed(2));
});

test('all three policies exist with labels', () => {
  assert.deepEqual(Object.keys(POLICIES), ['routed-verified', 'always-flagship', 'cheapest-unverified']);
});

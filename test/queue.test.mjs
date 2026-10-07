import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runQueue } from '../public/router.mjs';
import { MIXED_WORKLOAD, MISJUDGED_WORKLOAD, WORKLOADS } from '../public/workload.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('embedded workloads match the example files on disk', async () => {
  const norm = s => JSON.stringify(JSON.parse(s.replace(/\r\n/g, '\n')));
  const mixed = norm(await readFile(`${root}examples/mixed-workload.json`, 'utf8'));
  const misjudged = norm(await readFile(`${root}examples/misjudged-workload.json`, 'utf8'));
  assert.equal(JSON.stringify(MIXED_WORKLOAD), mixed);
  assert.equal(JSON.stringify(MISJUDGED_WORKLOAD), misjudged);
  assert.equal(WORKLOADS.length, 2);
});

test('routed+verified matches flagship correctness on every workload', () => {
  for (const w of WORKLOADS) {
    const routed = runQueue(w.tasks, 'routed-verified').ledger;
    const flagship = runQueue(w.tasks, 'always-flagship').ledger;
    assert.equal(routed.verifiedCorrect, flagship.verifiedCorrect, `${w.name}: correctness`);
    assert.equal(routed.acceptedWrong, 0);
    assert.equal(routed.exhausted, 0);
  }
});

test('with a decent estimator, routed+verified is much cheaper than flagship', () => {
  const routed = runQueue(MIXED_WORKLOAD.tasks, 'routed-verified').ledger;
  const flagship = runQueue(MIXED_WORKLOAD.tasks, 'always-flagship').ledger;
  assert.ok(routed.totalCost < flagship.totalCost * 0.75, 'routed saves >25% on a realistic queue');
});

test('a systematically wrong estimator makes retries cost more than flagship — the honest trade', () => {
  // Every misjudged task ends up needing the top tier anyway; cheap-first
  // routing burns the failed attempts on the way up. Correctness still
  // matches — the estimator is where the savings live, verification is the floor.
  const routed = runQueue(MISJUDGED_WORKLOAD.tasks, 'routed-verified').ledger;
  const flagship = runQueue(MISJUDGED_WORKLOAD.tasks, 'always-flagship').ledger;
  assert.equal(routed.verifiedCorrect, flagship.verifiedCorrect);
  assert.ok(routed.totalCost > flagship.totalCost, 'retry burn exceeds flagship spend when every estimate is wrong');
  // ...but it is bounded: the overhead is the burned cheap attempts, not a blowup.
  assert.ok(routed.totalCost < flagship.totalCost * 1.5);
});

test('cheapest-unverified ships wrong answers it never checked', () => {
  const mixed = runQueue(MIXED_WORKLOAD.tasks, 'cheapest-unverified').ledger;
  assert.ok(mixed.acceptedWrong > 0, 'mixed workload accepts wrong answers');
  const misjudged = runQueue(MISJUDGED_WORKLOAD.tasks, 'cheapest-unverified').ledger;
  assert.equal(misjudged.verifiedCorrect, 0, 'every misjudged task lands wrong');
  assert.equal(misjudged.acceptedWrong, MISJUDGED_WORKLOAD.tasks.length);
  // It also bills nothing for verification — the savings are the hazard.
  assert.equal(mixed.verifyCost, 0);
});

test('the misjudged workload forces escalations but still verifies every task', () => {
  const { traces, ledger } = runQueue(MISJUDGED_WORKLOAD.tasks, 'routed-verified');
  assert.ok(ledger.escalations >= MISJUDGED_WORKLOAD.tasks.length, 'every task escalates at least once');
  assert.equal(ledger.verifiedCorrect, MISJUDGED_WORKLOAD.tasks.length);
  for (const tr of traces) assert.equal(tr.outcome, 'verified');
});

test('ledger cost accounting: total = model + verify, attempts counted', () => {
  const { traces, ledger } = runQueue(MIXED_WORKLOAD.tasks, 'routed-verified');
  const model = traces.flatMap(t => t.attempts).reduce((s, a) => s + a.cost, 0);
  const verify = traces.flatMap(t => t.attempts).reduce((s, a) => s + a.verifyCost, 0);
  assert.equal(ledger.modelCost, +model.toFixed(2));
  assert.equal(ledger.verifyCost, +verify.toFixed(2));
  assert.equal(ledger.totalCost, +(model + verify).toFixed(2));
  assert.equal(ledger.attempts, traces.reduce((s, t) => s + t.attempts.length, 0));
  assert.equal(ledger.tasks, MIXED_WORKLOAD.tasks.length);
});

test('the two underestimated tasks in the mixed workload are the ones that escalate', () => {
  const { traces } = runQueue(MIXED_WORKLOAD.tasks, 'routed-verified');
  const escalated = traces.filter(t => t.escalations > 0).map(t => t.task).sort();
  assert.deepEqual(escalated, ['t09', 't10']);
});

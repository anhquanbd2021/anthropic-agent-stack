// Tier Router core: route each task to the cheapest sufficient model,
// verify the attempt, escalate one tier when verification fails.
// Deterministic by design — a task fails verification on a tier whose
// capability is below the task's TRUE difficulty. Estimates can be wrong;
// verification is what catches the miss.
import { MODEL_TIERS, VERIFY_RATE, nextTierUp } from './models.mjs';

export const POLICIES = {
  'routed-verified': {
    label: 'Routed + verified',
    blurb: 'Cheapest sufficient tier from the estimate; verify; escalate on fail.',
  },
  'always-flagship': {
    label: 'Always flagship',
    blurb: 'Every task on the judgment tier, verified. Correct, and priced like it.',
  },
  'cheapest-unverified': {
    label: 'Cheapest, unverified',
    blurb: 'Volume tier for everything, no self-check. Cheap, and quietly wrong.',
  },
};

// Cheapest tier whose capability can handle `difficulty` — null if none can.
export function cheapestSufficientTier(difficulty, tiers = MODEL_TIERS) {
  return tiers.find(t => t.capability >= difficulty) ?? null;
}

// A self-check only catches mistakes the tier could have avoided. If the
// model lacked the capability to do the task, its output fails review.
export function verifyAttempt(task, tier) {
  return tier.capability >= task.trueDifficulty;
}

function attemptCost(task, tier) {
  return tier.costPerUnit * task.units;
}

function verifyCost(task) {
  return +(VERIFY_RATE * task.units).toFixed(2);
}

// Run one task under a policy. Returns a trace the UI, CLI, and tests share.
export function runTask(task, policyId) {
  const trace = { task: task.id, name: task.name, policy: policyId, attempts: [], escalations: 0 };

  if (policyId === 'always-flagship') {
    const tier = MODEL_TIERS[MODEL_TIERS.length - 1];
    const passed = verifyAttempt(task, tier);
    trace.attempts.push({ tier: tier.id, cost: attemptCost(task, tier), verifyCost: verifyCost(task), verified: passed });
    trace.outcome = passed ? 'verified' : 'exhausted';
    return trace;
  }

  if (policyId === 'cheapest-unverified') {
    const tier = MODEL_TIERS[0];
    trace.attempts.push({ tier: tier.id, cost: attemptCost(task, tier), verifyCost: 0, verified: null });
    trace.outcome = tier.capability >= task.trueDifficulty ? 'accepted-correct' : 'accepted-wrong';
    return trace;
  }

  // routed-verified: start at the cheapest tier the ESTIMATE allows.
  let tier = cheapestSufficientTier(task.estimatedDifficulty);
  if (!tier) {
    trace.outcome = 'unroutable';
    return trace;
  }
  while (tier) {
    const passed = verifyAttempt(task, tier);
    trace.attempts.push({ tier: tier.id, cost: attemptCost(task, tier), verifyCost: verifyCost(task), verified: passed });
    if (passed) {
      trace.outcome = 'verified';
      return trace;
    }
    const up = nextTierUp(tier);
    if (up) trace.escalations += 1;
    tier = up;
  }
  trace.outcome = 'exhausted'; // burned the whole ladder, still not verified
  return trace;
}

// Run a workload under a policy and keep the books.
export function runQueue(tasks, policyId) {
  const traces = tasks.map(t => runTask(t, policyId));
  const ledger = {
    policy: policyId,
    tasks: traces.length,
    attempts: 0,
    escalations: 0,
    verifiedCorrect: 0,
    acceptedWrong: 0,
    exhausted: 0,
    unroutable: 0,
    modelCost: 0,
    verifyCost: 0,
    totalCost: 0,
  };
  for (const tr of traces) {
    ledger.escalations += tr.escalations;
    for (const a of tr.attempts) {
      ledger.attempts += 1;
      ledger.modelCost += a.cost;
      ledger.verifyCost += a.verifyCost;
    }
    if (tr.outcome === 'verified' || tr.outcome === 'accepted-correct') ledger.verifiedCorrect += 1;
    else if (tr.outcome === 'accepted-wrong') ledger.acceptedWrong += 1;
    else if (tr.outcome === 'exhausted') ledger.exhausted += 1;
    else ledger.unroutable += 1;
  }
  ledger.modelCost = +ledger.modelCost.toFixed(2);
  ledger.verifyCost = +ledger.verifyCost.toFixed(2);
  ledger.totalCost = +(ledger.modelCost + ledger.verifyCost).toFixed(2);
  ledger.correctRate = ledger.tasks ? +((ledger.verifiedCorrect / ledger.tasks) * 100).toFixed(1) : 0;
  return { traces, ledger };
}

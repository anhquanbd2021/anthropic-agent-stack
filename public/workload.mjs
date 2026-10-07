// Embedded copies of examples/*.json so the browser, CLI, and tests all run
// the same fixtures without filesystem access. The deployment test asserts
// these stay in sync with the files on disk.
export const MIXED_WORKLOAD = {
  name: 'mixed-workload',
  description: 'A realistic support-ops queue: mostly routine work, a few genuinely hard tickets, two tasks the estimator gets wrong.',
  tasks: [
    { id: 't01', name: 'Tag inbound emails by topic', estimatedDifficulty: 1, trueDifficulty: 1, units: 4 },
    { id: 't02', name: 'Reformat CSV exports to JSON', estimatedDifficulty: 1, trueDifficulty: 2, units: 6 },
    { id: 't03', name: 'Draft reply: standard refund policy', estimatedDifficulty: 2, trueDifficulty: 2, units: 3 },
    { id: 't04', name: 'Summarize 40-page contract for sales', estimatedDifficulty: 4, trueDifficulty: 5, units: 8 },
    { id: 't05', name: 'Classify churn-risk accounts', estimatedDifficulty: 3, trueDifficulty: 4, units: 5 },
    { id: 't06', name: 'Migrate webhook handler to v3 API', estimatedDifficulty: 5, trueDifficulty: 6, units: 7 },
    { id: 't07', name: 'Decide disputed refund edge case', estimatedDifficulty: 7, trueDifficulty: 8, units: 4 },
    { id: 't08', name: 'Trace intermittent data-corruption bug', estimatedDifficulty: 8, trueDifficulty: 9, units: 9 },
    { id: 't09', name: '"Simple" billing fix (actually a race)', estimatedDifficulty: 2, trueDifficulty: 7, units: 5 },
    { id: 't10', name: '"Routine" report (regulatory nuance)', estimatedDifficulty: 3, trueDifficulty: 9, units: 6 },
  ],
};

export const MISJUDGED_WORKLOAD = {
  name: 'misjudged-workload',
  description: "The estimator's bad week: every task looks easy and isn't. Cheap-first routing plus verification still lands them — one escalation at a time.",
  tasks: [
    { id: 'm01', name: '"Just dedupe the list" (locale collation)', estimatedDifficulty: 1, trueDifficulty: 5, units: 4 },
    { id: 'm02', name: '"Copy the cron job" (timezone semantics)', estimatedDifficulty: 1, trueDifficulty: 6, units: 5 },
    { id: 'm03', name: '"Rename the field" (schema migration)', estimatedDifficulty: 2, trueDifficulty: 8, units: 6 },
    { id: 'm04', name: '"Summarize the thread" (legal privilege)', estimatedDifficulty: 2, trueDifficulty: 7, units: 3 },
    { id: 'm05', name: '"Patch the regex" (ReDoS lurking)', estimatedDifficulty: 1, trueDifficulty: 9, units: 4 },
    { id: 'm06', name: '"Retry the payment" (idempotency)', estimatedDifficulty: 2, trueDifficulty: 8, units: 7 },
  ],
};

export const WORKLOADS = [MIXED_WORKLOAD, MISJUDGED_WORKLOAD];

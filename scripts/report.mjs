// Side-by-side report: same workloads, three routing policies.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { MODEL_TIERS } from '../public/models.mjs';
import { POLICIES, runQueue } from '../public/router.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const files = ['examples/mixed-workload.json', 'examples/misjudged-workload.json'];

console.log('Tier Router — policy report\n');
console.log('Ladder:');
for (const t of MODEL_TIERS) {
  console.log(`  ${t.id.padEnd(9)} ${t.analog.padEnd(13)} capability ${t.capability} · ${t.costPerUnit}u/unit`);
}

let bad = 0;
for (const file of files) {
  const workload = JSON.parse(await readFile(`${root}${file}`, 'utf8'));
  console.log(`\n== ${workload.name} — ${workload.tasks.length} tasks ==`);
  console.log(`${'policy'.padEnd(22)}${'cost'.padEnd(10)}${'attempts'.padEnd(10)}${'escal'.padEnd(7)}${'verified'.padEnd(10)}${'wrong'.padEnd(7)}correct%`);
  for (const pid of Object.keys(POLICIES)) {
    const { ledger: l } = runQueue(workload.tasks, pid);
    const wrong = l.acceptedWrong + l.exhausted + l.unroutable;
    console.log(
      `${POLICIES[pid].label.padEnd(22)}${`${l.totalCost}u`.padEnd(10)}${String(l.attempts).padEnd(10)}${String(l.escalations).padEnd(7)}${String(l.verifiedCorrect).padEnd(10)}${String(wrong).padEnd(7)}${l.correctRate}%`
    );
  }
  const routed = runQueue(workload.tasks, 'routed-verified');
  const flagged = routed.traces.filter(tr => tr.escalations > 0 || tr.outcome !== 'verified');
  if (flagged.length) {
    console.log('  escalations:');
    for (const tr of flagged) {
      console.log(`    ${tr.task} ${tr.name} — ${tr.attempts.map(a => `${a.tier}:${a.verified ? 'pass' : 'FAIL'}`).join(' → ')} (${tr.outcome})`);
    }
  }
  const cheap = runQueue(workload.tasks, 'cheapest-unverified').ledger;
  const flag = runQueue(workload.tasks, 'always-flagship').ledger;
  const rt = routed.ledger;
  const delta = flag.totalCost - rt.totalCost;
  const pct = Math.abs((100 - (rt.totalCost / flag.totalCost) * 100)).toFixed(0);
  console.log(delta >= 0
    ? `  routed+verified vs flagship: ${delta.toFixed(2)}u saved (${pct}% cheaper), verified-correct match: ${rt.verifiedCorrect === flag.verifiedCorrect}`
    : `  routed+verified vs flagship: ${(-delta).toFixed(2)}u MORE (${pct}% over — retry burn from bad estimates), verified-correct match: ${rt.verifiedCorrect === flag.verifiedCorrect}`);
  console.log(`  cheapest-unverified accepted wrong: ${cheap.acceptedWrong} task(s)`);
  if (rt.verifiedCorrect !== flag.verifiedCorrect) bad += 1;
}

if (bad) {
  console.error(`\n${bad} workload(s) where routed+verified did not match flagship correctness`);
  process.exit(1);
}
console.log('\nReport complete — routed+verified matched flagship correctness on every workload.');

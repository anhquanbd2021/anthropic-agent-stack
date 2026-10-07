import { MODEL_TIERS } from './models.mjs';
import { POLICIES, runQueue } from './router.mjs';
import { WORKLOADS } from './workload.mjs';

const $ = sel => document.querySelector(sel);
const workloadSel = $('#workload');
const policySel = $('#policy');
const traceEl = $('#trace');
const ledgerEl = $('#ledger');
const statusEl = $('#status');

for (const w of WORKLOADS) {
  const opt = document.createElement('option');
  opt.value = w.name;
  opt.textContent = `${w.name} (${w.tasks.length} tasks)`;
  workloadSel.append(opt);
}
for (const [id, p] of Object.entries(POLICIES)) {
  const opt = document.createElement('option');
  opt.value = id;
  opt.textContent = p.label;
  policySel.append(opt);
}
policySel.value = 'routed-verified';

function renderLadder() {
  const ladder = $('#ladder');
  ladder.replaceChildren();
  for (const t of MODEL_TIERS) {
    const li = document.createElement('li');
    li.className = `tier tier-${t.id}`;
    li.innerHTML = `<strong>${t.name}</strong> <span class="analog">${t.analog}</span>
      <span class="tier-stats">capability ≤ ${t.capability} · ${t.costPerUnit} cost/unit</span>
      <span class="muted">${t.blurb}</span>`;
    ladder.append(li);
  }
}

function describeWorkload() {
  const w = WORKLOADS.find(x => x.name === workloadSel.value);
  $('#workload-desc').textContent = w ? w.description : '';
}

function chip(text, cls) {
  const s = document.createElement('span');
  s.className = `chip ${cls}`;
  s.textContent = text;
  return s;
}

function renderTrace(result) {
  traceEl.replaceChildren();
  for (const tr of result.traces) {
    const task = WORKLOADS.flatMap(w => w.tasks).find(t => t.id === tr.task);
    const li = document.createElement('li');
    li.className = 'task';
    const head = document.createElement('div');
    head.className = 'task-head';
    head.append(chip(tr.name, 'task-name'));
    head.append(chip(`est ${task.estimatedDifficulty} · true ${task.trueDifficulty}`, 'diff'));
    li.append(head);
    const steps = document.createElement('div');
    steps.className = 'steps';
    tr.attempts.forEach((a, i) => {
      if (i > 0) steps.append(chip('escalate ↑', 'escalate'));
      const verdict = a.verified === null ? 'no check' : a.verified ? 'verified ✓' : 'self-check FAIL';
      steps.append(chip(`${a.tier} · ${a.cost}u · ${verdict}`, a.verified === false ? 'fail' : a.verified ? 'pass' : 'nocheck'));
    });
    li.append(steps);
    const out = document.createElement('div');
    out.className = `outcome outcome-${tr.outcome}`;
    out.textContent = {
      'verified': `verified on ${tr.attempts.at(-1).tier} — ${tr.escalations} escalation(s)`,
      'accepted-correct': 'accepted (correct, unchecked)',
      'accepted-wrong': 'ACCEPTED WRONG — shipped unverified',
      'exhausted': 'exhausted — whole ladder failed review',
      'unroutable': 'unroutable — estimate beyond the ladder',
    }[tr.outcome];
    li.append(out);
    traceEl.append(li);
  }
}

function renderLedger(workload) {
  const rows = Object.keys(POLICIES).map(pid => runQueue(workload.tasks, pid).ledger);
  ledgerEl.replaceChildren();
  const head = document.createElement('tr');
  for (const h of ['policy', 'cost', 'attempts', 'escalations', 'verified', 'wrong', 'correct %']) {
    const th = document.createElement('th');
    th.textContent = h;
    head.append(th);
  }
  ledgerEl.append(head);
  for (const l of rows) {
    const tr = document.createElement('tr');
    tr.dataset.policy = l.policy;
    const cells = [
      POLICIES[l.policy].label,
      `${l.totalCost}u (${l.modelCost}u model + ${l.verifyCost}u verify)`,
      l.attempts, l.escalations, l.verifiedCorrect,
      l.acceptedWrong + l.exhausted + l.unroutable,
      `${l.correctRate}%`,
    ];
    cells.forEach((c, i) => {
      const td = document.createElement(i === 0 ? 'th' : 'td');
      td.textContent = c;
      tr.append(td);
    });
    if (l.acceptedWrong > 0) tr.classList.add('danger-row');
    ledgerEl.append(tr);
  }
}

function run() {
  const workload = WORKLOADS.find(w => w.name === workloadSel.value);
  const policy = policySel.value;
  const result = runQueue(workload.tasks, policy);
  renderTrace(result);
  renderLedger(workload);
  const l = result.ledger;
  statusEl.textContent = `${POLICIES[policy].label}: ${l.totalCost}u · ${l.attempts} attempts · ${l.escalations} escalations · ${l.correctRate}% correct`;
}

renderLadder();
describeWorkload();
workloadSel.addEventListener('change', describeWorkload);
$('#run').addEventListener('click', run);
run();

# Tier Router — companion demo

Interactive lab for the article *The Anthropic Agent Stack: the Model Ladder
Is a Routing Table*. Run a task queue through a three-tier mock model ladder —
**volume** (Haiku-class), **balanced** (Sonnet-class), **judgment**
(Opus-class) — with a self-check after every attempt. Cheap-first routing,
verify-every-attempt, escalate-on-fail: the reliability layer made visible.

Zero dependencies — Node 20+ only. The tier ladder, router, and workload
fixtures are plain ES modules shared by the browser UI, the CLI report, and
the test suite.

## What it proves

- **Cheapest-sufficient routing**: every task starts at the lowest tier whose
  capability covers its *estimated* difficulty.
- **Verification catches misroutes**: the estimator is fallible; a self-check
  fails any attempt where `capability < trueDifficulty`, and the router
  escalates one tier per failure until it verifies or exhausts the ladder.
- **The economics**: routed+verified matches always-flagship correctness at a
  fraction of the cost — while cheapest-unverified quietly accepts wrong work.

## Run it

```text
npm start        # serve the lab on :3000
npm test         # routing + queue + server tests
npm run report   # side-by-side policy report on examples/
npm run check    # both
```

## Three policies, one ledger

| Policy | Behavior |
|---|---|
| **Routed + verified** | cheapest sufficient tier → verify → escalate on fail |
| **Always flagship** | judgment tier for everything, verified — correct at top prices |
| **Cheapest, unverified** | volume tier, no self-check — the `accepted-wrong` column lights up |

## Examples

- `examples/mixed-workload.json` — a realistic queue: mostly routine, two
  tasks (`t09`, `t10`) the estimator gets wrong. Watch them climb the ladder.
- `examples/misjudged-workload.json` — the estimator's bad week: every task
  looks easy and isn't. Routed+verified still lands all six (escalation works);
  cheapest-unverified accepts all six wrong. Note the ledger: with a
  systematically wrong estimator, retry burn makes routed+verified cost *more*
  than always-flagship — verification is the floor, the estimator is where
  the savings live.

## Honest limits

- Capabilities, difficulties, and costs are illustrative units — not real
  model prices, latencies, or benchmark scores.
- "Verification" is a deterministic capability check
  (`capability ≥ trueDifficulty`), not a real LLM evaluation; real verifiers
  have their own error rates and cost curve.
- Estimation error is seeded in the fixtures — a production router has to
  detect drift, not just absorb known-bad estimates.
- One-tier-at-a-time escalation is a policy choice; jumping straight to the
  top after a failed check trades cost for latency and is also defensible.

This is an educational demo, not production infrastructure — and not an
Anthropic product. Tier names map loosely to the Claude Haiku/Sonnet/Opus
ladder described in the article.

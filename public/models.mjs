// The model-tier ladder: capability vs cost, ordered cheapest first.
// Numbers are illustrative units, not real prices or benchmarks — the point
// is the *shape* of the trade-off, not the labels.
export const MODEL_TIERS = [
  {
    id: 'volume',
    name: 'Volume tier',
    analog: 'Haiku-class',
    capability: 2,
    costPerUnit: 1,
    blurb: 'Fastest and cheapest. Triages, formats, summarizes, classifies.',
  },
  {
    id: 'balanced',
    name: 'Balanced tier',
    analog: 'Sonnet-class',
    capability: 6,
    costPerUnit: 3,
    blurb: 'The workhorse. Drafts, transforms, handles most business logic.',
  },
  {
    id: 'judgment',
    name: 'Judgment tier',
    analog: 'Opus-class',
    capability: 10,
    costPerUnit: 8,
    blurb: 'Expensive and deliberate. Ambiguous calls, final review, hard coding.',
  },
];

// Verification isn't free — it costs a fraction of a volume-tier attempt.
export const VERIFY_RATE = 0.2;

export function tierById(id) {
  return MODEL_TIERS.find(t => t.id === id);
}

export function topTier() {
  return MODEL_TIERS[MODEL_TIERS.length - 1];
}

export function nextTierUp(tier) {
  const i = MODEL_TIERS.indexOf(tier);
  return i >= 0 && i < MODEL_TIERS.length - 1 ? MODEL_TIERS[i + 1] : null;
}

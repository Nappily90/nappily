/**
 * prediction.js
 * ─────────────────────────────────────────────────────────────
 * Nappily prediction engine — all logic in one JS file.
 *
 * Pipeline order (must run in this exact sequence):
 *   1. Base usage from age band
 *   2. + size adjustment          (additive)
 *   3. × nursery factor           (multiplicative — only when nursery provides)
 *   4. × transition multiplier    (multiplicative — accounts for better fit)
 *   5. × impact multiplier        (multiplicative — temporary, applied last)
 *   → floor at 1, round to 1 d.p. = dailyUsage
 *   → daysLeft = round(stock / dailyUsage)
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

export const IMPACT_EXPIRY_DAYS = 3;
export const MIN_DAILY_USAGE    = 1;

export const REMINDER_THRESHOLDS = { urgent: 3, soft: 10 };

// ─────────────────────────────────────────────────────────────
// Step 1 — Base daily usage by age band
// ─────────────────────────────────────────────────────────────

const AGE_USAGE_TABLE = [
  [2,        11],
  [5,        9],
  [8,        7],
  [12,       6],
  [18,       5],
  [Infinity, 4],
];

/**
 * Returns baseline nappies/day for a given age.
 * @param {number} ageMonths
 * @returns {number}
 */
export function getBaseUsage(ageMonths) {
  if (ageMonths < 0) throw new RangeError(`ageMonths must be ≥ 0, got ${ageMonths}`);
  return AGE_USAGE_TABLE.find(([max]) => ageMonths <= max)[1];
}

// ─────────────────────────────────────────────────────────────
// Step 2 — Size adjustment
// ─────────────────────────────────────────────────────────────

/**
 * Returns the usage delta for the current nappy size.
 * Smaller sizes → more changes; larger → fewer.
 * @param {number} size  1–6
 * @returns {number}  -1 | 0 | 1
 */
export function getSizeAdjustment(size) {
  if (size < 1 || size > 6) throw new RangeError(`size must be 1–6, got ${size}`);
  if (size <= 2) return 1;
  if (size <= 4) return 0;
  return -1;
}

// ─────────────────────────────────────────────────────────────
// Step 3 — Nursery factor
// ─────────────────────────────────────────────────────────────

/**
 * Returns the fraction of the week where the parent provides nappies.
 * Only reduces usage when nursery = true AND nurseryProvides = true.
 * @param {boolean} nursery
 * @param {number}  nurseryDays  1–5
 * @param {boolean} nurseryProvides
 * @returns {number}  0–1
 */
export function getNurseryFactor(nursery, nurseryDays, nurseryProvides) {
  if (!nursery || !nurseryProvides) return 1;
  if (nurseryDays < 1 || nurseryDays > 5) {
    throw new RangeError(`nurseryDays must be 1–5, got ${nurseryDays}`);
  }
  return (7 - nurseryDays) / 7;
}

// ─────────────────────────────────────────────────────────────
// Step 4a — Expected size from age (transition detection only)
// ─────────────────────────────────────────────────────────────

const EXPECTED_SIZE_TABLE = [
  [1,        1],
  [3,        2],
  [6,        3],
  [10,       4],
  [14,       5],
  [Infinity, 6],
];

/**
 * Age-to-expected-size mapping. Used only for transition scoring.
 * @param {number} ageMonths
 * @returns {number}  1–6
 */
export function getExpectedSize(ageMonths) {
  return EXPECTED_SIZE_TABLE.find(([max]) => ageMonths <= max)[1];
}

// ─────────────────────────────────────────────────────────────
// Step 4b — Size transition scoring
// ─────────────────────────────────────────────────────────────

const SIZE_BANDS = {
  1: { startAge: 0,  buffer: 0.5 },
  2: { startAge: 1,  buffer: 0.5 },
  3: { startAge: 3,  buffer: 1   },
  4: { startAge: 6,  buffer: 1   },
  5: { startAge: 9,  buffer: 1   },
  6: { startAge: 12, buffer: 1.5 },
};

/**
 * Scores and classifies size transition readiness.
 *
 * Score → state:
 *   < 30  → STABLE
 *   30–59 → WATCH
 *   ≥ 60  → SIZE_UP_SOON
 *
 * Safety rules enforced:
 *   - Never suggest if currentSize ≥ expectedSize + 1
 *   - Never suggest beyond size 6
 *   - suggestedSize is always exactly currentSize + 1
 *
 * @param {number} ageMonths
 * @param {number} currentSize  1–6
 * @param {'fits'|'tight'|'not-sure'} fitStatus
 * @returns {{ state: string, score: number, expectedSize: number, suggestedSize: number|null }}
 */
export function getSizeTransition(ageMonths, currentSize, fitStatus = 'not-sure') {
  const expectedSize = getExpectedSize(ageMonths);

  // Safety guardrails
  if (currentSize >= 6 || currentSize >= expectedSize + 1) {
    return { state: 'STABLE', score: 0, expectedSize, suggestedSize: null };
  }

  const sizeGap     = expectedSize - currentSize;
  const band        = SIZE_BANDS[Math.min(expectedSize, 6)];
  const ageIntoBand = ageMonths - band.startAge;
  const inBufferZone = ageIntoBand >= band.buffer;

  let score = 0;
  if (sizeGap >= 1)     score += 40;
  if (sizeGap >= 2)     score += 60;
  if (ageIntoBand >= 0) score += 20;
  if (ageIntoBand >= 2) score += 30;
  if (inBufferZone)     score += 10;
  if (fitStatus === 'tight') score += 30;
  if (fitStatus === 'fits')  score -= 10;
  score = Math.max(0, Math.min(100, score));

  const state =
    score >= 60 ? 'SIZE_UP_SOON' :
    score >= 30 ? 'WATCH' :
    'STABLE';

  const suggestedSize = state !== 'STABLE' ? currentSize + 1 : null;

  return { state, score, expectedSize, suggestedSize };
}

// ─────────────────────────────────────────────────────────────
// Step 4c — Transition usage multiplier
// ─────────────────────────────────────────────────────────────

/**
 * A better-fitting nappy reduces unnecessary changes.
 * @param {'STABLE'|'WATCH'|'SIZE_UP_SOON'} state
 * @returns {number}
 */
export function getTransitionMultiplier(state) {
  return { STABLE: 1.0, WATCH: 0.95, SIZE_UP_SOON: 0.90 }[state] ?? 1.0;
}

// ─────────────────────────────────────────────────────────────
// Step 5 — Temporary impact adjustment
// ─────────────────────────────────────────────────────────────

/**
 * Returns true if the impact setting is still within its active window.
 * @param {string|undefined} impactSetAt  ISO 8601 string
 * @returns {boolean}
 */
export function isImpactActive(impactSetAt) {
  if (!impactSetAt) return false;
  const setAt = new Date(impactSetAt);
  if (isNaN(setAt.getTime())) return false;
  const daysSince = (Date.now() - setAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= IMPACT_EXPIRY_DAYS;
}

const IMPACT_MULTIPLIERS = {
  normal: 1.000,
  more:   1.125,
  fewer:  0.850,
  tummy:  1.300,
};

/**
 * Returns the temporary impact multiplier.
 * Auto-expires after IMPACT_EXPIRY_DAYS — returns 1.0 if expired or not set.
 * Applied last in the pipeline.
 * @param {'normal'|'more'|'fewer'|'tummy'} impact
 * @param {string|undefined} impactSetAt  ISO 8601 string
 * @returns {number}
 */
export function getImpactMultiplier(impact = 'normal', impactSetAt) {
  if (!isImpactActive(impactSetAt)) return 1.0;
  return IMPACT_MULTIPLIERS[impact] ?? 1.0;
}

// ─────────────────────────────────────────────────────────────
// Confidence
// ─────────────────────────────────────────────────────────────

/**
 * @param {number}  stockUpdates
 * @param {boolean} hasFitFeedback
 * @returns {'Low'|'Medium'|'High'}
 */
export function getConfidence(stockUpdates, hasFitFeedback) {
  if (stockUpdates >= 2 || hasFitFeedback) return 'High';
  if (stockUpdates >= 1)                   return 'Medium';
  return 'Low';
}

// ─────────────────────────────────────────────────────────────
// Reminder level
// ─────────────────────────────────────────────────────────────

/**
 * @param {number} daysLeft
 * @returns {{ label: string, level: 'green'|'amber'|'red' }}
 */
export function getReminderStatus(daysLeft) {
  if (daysLeft <= REMINDER_THRESHOLDS.urgent) {
    return { label: 'Almost out — buy now',           level: 'red'   };
  }
  if (daysLeft <= REMINDER_THRESHOLDS.soft) {
    return { label: 'Running low — reminder active',  level: 'amber' };
  }
  return { label: `Reminder planned in about ${daysLeft} days`, level: 'green' };
}

// ─────────────────────────────────────────────────────────────
// Retailers (mock)
// ─────────────────────────────────────────────────────────────

export function getRetailers(size) {
  return [
    { name: 'Amazon', pack: 'Pampers Baby-Dry', size: `Size ${size}`, count: 84, total: 22.99 },
    { name: 'Boots',  pack: 'Boots Own',        size: `Size ${size}`, count: 62, total: 18.50 },
  ];
}

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────

/**
 * Validates form input before running the pipeline.
 * Returns all errors at once so a form can show them together.
 * @param {object} input
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string}> }}
 */
export function validateInput(input) {
  const errors = [];

  if (input.ageMonths === '' || input.ageMonths === null || input.ageMonths === undefined) {
    errors.push({ field: 'ageMonths', message: "Baby's age is required" });
  } else if (!Number.isFinite(Number(input.ageMonths)) || Number(input.ageMonths) < 0) {
    errors.push({ field: 'ageMonths', message: 'Age must be a positive number' });
  }

  if (!input.currentSize && !input.size) {
    errors.push({ field: 'currentSize', message: 'Current nappy size is required' });
  }

  if (input.stock === '' || input.stock === null || input.stock === undefined) {
    errors.push({ field: 'stock', message: 'Current stock count is required' });
  } else if (!Number.isFinite(Number(input.stock)) || Number(input.stock) < 0) {
    errors.push({ field: 'stock', message: 'Stock must be 0 or more' });
  }

  if (input.nursery === true) {
    const days = input.nurseryDays;
    if (!days || days < 1 || days > 5) {
      errors.push({ field: 'nurseryDays', message: 'Nursery days must be between 1 and 5' });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────
// Rounding utility
// ─────────────────────────────────────────────────────────────

/**
 * Rounds to n decimal places — prevents float artifacts.
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
export function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ─────────────────────────────────────────────────────────────
// Main pipeline
// ─────────────────────────────────────────────────────────────

/**
 * Runs the full prediction pipeline.
 *
 * Accepts the app's form object directly (uses both `.size` and `.currentSize`
 * for backwards compatibility with both naming conventions).
 *
 * @param {object} form
 * @returns {{
 *   usage: number,
 *   daysLeft: number,
 *   impactActive: boolean,
 *   transition: object,
 *   breakdown: object
 * }}
 */
export function calcPrediction(form) {
  const size       = form.currentSize ?? form.size;
  const fitStatus  = form.fitStatus  ?? 'not-sure';
  const impact     = form.impact     ?? 'normal';
  const impactSetAt = form.impactSetAt;
  const nurseryDays = form.nurseryDays ?? 0;

  // Step 1 + 2: base + size adjustment
  const baseUsage    = getBaseUsage(Number(form.ageMonths));
  const afterSizeAdj = baseUsage + getSizeAdjustment(size);

  // Step 3: nursery factor
  const nurseryFactor   = getNurseryFactor(form.nursery, nurseryDays, form.nurseryProvides ?? false);
  const afterNurseryAdj = afterSizeAdj * nurseryFactor;

  // Step 4: size transition assessment + multiplier
  const transition        = getSizeTransition(Number(form.ageMonths), size, fitStatus);
  const transitionMult    = getTransitionMultiplier(transition.state);
  const afterTransitionAdj = afterNurseryAdj * transitionMult;

  // Step 5: temporary impact — applied last
  const impactActive   = isImpactActive(impactSetAt);
  const impactMult     = getImpactMultiplier(impact, impactSetAt);
  const afterImpactAdj = afterTransitionAdj * impactMult;

  // Finalise
  const usage    = Math.max(MIN_DAILY_USAGE, roundTo(afterImpactAdj, 1));
  const daysLeft = Math.max(0, Math.round(Number(form.stock) / usage));

  return {
    usage,
    daysLeft,
    impactActive,
    transition,
    breakdown: {
      baseUsage,
      afterSizeAdj,
      afterNurseryAdj:    roundTo(afterNurseryAdj,    2),
      afterTransitionAdj: roundTo(afterTransitionAdj, 2),
      afterImpactAdj:     roundTo(afterImpactAdj,     2),
    },
  };
}

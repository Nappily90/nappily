/**
 * TestRunner.jsx
 * ─────────────────────────────────────────────────────────────
 * In-app prediction model test runner.
 * Accessible at the bottom of the landing page in dev, or via /?tests=true
 *
 * Runs the same assertions as prediction.test.ts, directly in the browser
 * against the live prediction.js module. No build step needed.
 */

import { useState, useEffect } from 'react';
import {
  getBaseUsage, getSizeAdjustment, getNurseryFactor, getExpectedSize,
  getSizeTransition, getTransitionMultiplier, isImpactActive, getImpactMultiplier,
  getConfidence, getReminderStatus, roundTo, validateInput, calcPrediction,
  IMPACT_EXPIRY_DAYS,
} from '../lib/prediction';
import Logo from './Logo';

// ─── Tiny assertion engine ───────────────────────────────────

function runTests() {
  const results = [];
  let section = '';

  const NOW     = new Date().toISOString();
  const FRESH   = new Date(Date.now() - 1  * 60 * 60 * 1000).toISOString();
  const DAY_OLD = new Date(Date.now() - 1  * 24 * 60 * 60 * 1000).toISOString();
  const EXPIRED = new Date(Date.now() - 4  * 24 * 60 * 60 * 1000).toISOString();

  function sec(name) { section = name; }

  function chk(label, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    results.push({ section, label, ok, actual, expected });
  }

  function approx(label, actual, expected, tol = 0.05) {
    const ok = typeof actual === 'number' && Math.abs(actual - expected) <= tol;
    results.push({ section, label, ok, actual, expected: `~${expected} ±${tol}` });
  }

  function throws(label, fn) {
    let ok = false;
    try { fn(); } catch { ok = true; }
    results.push({ section, label, ok, actual: ok ? 'threw' : 'did not throw', expected: 'throw' });
  }

  // ── getBaseUsage ────────────────────────────────────────────
  sec('getBaseUsage');
  chk('0m → 11',   getBaseUsage(0),  11);
  chk('2m → 11',   getBaseUsage(2),  11);
  chk('3m → 9',    getBaseUsage(3),  9);
  chk('5m → 9',    getBaseUsage(5),  9);
  chk('6m → 7',    getBaseUsage(6),  7);
  chk('8m → 7',    getBaseUsage(8),  7);
  chk('9m → 6',    getBaseUsage(9),  6);
  chk('12m → 6',   getBaseUsage(12), 6);
  chk('13m → 5',   getBaseUsage(13), 5);
  chk('18m → 5',   getBaseUsage(18), 5);
  chk('19m → 4',   getBaseUsage(19), 4);
  chk('36m → 4',   getBaseUsage(36), 4);
  throws('negative age throws', () => getBaseUsage(-1));

  // ── getSizeAdjustment ───────────────────────────────────────
  sec('getSizeAdjustment');
  chk('size 1 → +1', getSizeAdjustment(1),  1);
  chk('size 2 → +1', getSizeAdjustment(2),  1);
  chk('size 3 →  0', getSizeAdjustment(3),  0);
  chk('size 4 →  0', getSizeAdjustment(4),  0);
  chk('size 5 → -1', getSizeAdjustment(5), -1);
  chk('size 6 → -1', getSizeAdjustment(6), -1);
  throws('size 0 throws', () => getSizeAdjustment(0));
  throws('size 7 throws', () => getSizeAdjustment(7));

  // ── getNurseryFactor ────────────────────────────────────────
  sec('getNurseryFactor');
  chk('no nursery → 1.0',              getNurseryFactor(false, 0, false), 1);
  chk('nursery, no provides → 1.0',    getNurseryFactor(true,  3, false), 1);
  approx('3d/wk, provides → 4/7',      getNurseryFactor(true,  3, true),  4/7);
  approx('5d/wk, provides → 2/7',      getNurseryFactor(true,  5, true),  2/7);
  approx('1d/wk, provides → 6/7',      getNurseryFactor(true,  1, true),  6/7);
  throws('nursery 6 days throws',       () => getNurseryFactor(true, 6, true));

  // ── getExpectedSize ─────────────────────────────────────────
  sec('getExpectedSize');
  chk('0m → size 1',  getExpectedSize(0),  1);
  chk('1m → size 1',  getExpectedSize(1),  1);
  chk('2m → size 2',  getExpectedSize(2),  2);
  chk('4m → size 3',  getExpectedSize(4),  3);
  chk('7m → size 4',  getExpectedSize(7),  4);
  chk('11m → size 5', getExpectedSize(11), 5);
  chk('15m → size 6', getExpectedSize(15), 6);
  chk('24m → size 6', getExpectedSize(24), 6);

  // ── getSizeTransition ───────────────────────────────────────
  sec('getSizeTransition — safety');
  let r;
  r = getSizeTransition(24, 6, 'tight');
  chk('size 6 max → STABLE',       r.state, 'STABLE');
  chk('size 6 → no suggestion',    r.suggestedSize, null);

  r = getSizeTransition(3, 4, 'tight');
  chk('ahead of expected → STABLE', r.state, 'STABLE');
  chk('no suggestion when ahead',   r.suggestedSize, null);

  sec('getSizeTransition — STABLE');
  r = getSizeTransition(4, 3, 'fits');
  chk('4m size3 fits → STABLE',     r.state, 'STABLE');
  chk('score = 20',                  r.score, 20);
  chk('suggestedSize null',          r.suggestedSize, null);

  sec('getSizeTransition — WATCH');
  r = getSizeTransition(5, 3, 'fits');
  chk('5m size3 fits → WATCH',      r.state, 'WATCH');
  chk('score = 50',                  r.score, 50);
  chk('suggests size 4',             r.suggestedSize, 4);

  sec('getSizeTransition — SIZE_UP_SOON');
  r = getSizeTransition(8, 3, 'tight');
  chk('8m size3 tight → SIZE_UP_SOON', r.state, 'SIZE_UP_SOON');
  chk('score clamped at 100',           r.score, 100);
  chk('suggests size 4',                r.suggestedSize, 4);

  r = getSizeTransition(10, 2, 'tight');
  chk('never skips sizes',              r.suggestedSize === null || r.suggestedSize === 3, true);

  // ── getTransitionMultiplier ─────────────────────────────────
  sec('getTransitionMultiplier');
  chk('STABLE → 1.00',        getTransitionMultiplier('STABLE'),       1.00);
  chk('WATCH → 0.95',         getTransitionMultiplier('WATCH'),        0.95);
  chk('SIZE_UP_SOON → 0.90',  getTransitionMultiplier('SIZE_UP_SOON'), 0.90);

  // ── isImpactActive ──────────────────────────────────────────
  sec('isImpactActive');
  chk('no date → false',      isImpactActive(undefined), false);
  chk('now → true',           isImpactActive(NOW),       true);
  chk('1hr → true',           isImpactActive(FRESH),     true);
  chk('1d → true',            isImpactActive(DAY_OLD),   true);
  chk('4d → false (expired)', isImpactActive(EXPIRED),   false);
  chk('bad date → false',     isImpactActive('not-a-date'), false);

  // ── getImpactMultiplier ─────────────────────────────────────
  sec('getImpactMultiplier');
  chk('normal, active → 1.0',   getImpactMultiplier('normal', NOW),    1.000);
  chk('more, active → 1.125',   getImpactMultiplier('more',   NOW),    1.125);
  chk('fewer, active → 0.85',   getImpactMultiplier('fewer',  NOW),    0.850);
  chk('tummy, active → 1.3',    getImpactMultiplier('tummy',  NOW),    1.300);
  chk('tummy, expired → 1.0',   getImpactMultiplier('tummy',  EXPIRED), 1.0);
  chk('more, no date → 1.0',    getImpactMultiplier('more',   undefined), 1.0);

  // ── getConfidence ───────────────────────────────────────────
  sec('getConfidence');
  chk('0 updates, no feedback → Low',    getConfidence(0, false), 'Low');
  chk('1 update,  no feedback → Medium', getConfidence(1, false), 'Medium');
  chk('2 updates, no feedback → High',   getConfidence(2, false), 'High');
  chk('0 updates, fit feedback → High',  getConfidence(0, true),  'High');

  // ── getReminderStatus ───────────────────────────────────────
  sec('getReminderStatus');
  chk('15 days → green', getReminderStatus(15).level, 'green');
  chk('10 days → amber', getReminderStatus(10).level, 'amber');
  chk('4 days → amber',  getReminderStatus(4).level,  'amber');
  chk('3 days → red',    getReminderStatus(3).level,  'red');
  chk('0 days → red',    getReminderStatus(0).level,  'red');

  // ── roundTo ─────────────────────────────────────────────────
  sec('roundTo');
  chk('3.428 to 1dp → 3.4',   roundTo(3.428571, 1), 3.4);
  chk('3.428 to 2dp → 3.43',  roundTo(3.428571, 2), 3.43);
  chk('0.1+0.2 to 1dp → 0.3', roundTo(0.1 + 0.2, 1), 0.3);

  // ── validateInput ───────────────────────────────────────────
  sec('validateInput');
  chk('valid minimal → valid',
    validateInput({ ageMonths: 8, size: 3, nursery: false, stock: 60 }).valid, true);
  chk('empty → invalid',
    validateInput({}).valid, false);
  chk('negative age → invalid',
    validateInput({ ageMonths: -1, size: 3, nursery: false, stock: 60 }).valid, false);
  chk('negative stock → invalid',
    validateInput({ ageMonths: 8, size: 3, nursery: false, stock: -1 }).valid, false);
  chk('nursery=true no days → invalid',
    validateInput({ ageMonths: 8, size: 3, nursery: true, stock: 60 }).valid, false);

  // ── calcPrediction — pipeline ordering ─────────────────────
  sec('calcPrediction — pipeline ordering');
  const base = calcPrediction({ ageMonths: 10, size: 4, nursery: false, stock: 54 });
  chk('nursery adj ≤ size adj',
    base.breakdown.afterNurseryAdj <= base.breakdown.afterSizeAdj, true);
  chk('no impact → impact = transition',
    base.breakdown.afterImpactAdj, base.breakdown.afterTransitionAdj);
  approx('usage ≈ 5.4', base.usage, 5.4, 0.15);
  chk('daysLeft = 10', base.daysLeft, 10);

  sec('calcPrediction — impact applied last');
  const noImpact   = calcPrediction({ ageMonths: 6, size: 3, nursery: false, stock: 50 });
  const withTummy  = calcPrediction({ ageMonths: 6, size: 3, nursery: false, stock: 50, impact: 'tummy', impactSetAt: NOW });
  const ratio = withTummy.usage / noImpact.usage;
  approx('tummy × 1.3 applied to final usage', ratio, 1.3, 0.05);
  chk('impactActive = true when fresh', withTummy.impactActive, true);
  chk('afterImpact > afterTransition', withTummy.breakdown.afterImpactAdj > withTummy.breakdown.afterTransitionAdj, true);

  sec('calcPrediction — nursery provides gate');
  const withProv   = calcPrediction({ ageMonths: 10, size: 4, nursery: true,  nurseryDays: 3, nurseryProvides: true,  stock: 40 });
  const withoutProv= calcPrediction({ ageMonths: 10, size: 4, nursery: true,  nurseryDays: 3, nurseryProvides: false, stock: 40 });
  chk('provides → lower usage',  withProv.usage < withoutProv.usage, true);
  chk('no provides = no reduction', withoutProv.breakdown.afterNurseryAdj, withoutProv.breakdown.afterSizeAdj);

  // ── End-to-end scenarios ────────────────────────────────────
  sec('Scenario A — newborn, tiny stock');
  const sA = calcPrediction({ ageMonths: 1, size: 1, nursery: false, stock: 12 });
  chk('usage ≥ 11',       sA.usage >= 11, true);
  chk('daysLeft ≤ 2',     sA.daysLeft <= 2, true);
  chk('reminder = red',   getReminderStatus(sA.daysLeft).level, 'red');

  sec('Scenario B — nursery 3d/wk, provides');
  const sB = calcPrediction({ ageMonths: 10, size: 4, nursery: true, nurseryDays: 3, nurseryProvides: true, stock: 40 });
  approx('usage ≈ 3.1',         sB.usage, 3.1, 0.3);
  chk('transition = SIZE_UP_SOON', sB.transition.state, 'SIZE_UP_SOON');
  chk('suggests size 5',          sB.transition.suggestedSize, 5);

  sec('Scenario C — tummy bug, nearly out');
  const sC = calcPrediction({ ageMonths: 6, size: 3, nursery: false, stock: 10, impact: 'tummy', impactSetAt: NOW });
  chk('impactActive = true', sC.impactActive, true);
  chk('usage ≥ 7',           sC.usage >= 7, true);
  chk('urgent reminder',     getReminderStatus(sC.daysLeft).level, 'red');

  sec('Scenario D — expired impact = normal');
  const sD_exp = calcPrediction({ ageMonths: 8, size: 3, nursery: false, stock: 60, impact: 'tummy', impactSetAt: EXPIRED });
  const sD_nor = calcPrediction({ ageMonths: 8, size: 3, nursery: false, stock: 60 });
  chk('expired impact = no impact', sD_exp.usage, sD_nor.usage);
  chk('impactActive = false',       sD_exp.impactActive, false);

  sec('Scenario E — zero stock');
  const sE = calcPrediction({ ageMonths: 12, size: 5, nursery: false, stock: 0 });
  chk('daysLeft = 0', sE.daysLeft, 0);
  chk('usage ≥ 1',    sE.usage >= 1, true);

  return results;
}

// ─── UI ──────────────────────────────────────────────────────

export default function TestRunner({ onBack }) {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setRunning(true);
    // Tiny delay so the loading state renders
    setTimeout(() => {
      try {
        setResults(runTests());
      } catch (e) {
        setResults([{
          section: 'Runner error',
          label:   e.message,
          ok:      false,
          actual:  'exception',
          expected:'no exception',
        }]);
      }
      setRunning(false);
    }, 50);
  }, []);

  const passed = results?.filter(r => r.ok).length ?? 0;
  const failed = results?.filter(r => !r.ok).length ?? 0;
  const total  = results?.length ?? 0;

  // Group results by section
  const sections = results ? Object.entries(
    results.reduce((acc, r) => {
      if (!acc[r.section]) acc[r.section] = [];
      acc[r.section].push(r);
      return acc;
    }, {})
  ) : [];

  const allPassed = failed === 0 && total > 0;

  return (
    <div className="fade-in min-h-screen px-5 pt-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-xl text-cream-400 bg-none border-none cursor-pointer px-0"
        >←</button>
        <Logo />
      </div>

      <h2 className="font-serif text-[28px] mb-1">Prediction model tests</h2>
      <p className="text-cream-400 text-sm mb-6">
        Running live against <code className="bg-cream-100 px-1.5 py-0.5 rounded text-[12px]">prediction.js</code> in the browser.
      </p>

      {/* Summary bar */}
      {running && (
        <div className="card flex items-center gap-3 mb-4">
          <div className="w-4 h-4 rounded-full border-2 border-cream-300 border-t-cream-600 animate-spin" />
          <span className="text-sm text-cream-400">Running tests…</span>
        </div>
      )}

      {results && (
        <div className={`rounded-2xl p-4 mb-4 flex items-center justify-between ${
          allPassed ? 'bg-green-50' : 'bg-danger-50'
        }`}>
          <div>
            <p className={`text-base font-medium ${allPassed ? 'text-green-400' : 'text-danger-400'}`}>
              {allPassed ? `All ${total} tests passed` : `${failed} of ${total} tests failed`}
            </p>
            <p className={`text-sm mt-0.5 ${allPassed ? 'text-green-400' : 'text-danger-400'}`}
               style={{ opacity: 0.75 }}>
              {allPassed ? 'Prediction engine is working correctly.' : `${passed} passed · ${failed} failed`}
            </p>
          </div>
          <div className={`text-3xl font-serif ${allPassed ? 'text-green-400' : 'text-danger-400'}`}>
            {allPassed ? passed : failed}
          </div>
        </div>
      )}

      {/* Section-by-section results */}
      {sections.map(([sectionName, tests]) => {
        const sectionPassed = tests.every(t => t.ok);
        return (
          <div key={sectionName} className="card mb-3">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-medium">{sectionName}</p>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                sectionPassed ? 'bg-green-50 text-green-400' : 'bg-danger-50 text-danger-400'
              }`}>
                {tests.filter(t => t.ok).length}/{tests.length}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {tests.map((t, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 px-2.5 py-2 rounded-xl text-[13px] ${
                    t.ok ? 'bg-cream-100' : 'bg-danger-50'
                  }`}
                >
                  <span className={`mt-0.5 text-xs font-bold shrink-0 ${t.ok ? 'text-green-400' : 'text-danger-400'}`}>
                    {t.ok ? '✓' : '✗'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={t.ok ? 'text-cream-500' : 'text-cream-600 font-medium'}>
                      {t.label}
                    </span>
                    {!t.ok && (
                      <div className="mt-1 text-[11px] text-danger-400 font-mono leading-relaxed">
                        <span className="block">expected: {JSON.stringify(t.expected)}</span>
                        <span className="block">actual:   {JSON.stringify(t.actual)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {results && (
        <div className="text-center mt-6">
          <button className="btn-secondary !w-auto !px-8" onClick={onBack}>
            Back to app
          </button>
        </div>
      )}
    </div>
  );
}

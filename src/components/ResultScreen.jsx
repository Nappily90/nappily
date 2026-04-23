import { saveFeedback } from '../lib/feedback';
import { useDeals } from '../hooks/useDeals';
import Logo from './Logo';
import UrgencyBar from './UrgencyBar';
import ExpandSection from './ExpandSection';

const CONFIDENCE_PILL = {
  High:   'bg-green-50 text-green-400',
  Medium: 'bg-amber-50 text-amber-400',
  Low:    'bg-cream-100 text-cream-500',
};

const IMPACT_LABELS = {
  more:  'More changes than usual',
  fewer: 'Fewer wet nappies than usual',
  tummy: 'Tummy bug can mean more changes',
};
const IMPACT_DESC = {
  more:  "We've increased your estimate slightly for now.",
  fewer: "We've lowered your estimate slightly for now.",
  tummy: "We've temporarily increased your estimate.",
};

function DealCard({ deal }) {
  const isSearch = deal.isSearchLink || !deal.total;
  return (
    <a
      href={deal.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex justify-between items-center bg-cream-50 rounded-2xl border border-cream-200 p-4 mb-2 no-underline hover:border-cream-400 transition-all"
    >
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-[14px] font-medium text-cream-600 mb-0.5">{deal.retailer}</p>
        <p className="text-[12px] text-cream-400 truncate">{deal.pack}</p>
        {!isSearch && (
          <p className="text-[12px] text-cream-400">{deal.count} nappies · £{deal.pricePerNappy?.toFixed(2)}/nappy</p>
        )}
      </div>
      <div className="text-right shrink-0">
        {isSearch ? (
          <span className="text-[13px] text-cream-400 underline underline-offset-2">Search →</span>
        ) : (
          <>
            <p className="text-[18px] font-semibold text-cream-600 mb-1">£{deal.total?.toFixed(2)}</p>
            <span className="text-[12px] text-cream-400 underline underline-offset-2">View deal →</span>
          </>
        )}
      </div>
    </a>
  );
}

export default function ResultScreen({ form, pred, onUpdateStock, onDashboard, onFeedback, userId }) {
  const { usage, daysLeft, transition, confidence, reminder, impactActive, breakdown } = pred;
  const hasImpact = impactActive && form.impact && form.impact !== 'normal';

  const brandName = form.brand === 'Other'
    ? (form.otherBrand || 'nappies')
    : (form.brand || 'nappies');

  const { deals, loading: dealsLoading, error: dealsError, source } = useDeals(brandName, form.size);

  const transitionMsg = {
    STABLE:       'Current size looks right for now.',
    WATCH:        'You may need to size up soon.',
    SIZE_UP_SOON: `It's likely time to move to size ${transition.expectedSize + 1} for your next pack.`,
  }[transition.state];

  const detailRows = [
    ['Age',              `${form.ageMonths} months`],
    ['Brand',            brandName],
    ['Size',             `Size ${form.size}`],
    ['Nursery',          form.nursery ? `${form.nurseryDays}d/wk` : 'None'],
    ['Nursery nappies',  form.nursery ? (form.nurseryProvides ? 'Yes' : 'No') : 'N/A'],
    ['Stock',            `${form.stock} nappies`],
    ['Fit',              form.fitStatus || 'Not set'],
    ['Temp. adjustment', hasImpact ? form.impact : 'Normal'],
  ];

  return (
    <div className="fade-in px-5 pt-6" style={{ paddingBottom: '160px' }}>

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <Logo />
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${CONFIDENCE_PILL[confidence]}`}>
          {confidence} confidence
        </span>
      </div>

      <UrgencyBar label={reminder.label} level={reminder.level} />

      {/* Hero */}
      <div className="card mb-4">
        <p className="text-cream-400 text-[13px] mb-2">Days until you run out</p>
        <div className="hero-num mb-2">{daysLeft}</div>
        <p className="text-[13px] text-cream-400 leading-relaxed">
          Based on your baby's age, size {form.size},{' '}
          {form.nursery ? `${form.nurseryDays} days nursery` : 'no nursery'}, and {form.stock} nappies in stock.
        </p>
      </div>

      {/* Usage + stock */}
      <div className="card mb-4 flex gap-4 items-center">
        <div className="flex-1">
          <p className="text-cream-400 text-[13px] mb-1">Daily usage</p>
          <div className="stat-num">{usage}</div>
          <p className="text-[13px] text-cream-400 mt-1">nappies/day at home</p>
        </div>
        <div className="w-px self-stretch bg-cream-200" />
        <div className="flex-1 text-right">
          <p className="text-cream-400 text-[13px] mb-1">In stock</p>
          <div className="stat-num">{form.stock}</div>
          <p className="text-[13px] text-cream-400 mt-1">nappies left</p>
        </div>
      </div>

      {/* Size insight */}
      {transition.state !== 'STABLE' ? (
        <div className="card mb-4 border-l-[3px] border-amber-300">
          <p className="text-[13px] font-medium mb-1.5 text-amber-400">Size insight</p>
          <p className="text-[15px] leading-relaxed mb-2">{transitionMsg}</p>
          {transition.state === 'SIZE_UP_SOON' && (
            <p className="text-[13px] text-cream-400 leading-relaxed">
              Most babies around this age start moving to size {transition.expectedSize + 1}.
              If you notice leaks or a tighter fit, it may be time to size up.
            </p>
          )}
        </div>
      ) : (
        <div className="card-soft mb-4">
          <p className="text-sm font-medium mb-1">Size {form.size} · Stable</p>
          <p className="text-sm text-cream-400">{transitionMsg}</p>
        </div>
      )}

      {/* Temp impact */}
      {hasImpact && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-4">
          <p className="text-[13px] font-medium mb-1 text-amber-400">{IMPACT_LABELS[form.impact]}</p>
          <p className="text-sm leading-relaxed mb-2">{IMPACT_DESC[form.impact]}</p>
          <p className="text-[13px] text-cream-400">Resets automatically in a few days.</p>
          {form.impact === 'fewer' && (
            <p className="text-[12px] text-danger-400 mt-2 leading-relaxed">
              If you're worried about dehydration or your baby seems unwell, follow your usual medical advice.
            </p>
          )}
        </div>
      )}

      {/* How we worked it out */}
      <div className="card mb-4">
        <ExpandSection title="How we worked this out">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {detailRows.map(([k, v]) => (
              <div key={k} className="bg-cream-100 rounded-xl px-3 py-2">
                <p className="text-[11px] text-cream-400 mb-0.5">{k}</p>
                <p className="text-[13px] font-medium">{v}</p>
              </div>
            ))}
          </div>
          {breakdown && (
            <div className="border-t border-cream-200 pt-3">
              <p className="text-[11px] text-cream-400 mb-2 uppercase tracking-wide font-medium">Usage pipeline</p>
              {[
                ['Base usage',       breakdown.baseUsage],
                ['After size adj',   breakdown.afterSizeAdj],
                ['After nursery',    breakdown.afterNurseryAdj],
                ['After transition', breakdown.afterTransitionAdj],
                ['After impact',     breakdown.afterImpactAdj],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-[12px] py-1.5 border-b border-cream-100 last:border-0">
                  <span className="text-cream-400">{label}</span>
                  <span className="font-medium">{val}</span>
                </div>
              ))}
            </div>
          )}
        </ExpandSection>
      </div>

      {/* Live deals */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm font-medium">Best places to buy</p>
          <span className="text-[12px] text-cream-400">{brandName} · Size {form.size}</span>
        </div>

        {dealsLoading && (
          <div className="flex items-center gap-3 py-5">
            <div className="w-4 h-4 border-2 border-cream-200 border-t-cream-600 rounded-full animate-spin shrink-0" />
            <p className="text-[13px] text-cream-400">Searching for the best prices right now…</p>
          </div>
        )}

        {!dealsLoading && dealsError && (
          <div className="bg-cream-100 rounded-xl px-4 py-3 text-[13px] text-cream-400">
            {dealsError}
          </div>
        )}

        {!dealsLoading && deals && deals.map((deal, i) => (
          <DealCard key={i} deal={deal} />
        ))}

        <p className="text-[12px] text-cream-400 mt-3 leading-relaxed">
          {source === 'live'
            ? '✓ Live prices searched across Amazon, Boots, Asda, Aldi and Ocado.'
            : 'Prices are estimates — click View deal to see the latest price.'}
        </p>
      </div>

      {/* Feedback */}
      <div className="card-soft mb-4">
        <p className="text-[13px] font-medium mb-1">Does this feel accurate?</p>
        <p className="text-cream-400 text-[13px] mb-3">Your feedback improves future estimates.</p>
        <div className="flex gap-2">
          <button className="tag flex-1 text-center" onClick={() => { saveFeedback(userId, 'yes', null); onFeedback('yes'); }}>
            Looks right
          </button>
          <button className="tag flex-1 text-center" onClick={() => onFeedback('no')}>
            Not really
          </button>
        </div>
      </div>

      {/* Sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto px-5 pb-8 pt-5 bg-gradient-to-t from-[#FAF9F7] via-[#FAF9F7] to-transparent">
        <div className="flex flex-col gap-3">
          <button className="btn-primary" onClick={onDashboard}>Save this plan</button>
          <button className="btn-secondary" onClick={onUpdateStock}>Update my stock</button>
          <button className="btn-ghost mt-1 text-[13px]">This estimate feels off</button>
        </div>
      </div>
    </div>
  );
}

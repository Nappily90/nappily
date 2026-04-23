import ProgressHeader from './ProgressHeader';
import StepDots from './StepDots';

/**
 * Pack sizes by nappy size.
 * Used to calculate approximate stock from the selected option.
 */
const PACK_SIZES = { 1: 50, 2: 44, 3: 40, 4: 36, 5: 34, 6: 30 };

/**
 * Returns the three stock options for a given nappy size.
 * Falls back to size 4 (36) if size isn't selected yet.
 */
function getStockOptions(size) {
  const pack = PACK_SIZES[size] || 36;
  const lessThanHalf = Math.floor(pack * 0.4);           // ~40% of pack
  const aboutAPack   = pack;                              // full pack
  const moreThanOne  = Math.round((pack * 1.5) / 5) * 5; // ~1.5 packs, rounded to 5

  return [
    {
      id:    'low',
      label: 'Less than half a pack',
      sub:   `About ${lessThanHalf} nappies`,
      value: lessThanHalf,
      icon:  '▒',
    },
    {
      id:    'mid',
      label: 'About a full pack',
      sub:   `About ${aboutAPack} nappies`,
      value: aboutAPack,
      icon:  '█',
    },
    {
      id:    'high',
      label: 'More than one pack',
      sub:   `About ${moreThanOne} nappies`,
      value: moreThanOne,
      icon:  '█+',
    },
  ];
}

export default function StepStock({ form, setForm, onNext, onBack }) {
  const options = getStockOptions(form.size);

  // Which option is currently selected (if any)
  const selectedOption = options.find(o => o.value === form.stock) || null;
  const valid = form.stock !== '' && form.stock > 0;

  function selectOption(value) {
    setForm(f => ({ ...f, stock: value }));
  }

  return (
    <div className="fade-in px-6 py-8">
      <ProgressHeader progress={75} onBack={onBack} />
      <StepDots current={3} total={4} />

      <h2 className="font-serif text-[28px] mb-1.5">Current stock</h2>
      <p className="text-cream-400 text-sm mb-7">
        How many nappies do you have left?
      </p>

      {/* Stock option cards */}
      <div className="flex flex-col gap-3 mb-6">
        {options.map(opt => {
          const isSelected = form.stock === opt.value;
          return (
            <button
              key={opt.id}
              onClick={() => selectOption(opt.value)}
              className={`w-full text-left rounded-2xl border-[1.5px] px-5 py-4 transition-all duration-150 ${
                isSelected
                  ? 'bg-cream-600 border-cream-600 text-cream-50'
                  : 'bg-white border-cream-200 text-cream-600 hover:border-cream-400'
              }`}
            >
              {/* Visual fill indicator */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${isSelected ? 'text-cream-50' : 'text-cream-600'}`}>
                  {opt.label}
                </span>
                <FillBar level={opt.id} selected={isSelected} />
              </div>
              <span className={`text-[13px] ${isSelected ? 'text-cream-50 opacity-75' : 'text-cream-400'}`}>
                {opt.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pack size note */}
      {form.size && (
        <p className="text-cream-400 text-[13px] mb-8 text-center">
          Based on a standard size {form.size} pack of {PACK_SIZES[form.size]}
        </p>
      )}

      <button
        className="btn-primary"
        disabled={!valid}
        onClick={onNext}
      >
        See my prediction
      </button>
    </div>
  );
}

/** Simple visual fill bar showing roughly how full the stock is */
function FillBar({ level, selected }) {
  const segments = 5;
  const filled = { low: 1, mid: 3, high: 5 }[level] || 0;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-sm transition-colors ${
            i < filled
              ? selected ? 'bg-cream-50 opacity-90' : 'bg-cream-600'
              : selected ? 'bg-cream-50 opacity-20' : 'bg-cream-200'
          }`}
        />
      ))}
    </div>
  );
}

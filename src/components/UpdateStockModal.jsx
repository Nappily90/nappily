import { useState } from 'react';
import TagButton from './TagButton';

const PACK_SIZES = { 1: 50, 2: 44, 3: 40, 4: 36, 5: 34, 6: 30 };

function getStockOptions(size) {
  const pack = PACK_SIZES[size] || 36;
  const lessThanHalf = Math.floor(pack * 0.4);
  const aboutAPack   = pack;
  const moreThanOne  = Math.round((pack * 1.5) / 5) * 5;
  return [
    { id: 'low',  label: 'Less than half a pack', sub: `~${lessThanHalf} nappies`, value: lessThanHalf },
    { id: 'mid',  label: 'About a full pack',      sub: `~${aboutAPack} nappies`,  value: aboutAPack   },
    { id: 'high', label: 'More than one pack',     sub: `~${moreThanOne} nappies`, value: moreThanOne  },
  ];
}

const IMPACT_OPTIONS = [
  ['normal', 'No, normal at the moment'],
  ['more',   'More changes than usual'],
  ['fewer',  'Fewer wet nappies than usual'],
  ['tummy',  'Tummy bug / diarrhoea'],
];

export default function UpdateStockModal({ form, onSave, onClose }) {
  const [stock,  setStock]  = useState(form.stock || '');
  const [impact, setImpact] = useState(form.impact || 'normal');

  const options = getStockOptions(form.size);
  const valid   = stock !== '' && stock > 0;

  const handleSave = () => {
    onSave({ stock: Number(stock), impact });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50">
      <div className="fade-in bg-[#FAF9F7] rounded-t-3xl px-5 pb-10 pt-6 w-full max-w-[420px] mx-auto">
        {/* Handle */}
        <div className="w-10 h-1 bg-cream-300 rounded-full mx-auto mb-6" />

        <h3 className="font-serif text-[24px] mb-5">Update stock</h3>

        {/* Stock options */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-3">How many nappies do you have?</label>
          <div className="flex flex-col gap-2">
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => setStock(opt.value)}
                className={`w-full text-left rounded-xl border-[1.5px] px-4 py-3 transition-all ${
                  stock === opt.value
                    ? 'bg-cream-600 border-cream-600 text-cream-50'
                    : 'bg-white border-cream-200 text-cream-600 hover:border-cream-400'
                }`}
              >
                <span className="text-sm font-medium block">{opt.label}</span>
                <span className={`text-[12px] ${stock === opt.value ? 'text-cream-50 opacity-75' : 'text-cream-400'}`}>
                  {opt.sub}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Impact */}
        <div className="mb-7">
          <label className="block text-sm font-medium mb-2.5">
            Anything affecting nappy use right now?
          </label>
          <div className="flex flex-col gap-2">
            {IMPACT_OPTIONS.map(([value, label]) => (
              <TagButton
                key={value}
                fullWidth
                active={impact === value}
                onClick={() => setImpact(value)}
              >
                {label}
              </TagButton>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5">
          <button className="btn-secondary flex-1 !w-auto" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-[2]" disabled={!valid} onClick={handleSave}>Update</button>
        </div>
      </div>
    </div>
  );
}

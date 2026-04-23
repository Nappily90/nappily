import ProgressHeader from './ProgressHeader';
import StepDots from './StepDots';
import TagButton from './TagButton';

const FIT_OPTIONS = [
  ['fits',     'Fits well'],
  ['tight',    'Slightly tight or leaking'],
  ['not-sure', 'Not sure'],
];

const IMPACT_OPTIONS = [
  ['normal', 'No, normal at the moment'],
  ['more',   'More changes than usual'],
  ['fewer',  'Fewer wet nappies than usual'],
  ['tummy',  'Tummy bug / diarrhoea'],
];

export default function StepOptional({ form, setForm, onNext, onSkip }) {
  return (
    <div className="fade-in px-6 py-8 pb-32">
      <ProgressHeader progress={90} />
      <StepDots current={4} total={4} />

      <h2 className="font-serif text-[28px] mb-1.5">A couple more things</h2>
      <p className="text-cream-400 text-sm mb-7">
        Optional — helps us make the estimate more accurate.
      </p>

      {/* Fit */}
      <div className="mb-5">
        <label className="block text-sm font-medium mb-2.5">
          How are the nappies fitting?
        </label>
        <div className="flex flex-col gap-2">
          {FIT_OPTIONS.map(([value, label]) => (
            <TagButton
              key={value}
              fullWidth
              active={form.fitStatus === value}
              onClick={() => setForm((f) => ({ ...f, fitStatus: value }))}
            >
              {label}
            </TagButton>
          ))}
        </div>
      </div>

      {/* Impact */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2.5">
          Is anything affecting nappy use right now?
        </label>
        <div className="flex flex-col gap-2">
          {IMPACT_OPTIONS.map(([value, label]) => (
            <TagButton
              key={value}
              fullWidth
              active={form.impact === value}
              onClick={() => setForm((f) => ({ ...f, impact: value }))}
            >
              {label}
            </TagButton>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <button className="btn-primary" onClick={onNext}>
          See my prediction
        </button>
        <button className="btn-ghost mt-1" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}

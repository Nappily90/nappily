import ProgressHeader from './ProgressHeader';
import StepDots from './StepDots';
import TagButton from './TagButton';

export default function StepNursery({ form, setForm, onNext, onBack }) {
  const valid = form.nursery !== null;

  return (
    <div className="fade-in px-6 py-8">
      <ProgressHeader progress={50} onBack={onBack} />
      <StepDots current={2} total={4} />

      <h2 className="font-serif text-[28px] mb-1.5">Nursery routine</h2>
      <p className="text-cream-400 text-sm mb-7">
        Affects how many nappies you go through at home.
      </p>

      {/* Attends nursery */}
      <div className="mb-5">
        <label className="block text-sm font-medium mb-2.5">
          Does your baby attend nursery?
        </label>
        <div className="flex gap-2">
          <TagButton
            active={form.nursery === true}
            onClick={() => setForm((f) => ({ ...f, nursery: true }))}
          >
            Yes
          </TagButton>
          <TagButton
            active={form.nursery === false}
            onClick={() =>
              setForm((f) => ({
                ...f,
                nursery: false,
                nurseryDays: 0,
                nurseryProvides: false,
              }))
            }
          >
            No
          </TagButton>
        </div>
      </div>

      {form.nursery && (
        <>
          {/* Days per week */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2.5">
              How many days per week?
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((d) => (
                <TagButton
                  key={d}
                  active={form.nurseryDays === d}
                  onClick={() => setForm((f) => ({ ...f, nurseryDays: d }))}
                >
                  {d} day{d > 1 ? 's' : ''}
                </TagButton>
              ))}
            </div>
          </div>

          {/* Provides nappies */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2.5">
              Does nursery provide nappies?
            </label>
            <div className="flex flex-col gap-2">
              <TagButton
                fullWidth
                active={form.nurseryProvides === true}
                onClick={() => setForm((f) => ({ ...f, nurseryProvides: true }))}
              >
                Yes, they do
              </TagButton>
              <TagButton
                fullWidth
                active={form.nurseryProvides === false}
                onClick={() => setForm((f) => ({ ...f, nurseryProvides: false }))}
              >
                No, I supply them
              </TagButton>
            </div>
          </div>
        </>
      )}

      <button className="btn-primary mt-3" disabled={!valid} onClick={onNext}>
        Continue
      </button>
    </div>
  );
}

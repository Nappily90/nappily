import { useState } from 'react';
import { saveFeedback } from '../lib/feedback';

const REASONS = [
  { value: 'fewer', label: 'We use fewer per day' },
  { value: 'more',  label: 'We use more per day' },
  { value: 'size',  label: 'We may need the next size soon' },
];

export default function FeedbackModal({ onClose, userId }) {
  const [sent,    setSent]    = useState(false);
  const [saving,  setSaving]  = useState(false);

  async function handleReason(reason) {
    setSaving(true);
    await saveFeedback(userId, 'no', reason);
    setSaving(false);
    setSent(true);
  }

  async function handlePositive() {
    await saveFeedback(userId, 'yes', null);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-5">
      <div className="fade-in bg-[#FAF9F7] rounded-3xl px-6 py-7 w-full max-w-[380px]">
        {sent ? (
          <>
            <p className="font-serif text-[24px] mb-2">Thanks!</p>
            <p className="text-cream-400 mb-5">
              Your feedback helps us improve accuracy over time.
            </p>
            <button className="btn-primary" onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <p className="font-serif text-[22px] mb-2">What feels off?</p>
            <div className="flex flex-col gap-2 my-4">
              {REASONS.map(r => (
                <button
                  key={r.value}
                  className="tag text-left w-full"
                  disabled={saving}
                  onClick={() => handleReason(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button className="btn-ghost" onClick={onClose}>Never mind</button>
          </>
        )}
      </div>
    </div>
  );
}

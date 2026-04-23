/**
 * NotificationPrompt.jsx
 * ─────────────────────────────────────────────────────────────
 * Shown on the dashboard when push permission hasn't been granted.
 * Calm, non-pushy — explains the value and lets the parent decide.
 */
export default function NotificationPrompt({ onEnable, onDismiss, subscribing }) {
  return (
    <div className="bg-info-50 border border-info-50 rounded-2xl px-4 py-4 mb-3">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-info-400 mb-1">
            Get reminders before you run out
          </p>
          <p className="text-[13px] text-cream-400 leading-relaxed">
            We'll notify you at 5 days and again at 3 days so you always have time to order.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-cream-300 hover:text-cream-500 text-lg leading-none shrink-0 mt-0.5"
        >
          ×
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onEnable}
          disabled={subscribing}
          className="btn-primary !py-2.5 !text-[13px] flex items-center justify-center gap-2"
        >
          {subscribing ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-cream-50/40 border-t-cream-50 rounded-full animate-spin" />
              Enabling…
            </>
          ) : 'Enable reminders'}
        </button>
        <button
          onClick={onDismiss}
          className="btn-secondary !py-2.5 !text-[13px] !w-auto px-4"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

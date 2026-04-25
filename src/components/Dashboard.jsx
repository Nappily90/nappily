import { useState } from 'react';
import Logo from './Logo';
import UrgencyBar from './UrgencyBar';
import NotificationPrompt from './NotificationPrompt';
import { usePushNotifications } from '../hooks/usePushNotifications';

const IMPACT_LABELS = {
  more:  'More changes active',
  fewer: 'Fewer wet nappies active',
  tummy: 'Tummy bug active',
};

export default function Dashboard({ form, pred, onUpdateStock, onViewResult, onEdit, onSignOut, user }) {
  const { supported, isGranted, isDenied, subscribing, requestPermission } = usePushNotifications(user?.id);
  const [promptDismissed, setPromptDismissed] = useState(false);

  const showPrompt = supported && !isGranted && !isDenied && !promptDismissed;
  const hasImpact  = pred?.impactActive && form.impact && form.impact !== 'normal';

  if (!pred) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex justify-between items-center px-5 pt-8 mb-10">
          <Logo />
          <button onClick={onSignOut} className="text-[13px] text-cream-400 border border-cream-300 px-3.5 py-1.5 rounded-full bg-transparent">
            Sign out
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center pb-20">
          <p className="font-serif text-[32px] mb-3">Welcome back</p>
          <p className="text-cream-400 text-sm mb-8 leading-relaxed">Complete your setup to see your nappy plan.</p>
          <button className="btn-primary" onClick={onEdit}>Complete setup</button>
        </div>
      </div>
    );
  }

  const { usage, daysLeft, transition, reminder } = pred;

  const stats = [
    ['Nappies left',  String(form.stock)],
    ['Daily usage',   `${usage}/day`],
    ['Current size',  `Size ${form.size}`],
    ['Next size',     transition.state !== 'STABLE' ? `Size ${transition.expectedSize + 1} soon` : 'Stable'],
  ];

  return (
    <div style={{ paddingBottom: '160px' }}>
      <div className="flex justify-between items-center px-5 pt-8 mb-6">
        <Logo />
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="text-[13px] text-cream-500 border border-cream-300 px-3.5 py-1.5 rounded-full bg-transparent hover:border-cream-600 transition-all">
            Edit
          </button>
          <button onClick={onSignOut} className="text-[13px] text-cream-400 border border-cream-300 px-3.5 py-1.5 rounded-full bg-transparent hover:border-cream-600 hover:text-cream-600 transition-all">
            Sign out
          </button>
        </div>
      </div>

      <div className="px-5">
        <p className="text-cream-400 text-[13px] mb-1">Your plan</p>
        <h2 className="font-serif text-[36px] leading-[1.1] mb-6">
          You'll run out in about {daysLeft} days
        </h2>

        <UrgencyBar label={reminder.label} level={reminder.level} />

        {showPrompt && (
          <NotificationPrompt
            subscribing={subscribing}
            onEnable={requestPermission}
            onDismiss={() => setPromptDismissed(true)}
          />
        )}

        {isGranted && (
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-cream-100 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-sm">✓</span>
              <p className="text-[13px] text-cream-500">Reminders on — 5 and 3 days before.</p>
            </div>
            <button
              onClick={requestPermission}
              disabled={subscribing}
              className="text-[12px] text-cream-400 underline underline-offset-2 hover:text-cream-600"
            >
              {subscribing ? 'Saving...' : 'Refresh'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-cream-200 px-4 py-4">
              <p className="text-[12px] text-cream-400 mb-1.5">{label}</p>
              <p className="text-[18px] font-medium leading-none">{value}</p>
            </div>
          ))}
        </div>

        {hasImpact && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 mb-3">
            <p className="text-[13px] font-medium text-amber-400 mb-1">{IMPACT_LABELS[form.impact]}</p>
            <p className="text-[13px] text-cream-400">Your estimate is temporarily adjusted.</p>
          </div>
        )}

        {transition.state !== 'STABLE' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 mb-3">
            <p className="text-[13px] font-medium text-amber-400 mb-1">Size insight</p>
            <p className="text-[13px] text-cream-400">
              {transition.state === 'SIZE_UP_SOON'
                ? `Time to try size ${transition.expectedSize + 1}`
                : 'A size up may be coming soon'}
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto px-5 pb-8 pt-5 bg-gradient-to-t from-[#FAF9F7] via-[#FAF9F7] to-transparent">
        <div className="flex flex-col gap-3">
          <button className="btn-primary" onClick={onUpdateStock}>Update my stock</button>
          <button className="btn-secondary" onClick={onViewResult}>See full estimate & buy</button>
        </div>
      </div>
    </div>
  );
}

import Logo from './Logo';

export default function Landing({ onStart, onTests, onSignOut, user }) {
  return (
    <div className="fade-in flex flex-col min-h-screen px-6 pt-12 pb-8">

      {/* Header row with logo + account */}
      <div className="flex justify-between items-center">
        <Logo />
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-cream-400 hidden sm:block truncate max-w-[140px]">
              {user.email}
            </span>
            <button
              onClick={onSignOut}
              className="text-[13px] text-cream-400 border border-cream-300 px-3 py-1.5 rounded-full hover:border-cream-600 hover:text-cream-600 transition-all"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center pb-10">
        <p className="text-cream-400 text-[13px] uppercase tracking-[1px] font-medium mb-3 mt-8">
          Never run out again
        </p>
        <h1 className="font-serif text-[44px] leading-[1.08] mb-5 tracking-[-1px]">
          Calm nappy planning for busy parents
        </h1>
        <p className="text-cream-400 text-base leading-relaxed mb-10">
          Nappily predicts when you'll run out and tells you exactly when to buy
          — based on your baby, not guesswork.
        </p>
        <div className="flex flex-col gap-2.5">
          <button className="btn-primary" onClick={onStart}>
            Get started — takes 60 seconds
          </button>
          <p className="text-cream-400 text-center text-[13px] mt-1">No account needed</p>
        </div>
      </div>

      <div className="border-t border-cream-200 pt-5">
        <div className="flex gap-5 mb-5">
          {['Predict usage', 'Know when to buy', 'Detect size changes'].map(f => (
            <div key={f} className="flex-1 text-xs text-cream-400 leading-relaxed">{f}</div>
          ))}
        </div>
        <button
          onClick={onTests}
          className="btn-ghost text-[12px] opacity-50 hover:opacity-100 transition-opacity"
        >
          Run prediction model tests
        </button>
      </div>
    </div>
  );
}

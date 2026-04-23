import Logo from './Logo';

export default function ProgressHeader({ progress, onBack }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {onBack && (
        <button
          onClick={onBack}
          className="bg-none border-none text-xl cursor-pointer text-cream-400 p-1 pr-2"
        >
          ←
        </button>
      )}
      <Logo />
      <div className="flex-1 h-1 bg-cream-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-cream-600 rounded-full transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

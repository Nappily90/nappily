const colours = {
  green: 'bg-green-50 text-green-400',
  amber: 'bg-amber-50 text-amber-400',
  red:   'bg-danger-50 text-danger-400',
};

export default function UrgencyBar({ label, level }) {
  return (
    <div className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium mb-3 ${colours[level]}`}>
      <span className="text-base">⏱</span>
      <span>{label}</span>
    </div>
  );
}

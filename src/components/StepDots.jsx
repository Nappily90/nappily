export default function StepDots({ current, total }) {
  return (
    <div className="flex justify-center gap-1.5 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-colors duration-200 ${
            i < current ? 'bg-cream-600' : 'bg-cream-300'
          }`}
        />
      ))}
    </div>
  );
}

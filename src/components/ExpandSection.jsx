import { useState } from 'react';

export default function ExpandSection({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div
        className="flex justify-between items-center cursor-pointer py-1"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-sm font-medium">{title}</span>
        <span
          className={`text-xs text-cream-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-cream-200">{children}</div>
      )}
    </div>
  );
}

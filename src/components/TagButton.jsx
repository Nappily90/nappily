export default function TagButton({ active, onClick, children, fullWidth = false }) {
  return (
    <button
      onClick={onClick}
      className={`tag text-left ${active ? 'tag-active' : ''} ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
}

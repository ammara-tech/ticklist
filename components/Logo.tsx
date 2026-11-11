/* TickList's logo: a yellow sticky note with a tick in red pen */
export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" rx="5" fill="#f7d54a" />
      <rect x="3" y="3" width="26" height="6" rx="3" fill="#e9c23a" />
      <circle cx="16" cy="4.5" r="3" fill="#d6452a" />
      <path d="m9.5 17.5 4.4 4.4L23 12" fill="none" stroke="#b5321c" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

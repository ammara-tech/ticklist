/* TickList's logo: a tick on a notepad page, with a mustard corner */
export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" rx="8" fill="#2b7349" />
      <path d="M20 3h3a6 6 0 0 1 6 6v3Z" fill="#f2c14e" />
      <path d="m9.5 16.5 4.2 4.2L22.5 11" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

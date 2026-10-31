import { Link } from 'react-router-dom';

export default function Logo({ to = '/', compact = false, theme = 'dark', className = '' }) {
  const content = (
    <>
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/25"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7.5 7.5A4.5 4.5 0 0 1 12 3h2.5A4.5 4.5 0 0 1 19 7.5v0A4.5 4.5 0 0 1 14.5 12H12a4.5 4.5 0 0 0-4.5 4.5v0A4.5 4.5 0 0 0 12 21h2.5a4.5 4.5 0 0 0 4.5-4.5" />
        </svg>
      </span>
      {!compact ? (
        <span className="leading-tight">
          <span className={`block text-sm font-semibold ${theme === 'light' ? 'text-white' : 'text-slate-950'}`}>
            Brightloop
          </span>
          <span
            className={`block text-[10px] font-medium uppercase tracking-[0.18em] ${
              theme === 'light' ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Software
          </span>
        </span>
      ) : null}
    </>
  );

  if (!to) {
    return <span className={`flex items-center gap-2.5 ${className}`}>{content}</span>;
  }

  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${className}`}
    >
      {content}
    </Link>
  );
}

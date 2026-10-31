export default function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 overflow-x-auto border-b border-slate-200 ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.value === active;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={`relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition ${
              isActive ? 'text-brand-700' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
                {tab.count}
              </span>
            ) : null}
            {isActive ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

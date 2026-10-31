export default function FormSection({ title, description, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title || description ? (
        <div className="border-b border-slate-100 px-5 py-4">
          {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
          {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
        </div>
      ) : null}
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

import { useId } from 'react';

export default function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className = '',
  ...props
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-2.5 ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        {...props}
      />
      {label || description ? (
        <span>
          {label ? <span className="block text-sm font-medium text-slate-700">{label}</span> : null}
          {description ? (
            <span className="block text-xs leading-5 text-slate-500">{description}</span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}

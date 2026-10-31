import { initials } from '../../utils/format.js';

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

export default function Avatar({ name, size = 'md', className = '' }) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700 ${sizes[size] ?? sizes.md} ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

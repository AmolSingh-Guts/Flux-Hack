import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import Spinner from './Spinner.jsx';
import EmptyState from './EmptyState.jsx';

function SortButton({ column, sortBy, sortOrder, onSort }) {
  const active = sortBy === column.key;
  const Icon = !active ? ChevronsUpDown : sortOrder === 'ASC' ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={() => onSort(column.key)}
      className="inline-flex items-center gap-1 font-semibold transition hover:text-slate-900"
    >
      {column.header}
      <Icon className={`h-3.5 w-3.5 ${active ? 'text-brand-600' : 'text-slate-400'}`} aria-hidden="true" />
    </button>
  );
}

export default function DataTable({
  columns,
  rows,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription,
  emptyAction,
  sortBy,
  sortOrder,
  onSort,
  rowKey = (row) => row.id,
  onRowClick,
  footer,
}) {
  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-3 font-semibold ${column.align === 'right' ? 'text-right' : ''} ${column.className ?? ''}`}
                >
                  {column.sortable && onSort ? (
                    <SortButton
                      column={column}
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={onSort}
                    />
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <Spinner label="Loading records…" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/60'}`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 align-middle text-slate-600 ${column.align === 'right' ? 'text-right' : ''} ${column.cellClassName ?? ''}`}
                    >
                      {column.render ? column.render(row) : row[column.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer ? <div className="border-t border-slate-100 px-4 py-3">{footer}</div> : null}
    </div>
  );
}

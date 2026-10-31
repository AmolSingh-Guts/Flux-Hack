import { useMemo, useState } from 'react';
import useAsync from './useAsync.js';
import useDebouncedValue from './useDebouncedValue.js';

export default function useList(
  fetcher,
  { initialFilters = {}, limit = 10, sortBy: initialSortBy, sortOrder: initialSortOrder = 'DESC' } = {},
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(limit);
  const [search, setSearchValue] = useState('');
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [filters, setFilters] = useState(initialFilters);
  const debouncedSearch = useDebouncedValue(search, 350);
  const filterKey = JSON.stringify(filters);

  const query = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: debouncedSearch,
      ...(sortBy ? { sortBy, sortOrder } : {}),
      ...filters,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, debouncedSearch, sortBy, sortOrder, filterKey],
  );

  const { data, loading, error, reload } = useAsync(
    () => fetcher(query),
    [query],
  );

  const setSearch = (value) => {
    setSearchValue(value);
    setPage(1);
  };

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
    setPage(1);
  };

  const setFiltersDirect = (next) => {
    setFilters(next);
    setPage(1);
  };

  const sort = (key) => {
    if (sortBy === key) {
      setSortOrder((current) => (current === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(key);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  return {
    rows: data?.rows ?? [],
    meta: data?.meta ?? null,
    loading,
    error,
    reload,
    page,
    limit: pageSize,
    search,
    setSearch,
    sortBy,
    sortOrder,
    sort,
    filters,
    setFilter,
    setFilters: setFiltersDirect,
    setPage,
    setLimit: (value) => {
      setPageSize(value);
      setPage(1);
    },
  };
}

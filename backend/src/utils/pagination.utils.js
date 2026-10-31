import ApiError from './ApiError.js';

const sortDirections = new Set(['ASC', 'DESC']);

export function parsePagination(query = {}, options = {}) {
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.min(
    options.maxLimit ?? 100,
    Math.max(1, Number.parseInt(query.limit ?? '10', 10) || 10),
  );
  const allowedSortFields = options.allowedSortFields ?? ['created_at'];
  const requestedSort = query.sortBy ?? options.defaultSortBy ?? 'created_at';
  const sortBy = allowedSortFields.includes(requestedSort)
    ? requestedSort
    : options.defaultSortBy ?? allowedSortFields[0];
  const requestedOrder = String(query.sortOrder ?? 'DESC').toUpperCase();
  const sortOrder = sortDirections.has(requestedOrder)
    ? requestedOrder
    : 'DESC';

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    sortBy,
    sortOrder,
  };
}

export function paginationMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total: Number(total),
    totalPages: Math.max(1, Math.ceil(Number(total) / limit)),
  };
}

export function parseId(value, label = 'id') {
  const id = Number.parseInt(value, 10);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, `Invalid ${label}.`);
  }

  return id;
}

export function ensureSortField(field, allowed, fallback = allowed[0]) {
  return allowed.includes(field) ? field : fallback;
}

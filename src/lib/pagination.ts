import { NextRequest } from "next/server";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

/**
 * Extract pagination parameters from query string.
 */
export function getPaginationParams(req: NextRequest): PaginationParams {
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? String(DEFAULT_LIMIT))));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Wrap items + total in a standard paginated response.
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  return {
    items,
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(total / params.limit),
  };
}

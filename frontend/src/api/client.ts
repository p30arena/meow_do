import { API_BASE_URL } from '../config';
import { handleUnauthorized } from '../lib/utils';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Defaults to the stored auth token; pass null for anonymous endpoints. */
  token?: string | null;
  errorMessage?: string;
}

/** Error carrying the HTTP status and parsed body so callers can branch on them. */
export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;

  constructor(status: number, data: Record<string, unknown>, fallback?: string) {
    super((data?.message as string) || fallback || `Request failed (${status})`);
    this.status = status;
    this.data = data;
  }
}

/**
 * Shared fetch wrapper: base URL, JSON encoding, bearer token, 401 handling,
 * error-message extraction, and 204 support. Endpoint paths are relative to
 * API_BASE_URL (e.g. "/auth/login").
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token = localStorage.getItem('token'), errorMessage } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorData, errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

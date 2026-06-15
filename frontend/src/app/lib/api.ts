// In production the SPA is served same-origin behind nginx, which proxies
// `/api` → the FastAPI backend, so VITE_API_URL is set to `https://aLink.ahbab.dev/api`.
// Locally it falls back to the dev backend.
const API_BASE: string =
  (import.meta as any)?.env?.VITE_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Event name fired when an authenticated request is rejected (revoked/expired token). */
export const UNAUTHORIZED_EVENT = "alink:unauthorized";

/**
 * Notify the app that a request authenticated with a token was rejected.
 * Skipped for the auth endpoints themselves so a wrong-password login does
 * not trigger a global logout. AuthProvider listens for this and signs out.
 */
function notifyUnauthorized(path: string, hadToken: boolean): void {
  if (!hadToken || path.startsWith("/auth/")) return;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
}

/** Upload one or more files as multipart/form-data through the shared API base. */
export async function apiUpload<T = any>(
  path: string,
  formData: FormData,
  options: { token?: string; signal?: AbortSignal } = {}
): Promise<T> {
  const token = options.token || getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers, // do NOT set Content-Type — the browser sets the multipart boundary
    body: formData,
    signal: options.signal,
  });

  if (!res.ok) {
    if (res.status === 401) notifyUnauthorized(path, Boolean(token));
    let errMsg = `Request failed with status ${res.status}`;
    try {
      const errorData = await res.json();
      errMsg = errorData.detail || errorData.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem("alink:token");
  } catch {
    return null;
  }
}

export async function apiRequest<T = any>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {};

  const token = options.token || getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let body: any = undefined;
  if (options.body) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const method = options.method || (options.body ? "POST" : "GET");

  const res = await fetch(url, {
    method,
    headers,
    body,
    signal: options.signal,
  });

  if (!res.ok) {
    if (res.status === 401) notifyUnauthorized(path, Boolean(token));
    let errMsg = `Request failed with status ${res.status}`;
    try {
      const errorData = await res.json();
      errMsg = errorData.detail || errorData.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  if (res.status === 204) {
    return {} as T;
  }

  try {
    return await res.json() as T;
  } catch {
    return {} as T;
  }
}

export async function apiRequestAll<T = any>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
    signal?: AbortSignal;
  } = {}
): Promise<T[]> {
  const delimiter = path.includes("?") ? "&" : "?";
  const pathWithLimit = `${path}${delimiter}limit=200`;
  return apiRequest<T[]>(pathWithLimit, options);
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

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

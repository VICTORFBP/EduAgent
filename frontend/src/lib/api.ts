/* ===== EduAgent — API Client Wrapper ===== */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, token } = options;

  const fetchHeaders: Record<string, string> = {
    ...headers,
  };

  if (token) {
    fetchHeaders["Authorization"] = `Bearer ${token}`;
  }

  if (body && !(body instanceof FormData)) {
    fetchHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: fetchHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      errorData?.detail || `Error ${response.status}: ${response.statusText}`,
      errorData
    );
  }

  return response.json();
}

// ---- Convenience methods ----

export function apiGet<T>(endpoint: string, token?: string): Promise<T> {
  return apiFetch<T>(endpoint, { token });
}

export function apiPost<T>(endpoint: string, body: unknown, token?: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: "POST", body, token });
}

export function apiPut<T>(endpoint: string, body: unknown, token?: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: "PUT", body, token });
}

export function apiPatch<T>(endpoint: string, body: unknown, token?: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: "PATCH", body, token });
}

export function apiDelete<T>(endpoint: string, token?: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: "DELETE", token });
}

export function apiUpload<T>(endpoint: string, formData: FormData, token?: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: "POST", body: formData, token });
}

export { ApiError };

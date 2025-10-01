import { getSessionToken } from './supabaseClient';

async function attachAuth(headers: Record<string, string> = {}) {
  try {
    const token = await getSessionToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch (_err) {
    // ignore token retrieval errors — requests may still work if unauthenticated
  }
  return headers;
}

// Lightweight JSON value type
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

async function parseJsonSafe(resp: Response): Promise<unknown> {
  try {
    return await resp.json();
  } catch (_e) {
    return null;
  }
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const headers = await attachAuth({ 'Content-Type': 'application/json' });
  // normal request flow
  const resp = await fetch(path, {
    method: 'POST',
    headers,
    body: typeof body === 'undefined' ? undefined : JSON.stringify(body),
  });

  const json = await parseJsonSafe(resp) as unknown;
  if (!resp.ok) {
    const msg = (json as any)?.error || (json as any)?.message || `Request failed with status ${resp.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const headers = await attachAuth({ 'Content-Type': 'application/json' });
  const resp = await fetch(path, { method: 'GET', headers });
  const json = await parseJsonSafe(resp) as unknown;
  if (!resp.ok) {
    const msg = (json as any)?.error || (json as any)?.message || `Request failed with status ${resp.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export async function apiPut<T = unknown>(path: string, body?: unknown): Promise<T> {
  const headers = await attachAuth({ 'Content-Type': 'application/json' });
  const resp = await fetch(path, { method: 'PUT', headers, body: typeof body === 'undefined' ? undefined : JSON.stringify(body) });
  const json = await parseJsonSafe(resp) as unknown;
  if (!resp.ok) {
    const msg = (json as any)?.error || (json as any)?.message || `Request failed with status ${resp.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export async function apiDelete<T = unknown>(path: string, body?: unknown): Promise<T> {
  const headers = await attachAuth({ 'Content-Type': 'application/json' });
  const resp = await fetch(path, { method: 'DELETE', headers, body: body ? JSON.stringify(body) : undefined });
  const json = await parseJsonSafe(resp) as unknown;
  if (!resp.ok) {
    const msg = (json as any)?.error || (json as any)?.message || `Request failed with status ${resp.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export default apiPost;

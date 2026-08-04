import { env } from "../../config/env";

const BASE_URL = env.OKA_BASE_URL;

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${env.OKA_TOKEN}`,
    ...extra,
  };
}

export async function okaGet(
  path: string,
  params?: Record<string, unknown>,
): Promise<Response> {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return fetch(url, {
    headers: authHeaders({ accept: "application/json" }),
  });
}

export async function okaPost<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Oka API ${path} respondió ${res.status}`);
  }

  return (await res.json()) as T;
}

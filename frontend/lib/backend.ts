const BASE = process.env.BACKEND_API_URL;
const KEY = process.env.BACKEND_API_KEY;

export async function backendFetch(path: string, init?: RequestInit) {
  if (!BASE || !KEY) {
    throw new Error("BACKEND_API_URL or BACKEND_API_KEY missing");
  }
  const url = `${BASE}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "X-API-Key": KEY,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

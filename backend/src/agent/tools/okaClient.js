const BASE_URL = process.env.OKA_BASE_URL || "https://api.oka.com.pe/v1";

function authHeaders(extra) {
  return {
    Authorization: `Bearer ${process.env.OKA_TOKEN}`,
    ...extra,
  };
}

async function okaGet(path, params) {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return fetch(url, {
    headers: authHeaders({ accept: "application/json" }),
  });
}

async function okaPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Oka API ${path} respondió ${res.status}`);
  }

  return res.json();
}

module.exports = { okaGet, okaPost };

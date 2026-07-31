const BASE_URL = process.env.OKA_API_BASE_URL || "https://api.oka.com.pe/v1";

async function okaPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OKA_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Oka API ${path} respondió ${res.status}`);
  }

  return res.json();
}

module.exports = { okaPost };

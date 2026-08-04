import type { ChatMessage, ChatResponse } from "./types";

export async function sendMessage(
  apiUrl: string,
  history: ChatMessage[],
  text: string,
): Promise<ChatResponse> {
  const payload = { messages: [...history, { role: "user", content: text }] };

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return res.json();
}

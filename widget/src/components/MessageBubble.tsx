import styles from "../styles/MessageBubble.module.css";

interface MessageBubbleProps {
  role: "user" | "assistant";
  text: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderBubbleHtml(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function MessageBubble({ role, text }: MessageBubbleProps) {
  return (
    <div
      className={`${styles.bubble} ${styles[role]}`}
      // El texto se escapa en renderBubbleHtml antes de introducir <strong>,
      // así que este HTML generado por nosotros mismos es seguro de inyectar.
      dangerouslySetInnerHTML={{ __html: renderBubbleHtml(text) }}
    />
  );
}

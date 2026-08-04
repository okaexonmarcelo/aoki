import { useEffect, useRef } from "react";
import styles from "../styles/ChatPanel.module.css";
import type { DisplayMessage, SaleSummaryUi, Ui } from "../types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { UiRenderer } from "./ui/UiRenderer";

interface MessageListProps {
  messages: DisplayMessage[];
  isSending: boolean;
  activeUi: Ui | null;
  onOptionSelect: (text: string) => void;
  onShowSummary: (summary: SaleSummaryUi) => void;
  onModify: () => void;
}

export function MessageList({
  messages,
  isSending,
  activeUi,
  onOptionSelect,
  onShowSummary,
  onModify,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isSending, activeUi]);

  return (
    <div className={styles.messages} ref={containerRef}>
      {messages.map((m, i) => (
        <MessageBubble key={i} role={m.role} text={m.content} />
      ))}
      {isSending && <TypingIndicator />}
      <UiRenderer
        ui={activeUi}
        onSubmit={onOptionSelect}
        onShowSummary={onShowSummary}
        onModify={onModify}
      />
    </div>
  );
}

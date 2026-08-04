import styles from "../styles/ChatPanel.module.css";
import type { DisplayMessage, SaleSummaryUi, Ui } from "../types";
import { InputRow } from "./InputRow";
import { MessageList } from "./MessageList";

interface ChatPanelProps {
  messages: DisplayMessage[];
  isSending: boolean;
  activeUi: Ui | null;
  onSend: (text: string) => void;
  onShowSummary: (summary: SaleSummaryUi) => void;
  onModify: () => void;
}

export function ChatPanel({
  messages,
  isSending,
  activeUi,
  onSend,
  onShowSummary,
  onModify,
}: ChatPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        Aoki · Agente Oka
        <small>En línea ahora</small>
      </div>
      <MessageList
        messages={messages}
        isSending={isSending}
        activeUi={activeUi}
        onOptionSelect={onSend}
        onShowSummary={onShowSummary}
        onModify={onModify}
      />
      <InputRow disabled={isSending} onSend={onSend} />
    </div>
  );
}

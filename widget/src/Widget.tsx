import { useState } from "react";
import { sendMessage as sendMessageApi } from "./api";
import { ChatPanel } from "./components/ChatPanel";
import { Launcher } from "./components/Launcher";
import type { ChatMessage, CreditSimulatorUi, DisplayMessage, SaleSummaryUi, Ui } from "./types";

const GREETING =
  "¡Hola! Soy Aoki, tu asistente de Oka. Para ver tu oferta personalizada, ¿cuál es tu DNI?";

const ERROR_REPLY = "Ups, tuve un problema para responder. Intenta de nuevo en un momento.";

const SUMMARY_INTRO = "Aquí está el resumen de tu crédito preaprobado:";

interface WidgetProps {
  apiUrl: string;
}

export function Widget({ apiUrl }: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [activeUi, setActiveUi] = useState<Ui | null>(null);
  const [lastCreditSimulatorUi, setLastCreditSimulatorUi] = useState<CreditSimulatorUi | null>(
    null,
  );

  function toggleOpen() {
    setIsOpen((prev) => {
      const next = !prev;
      if (next && displayMessages.length === 0) {
        setDisplayMessages([{ role: "assistant", content: GREETING }]);
      }
      return next;
    });
  }

  async function handleSend(text: string) {
    if (isSending || !text) return;

    setIsSending(true);
    setActiveUi(null);
    setDisplayMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const data = await sendMessageApi(apiUrl, history, text);
      setHistory(data.messages ?? history);
      setDisplayMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "..." },
      ]);
      const ui = data.ui ?? null;
      setActiveUi(ui);
      if (ui?.type === "credit_simulator") setLastCreditSimulatorUi(ui);
    } catch {
      setDisplayMessages((prev) => [...prev, { role: "assistant", content: ERROR_REPLY }]);
    } finally {
      setIsSending(false);
    }
  }

  // "Ver resumen" y "Modificar" son transiciones puramente locales: los datos
  // ya están en el credit_simulator que tenemos, así que no hace falta ida y
  // vuelta al backend (ni, mucho menos, a la API de Oka) solo para mostrarlos.
  function handleShowSummary(summary: SaleSummaryUi) {
    setActiveUi(summary);
    setDisplayMessages((prev) => [...prev, { role: "assistant", content: SUMMARY_INTRO }]);
  }

  function handleModify() {
    setActiveUi(lastCreditSimulatorUi);
  }

  return (
    <>
      <Launcher onClick={toggleOpen} />
      {isOpen && (
        <ChatPanel
          messages={displayMessages}
          isSending={isSending}
          activeUi={activeUi}
          onSend={handleSend}
          onShowSummary={handleShowSummary}
          onModify={handleModify}
        />
      )}
    </>
  );
}

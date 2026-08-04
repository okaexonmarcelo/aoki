import { useState } from "react";
import styles from "../styles/ChatPanel.module.css";

interface InputRowProps {
  disabled: boolean;
  onSend: (text: string) => void;
}

export function InputRow({ disabled, onSend }: InputRowProps) {
  const [value, setValue] = useState("");

  function submit() {
    const text = value.trim();
    setValue("");
    onSend(text);
  }

  return (
    <div className={styles.inputRow}>
      <input
        type="text"
        placeholder="Escribe un mensaje..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        disabled={disabled}
      />
      <button type="button" aria-label="Enviar" onClick={submit} disabled={disabled}>
        ➤
      </button>
    </div>
  );
}

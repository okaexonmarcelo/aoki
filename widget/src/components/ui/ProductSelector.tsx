import { useState } from "react";
import sharedStyles from "../../styles/ui/shared.module.css";
import styles from "../../styles/ui/ProductSelector.module.css";
import type { ProductOption, ProductSelectorUi } from "../../types";

interface ProductSelectorProps {
  ui: ProductSelectorUi;
  onSubmit: (text: string) => void;
}

export function ProductSelector({ ui, onSubmit }: ProductSelectorProps) {
  const [selected, setSelected] = useState<ProductOption | null>(null);

  return (
    <div className={sharedStyles.ui}>
      {ui.options.map((opt) => (
        <button
          key={opt.leadId}
          type="button"
          className={`${styles.card} ${selected?.leadId === opt.leadId ? styles.cardSelected : ""}`}
          onClick={() => setSelected(opt)}
        >
          <span className={styles.icon}>{opt.icon}</span>
          <span className={styles.body}>
            <span className={styles.title}>{opt.label}</span>
            <span className={styles.desc}>{opt.description}</span>
            <span className={styles.tag}>{opt.tag}</span>
          </span>
          <span className={styles.radio} />
        </button>
      ))}
      <button
        type="button"
        className={sharedStyles.cta}
        disabled={!selected}
        onClick={() => selected && onSubmit(`Elijo ${selected.label}`)}
      >
        Continuar
      </button>
    </div>
  );
}

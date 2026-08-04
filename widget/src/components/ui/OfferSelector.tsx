import styles from "../../styles/ui/shared.module.css";
import type { OfferSelectorUi } from "../../types";

interface OfferSelectorProps {
  ui: OfferSelectorUi;
  onSubmit: (text: string) => void;
}

export function OfferSelector({ ui, onSubmit }: OfferSelectorProps) {
  return (
    <div className={styles.ui}>
      {ui.options.map((opt, i) => (
        <button
          key={i}
          type="button"
          className={styles.option}
          onClick={() =>
            onSubmit(`Elijo la oferta de S/ ${opt.amount} en ${opt.term} cuotas`)
          }
        >
          {opt.label} · tasa {opt.interestRate}% · cuota aprox. S/ {opt.approxInstallment}
        </button>
      ))}
    </div>
  );
}

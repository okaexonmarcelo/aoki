import { useState } from "react";
import sharedStyles from "../../styles/ui/shared.module.css";
import styles from "../../styles/ui/CreditSimulator.module.css";
import type { CreditSimulatorUi, SaleSummaryUi } from "../../types";

interface CreditSimulatorProps {
  ui: CreditSimulatorUi;
  onSubmit: (text: string) => void;
  onShowSummary: (summary: SaleSummaryUi) => void;
}

export function CreditSimulator({ ui, onSubmit, onShowSummary }: CreditSimulatorProps) {
  const [amount, setAmount] = useState(ui.amount);
  const [termIndex, setTermIndex] = useState(0);

  if (!ui.options.length) return null;

  // Derivado en cada render (no en estado) para evitar que la cotización
  // quede desincronizada del term/monto actuales.
  const quote = ui.options[termIndex] ?? ui.options[0]!;

  function commitAmount() {
    onSubmit(`Simula S/ ${amount} en ${quote.term} cuotas`);
  }

  return (
    <div className={sharedStyles.ui}>
      <div className={styles.card}>
        <div>
          <div className={styles.rowHeader}>
            <span>Monto solicitado</span>
            <strong>S/ {amount}</strong>
          </div>
          <input
            type="range"
            className={styles.slider}
            min={ui.minAmount}
            max={ui.maxAmount}
            step={ui.step || 100}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            onPointerUp={commitAmount}
            onKeyUp={commitAmount}
          />
          <div className={styles.rangeLabels}>
            <span>S/ {ui.minAmount}</span>
            <span>Máx. S/ {ui.maxAmount}</span>
          </div>
        </div>

        <div>
          <div className={styles.rowHeader}>
            <span>Número de cuotas</span>
            <strong>{quote.term} cuotas</strong>
          </div>
          <input
            type="range"
            className={styles.slider}
            min={0}
            max={ui.options.length - 1}
            step={1}
            value={termIndex}
            onChange={(e) => setTermIndex(Number(e.target.value))}
          />
          <div className={styles.rangeLabels}>
            <span>{ui.options[0]!.term} meses</span>
            <span>{ui.options[ui.options.length - 1]!.term} meses</span>
          </div>
        </div>

        <div className={styles.quote}>
          <div className={styles.quoteLabel}>Tu cuota mensual estimada</div>
          <div className={styles.quoteValue}>S/ {quote.monthlyPayment.toFixed(2)}</div>
          <div className={styles.quoteSub}>TCEA: {quote.totalRate}%</div>
        </div>

        <button
          type="button"
          className={sharedStyles.cta}
          onClick={() =>
            onShowSummary({
              type: "sale_summary",
              productLabel: ui.productLabel,
              amount,
              term: quote.term,
              monthlyPayment: quote.monthlyPayment,
              tcea: quote.totalRate,
            })
          }
        >
          Ver resumen de mi crédito
        </button>
      </div>
    </div>
  );
}

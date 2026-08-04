import sharedStyles from "../../styles/ui/shared.module.css";
import styles from "../../styles/ui/SaleSummary.module.css";
import type { SaleSummaryUi } from "../../types";

interface SaleSummaryProps {
  ui: SaleSummaryUi;
  onSubmit: (text: string) => void;
  onModify: () => void;
}

export function SaleSummary({ ui, onSubmit, onModify }: SaleSummaryProps) {
  return (
    <div className={sharedStyles.ui}>
      <div className={styles.card}>
        <div className={styles.row}>
          <span>Producto</span>
          <strong>{ui.productLabel}</strong>
        </div>
        <div className={styles.row}>
          <span>Monto</span>
          <strong>S/ {ui.amount}</strong>
        </div>
        <div className={styles.row}>
          <span>Cuotas</span>
          <strong>
            {ui.term} × S/ {ui.monthlyPayment.toFixed(2)}
          </strong>
        </div>
        <div className={styles.row}>
          <span>Vida</span>
          <strong className={styles.included}>✓ Incluido</strong>
        </div>
        <div className={styles.row}>
          <span>TCEA</span>
          <strong>{ui.tcea}%</strong>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onModify}>
            Modificar
          </button>
          <button
            type="button"
            className={`${sharedStyles.cta} ${styles.ctaFlex}`}
            onClick={() =>
              onSubmit(`Confirmo S/ ${ui.amount} en ${ui.term} cuotas, quiero crear mi cuenta`)
            }
          >
            Sí, confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

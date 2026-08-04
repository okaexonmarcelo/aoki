import sharedStyles from "../../styles/ui/shared.module.css";
import styles from "../../styles/ui/SaleSuccess.module.css";
import type { SaleSuccessUi } from "../../types";

interface SaleSuccessProps {
  ui: SaleSuccessUi;
}

export function SaleSuccess({ ui }: SaleSuccessProps) {
  return (
    <div className={sharedStyles.ui}>
      <div className={styles.card}>
        <div className={styles.title}>¡Crédito confirmado!</div>
        <div className={styles.loanId}>Loan ID: {ui.saleId}</div>
        <a
          className={styles.cta}
          href="https://personas.oka.com.pe"
          target="_blank"
          rel="noopener noreferrer"
        >
          Inicia sesión para desembolsar
        </a>
      </div>
    </div>
  );
}

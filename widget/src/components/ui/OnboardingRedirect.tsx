import styles from "../../styles/ui/shared.module.css";
import type { OnboardingRedirectUi } from "../../types";

interface OnboardingRedirectProps {
  ui: OnboardingRedirectUi;
}

export function OnboardingRedirect({ ui }: OnboardingRedirectProps) {
  return (
    <div className={styles.ui}>
      <button
        type="button"
        className={styles.cta}
        onClick={() => {
          window.location.href = ui.url;
        }}
      >
        Crear cuenta para desembolsar
      </button>
    </div>
  );
}

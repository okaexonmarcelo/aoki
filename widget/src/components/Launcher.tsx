import styles from "../styles/Launcher.module.css";

interface LauncherProps {
  onClick: () => void;
}

export function Launcher({ onClick }: LauncherProps) {
  return (
    <button
      type="button"
      className={styles.launcher}
      aria-label="Abrir chat de Aoki"
      onClick={onClick}
    >
      💬
    </button>
  );
}

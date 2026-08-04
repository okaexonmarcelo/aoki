import type { SaleSummaryUi, Ui } from "../../types";
import { CreditSimulator } from "./CreditSimulator";
import { OfferSelector } from "./OfferSelector";
import { OnboardingRedirect } from "./OnboardingRedirect";
import { ProductSelector } from "./ProductSelector";
import { SaleSuccess } from "./SaleSuccess";
import { SaleSummary } from "./SaleSummary";

interface UiRendererProps {
  ui: Ui | null;
  onSubmit: (text: string) => void;
  onShowSummary: (summary: SaleSummaryUi) => void;
  onModify: () => void;
}

export function UiRenderer({ ui, onSubmit, onShowSummary, onModify }: UiRendererProps) {
  if (!ui) return null;

  switch (ui.type) {
    case "offer_selector":
      return <OfferSelector ui={ui} onSubmit={onSubmit} />;
    case "product_selector":
      return <ProductSelector ui={ui} onSubmit={onSubmit} />;
    case "sale_summary":
      return <SaleSummary ui={ui} onSubmit={onSubmit} onModify={onModify} />;
    case "sale_success":
      return <SaleSuccess ui={ui} />;
    case "credit_simulator":
      return <CreditSimulator ui={ui} onSubmit={onSubmit} onShowSummary={onShowSummary} />;
    case "onboarding_redirect":
      return <OnboardingRedirect ui={ui} />;
    default: {
      const _exhaustive: never = ui;
      return _exhaustive;
    }
  }
}

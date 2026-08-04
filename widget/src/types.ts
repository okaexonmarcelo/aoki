// Refleja el shape producido por `buildUi`/`runConversation` en
// backend/src/agent/orchestrator.ts. El backend es la fuente de verdad —
// si esos tipos cambian, actualizar estas interfaces a mano (no hay
// paquete/workspace compartido entre ambos proyectos).
//
// NOTA: `buildUi` nunca produce actualmente "offer_selector" (no hay ninguna
// tool que lo genere) — se mantiene aquí por compatibilidad futura.
//
// NOTA: "sale_summary" es la única excepción — Widget.tsx la construye
// enteramente en el cliente (a partir de "credit_simulator") para no depender
// de ningún endpoint adicional de Oka; el backend nunca la produce.

export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  [key: string]: unknown;
}

// Mensaje puramente visual (burbuja renderizada). Independiente de `history`
// (el payload que se reenvía al backend) — igual que el widget original,
// donde el saludo inicial y los mensajes de error nunca se agregaban a
// `history`, solo se pintaban en el DOM.
export interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
}

export interface OfferOption {
  label: string;
  amount: number;
  term: number;
  interestRate: number;
  approxInstallment: number;
}

export interface OfferSelectorUi {
  type: "offer_selector";
  options: OfferOption[];
}

export interface ProductOption {
  leadId: string;
  subType: string;
  id: string;
  label: string;
  description: string;
  tag: string;
  icon: string;
}

export interface ProductSelectorUi {
  type: "product_selector";
  options: ProductOption[];
}

export interface SaleSummaryUi {
  type: "sale_summary";
  productLabel: string;
  amount: number;
  term: number;
  monthlyPayment: number;
  tcea: number;
}

export interface SaleSuccessUi {
  type: "sale_success";
  saleId: string;
}

export interface CreditSimulationOption {
  term: number;
  monthlyPayment: number;
  interestRate: number;
  totalRate: number;
  totalPayment: number;
}

export interface CreditSimulatorUi {
  type: "credit_simulator";
  leadId: string;
  customerId: string;
  amount: number;
  minAmount: number;
  maxAmount: number;
  step: number;
  paymentDay: number;
  productLabel: string;
  options: CreditSimulationOption[];
}

export interface OnboardingRedirectUi {
  type: "onboarding_redirect";
  url: string;
}

export type Ui =
  | OfferSelectorUi
  | ProductSelectorUi
  | SaleSummaryUi
  | SaleSuccessUi
  | CreditSimulatorUi
  | OnboardingRedirectUi;

export interface ChatResponse {
  messages: ChatMessage[];
  reply: string;
  ui: Ui | null;
}

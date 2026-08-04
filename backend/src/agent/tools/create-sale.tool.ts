import { z } from "zod";
import { okaPost } from "./okaClient";
import { defineTool } from "./tool.types";

const schema = z.object({
  lead_id: z.string().describe("Id del lead elegido"),
  customer_id: z.string().describe("Id del cliente, obtenido de get_customer"),
  amount: z.number().describe("Monto confirmado del préstamo, en soles"),
  term: z.number().describe("Número de cuotas confirmado"),
  payment_day: z.number().describe("Día del mes de pago, el mismo usado en la simulación"),
});

export const createSaleTool = defineTool({
  name: "create_sale",
  description:
    "Convierte el lead en un loan (venta confirmada) una vez que el usuario aceptó el resumen de su crédito. Es el paso final e irreversible: solo llamar cuando el usuario confirme explícitamente (\"Sí, confirmar\"). No confundir con simulate_credit, que solo cotiza sin comprometer nada.",
  schema,
  execute(input) {
    return okaPost(`/leads/${encodeURIComponent(input.lead_id)}/sales`, {
      customer: { id: input.customer_id },
      amount: input.amount,
      currency: "PEN",
      term: input.term,
      paymentDay: input.payment_day,
      insurancesTypes: ["LIFE"],
      simulation: { type: "REGULAR" },
      metadata: { origin: "CHATBOT" },
    });
  },
});

import { z } from "zod";
import { okaPost } from "./okaClient";
import { defineTool } from "./tool.types";

const schema = z.object({
  customer_id: z.string().describe("Id del cliente, obtenido de get_customer"),
  lead_id: z.string().describe("Id del lead elegido"),
  amount: z.number().describe("Monto del préstamo solicitado, en soles"),
  payment_day: z
    .number()
    .optional()
    .describe("Día del mes de pago. Por defecto, el día actual"),
  insurance_types: z
    .array(z.string())
    .optional()
    .describe('Tipos de seguro a incluir. Por defecto ["LIFE"]'),
});

export const simulateCreditTool = defineTool({
  name: "simulate_credit",
  description:
    "Simula el CRÉDITO: calcula las cuotas mensuales de un préstamo para un monto y número de cuotas (plazo) dados, devolviendo las opciones de plazo disponibles. Úsala cada vez que el usuario ajuste el monto o el plazo en el simulador de crédito. No confundir con create_sale (que recién se llama cuando el usuario confirma el resumen final).",
  schema,
  async execute(input) {
    const payload = {
      customer: { id: input.customer_id },
      loan: {
        amount: input.amount,
        paymentDay: input.payment_day ?? new Date().getDate(),
      },
      lead: { id: input.lead_id },
      insuranceTypes: input.insurance_types?.length
        ? input.insurance_types
        : ["LIFE"],
    };

    return okaPost("/simulations", payload);
  },
});

import { z } from "zod";
import { okaGet } from "./okaClient";
import { defineTool } from "./tool.types";

const schema = z.object({
  dni: z.union([z.string(), z.number()]).describe("DNI del usuario, 8 dígitos"),
});

export const leadsTool = defineTool({
  name: "consultar_leads",
  description: "Consulta si un usuario tiene línea de crédito preaprobada en Oka.",
  schema,
  async execute(input) {
    const res = await okaGet("/leads", {
      documentType: "DNI",
      documentNumber: input.dni,
    });

    if (!res.ok) {
      throw new Error(`consultar_leads respondió ${res.status}`);
    }

    return res.json();
  },
});

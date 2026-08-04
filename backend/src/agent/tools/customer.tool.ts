import { z } from "zod";
import { okaGet } from "./okaClient";
import { defineTool } from "./tool.types";

const schema = z.object({
  type: z.string().describe("Tipo de documento, ej. DNI"),
  number: z.union([z.string(), z.number()]).describe("Número de documento"),
});

export const customerTool = defineTool({
  name: "get_customer",
  description:
    "Consulta los datos del cliente (nombre e id) por tipo y número de documento.",
  schema,
  async execute(input) {
    const res = await okaGet("/customers", {
      type: input.type,
      number: input.number,
    });

    if (res.status === 404) return null;

    if (!res.ok) {
      throw new Error(`get_customer respondió ${res.status}`);
    }

    return res.json();
  },
});

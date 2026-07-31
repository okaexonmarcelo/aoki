const { okaPost } = require("./okaClient");

module.exports = {
  definition: {
    name: "convertir_lead_a_loan",
    description: "Convierte el lead en un loan y activa el onboarding.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        monto: { type: "number" },
        plazo: { type: "number" },
        producto: { type: "string", enum: ["efectivo_oka", "credito_oka"] },
        seguros: { type: "array", items: { type: "string" } },
      },
      required: ["lead_id", "monto", "plazo", "producto"],
    },
  },

  execute(input) {
    return okaPost("/sales/convert", input);
  },
};

const { okaPost } = require("./okaClient");

module.exports = {
  definition: {
    name: "simulate_credit",
    description:
      "Simula las cuotas de un crédito para un monto y día de pago dados, devolviendo las opciones de plazo disponibles.",
    input_schema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Id del cliente, obtenido de get_customer",
        },
        lead_id: {
          type: "string",
          description: "Id del lead elegido",
        },
        amount: {
          type: "number",
          description: "Monto del préstamo solicitado, en soles",
        },
        payment_day: {
          type: "number",
          description: "Día del mes de pago. Por defecto, el día actual",
        },
        insurance_types: {
          type: "array",
          items: { type: "string" },
          description: 'Tipos de seguro a incluir. Por defecto ["LIFE"]',
        },
      },
      required: ["customer_id", "lead_id", "amount"],
    },
  },

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
};

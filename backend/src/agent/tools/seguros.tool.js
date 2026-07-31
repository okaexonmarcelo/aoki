const { okaPost } = require("./okaClient");

module.exports = {
  definition: {
    name: "simular_seguro",
    description: "Simula los seguros disponibles para un monto y plazo dado.",
    input_schema: {
      type: "object",
      properties: {
        monto: { type: "number", description: "Monto solicitado en soles" },
        plazo: { type: "number", description: "Número de cuotas mensuales" },
      },
      required: ["monto", "plazo"],
    },
  },

  execute(input) {
    return okaPost("/seguros/simular", {
      monto: input.monto,
      plazo: input.plazo,
    });
  },
};

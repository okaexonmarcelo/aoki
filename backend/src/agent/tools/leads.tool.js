const { okaGet } = require("./okaClient");

module.exports = {
  definition: {
    name: "consultar_leads",
    description:
      "Consulta si un usuario tiene línea de crédito preaprobada en Oka.",
    input_schema: {
      type: "object",
      properties: {
        dni: {
          type: ["string", "number"],
          description: "DNI del usuario, 8 dígitos",
        },
      },
      required: ["dni"],
    },
  },

  async execute(input) {
    const res = await okaGet("/leads", {
      documentType: "DNI",
      documentNumber: input.dni,
    });

    if (!res.ok) {
      console.log(res);
      throw new Error(`consultar_leads respondió ${res.status}`);
    }

    return res.json();
  },
};

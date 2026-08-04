const { okaGet } = require("./okaClient");

module.exports = {
  definition: {
    name: "get_customer",
    description:
      "Consulta los datos del cliente (nombre e id) por tipo y número de documento.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Tipo de documento, ej. DNI",
        },
        number: {
          type: ["string", "number"],
          description: "Número de documento",
        },
      },
      required: ["type", "number"],
    },
  },

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
};

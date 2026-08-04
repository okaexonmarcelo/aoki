const BASE_URL =
  process.env.OKA_LEADS_BASE_URL || "https://api.dev.oka.com.pe/v1";

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
    const url = new URL(`${BASE_URL}/customers`);
    url.searchParams.set("type", input.type);
    url.searchParams.set("number", String(input.number));

    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${process.env.OKA_LEADS_TOKEN}`,
      },
    });

    if (res.status === 404) return null;

    if (!res.ok) {
      throw new Error(`get_customer respondió ${res.status}`);
    }

    return res.json();
  },
};

const BASE_URL =
  process.env.OKA_LEADS_BASE_URL || "https://api.dev.oka.com.pe/v1";

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
    const url = new URL(`${BASE_URL}/leads`);
    url.searchParams.set("documentType", "DNI");
    url.searchParams.set("documentNumber", String(input.dni));

    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${process.env.OKA_LEADS_TOKEN}`,
      },
    });

    if (!res.ok) {
      console.log(res);
      throw new Error(`consultar_leads respondió ${res.status}`);
    }

    return res.json();
  },
};

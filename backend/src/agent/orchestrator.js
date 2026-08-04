const Groq = require("groq-sdk");
const { SYSTEM_PROMPT } = require("./prompts");
const leadsTool = require("./tools/leads.tool");
const segurosTool = require("./tools/seguros.tool");
const salesTool = require("./tools/sales.tool");
const customerTool = require("./tools/customer.tool");

const MODEL = "openai/gpt-oss-120b";
const MAX_TOOL_ROUNDS = 5;

const client = new Groq();

const TOOLS_BY_NAME = {
  [leadsTool.definition.name]: leadsTool,
  [segurosTool.definition.name]: segurosTool,
  [salesTool.definition.name]: salesTool,
  [customerTool.definition.name]: customerTool,
};

const TOOL_SPECS = Object.values(TOOLS_BY_NAME).map((t) => ({
  type: "function",
  function: {
    name: t.definition.name,
    description: t.definition.description,
    parameters: t.definition.input_schema,
  },
}));

async function executeTool(name, input) {
  const tool = TOOLS_BY_NAME[name];
  if (!tool) throw new Error(`Herramienta desconocida: ${name}`);
  return tool.execute(input);
}

async function createCompletion(messages) {
  return client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages,
    tools: TOOL_SPECS,
  });
}

function findLastToolCall(messages, toolNames) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant" || !Array.isArray(message.tool_calls)) continue;

    const call = message.tool_calls.find((c) => toolNames.includes(c.function.name));
    if (!call) continue;

    const resultMessage = messages.find(
      (m) => m.role === "tool" && m.tool_call_id === call.id,
    );
    if (!resultMessage) continue;

    return {
      name: call.function.name,
      args: JSON.parse(call.function.arguments),
      result: JSON.parse(resultMessage.content),
    };
  }
  return null;
}

function buildUi(messages) {
  const last = findLastToolCall(messages, [
    "convertir_lead_a_loan",
    "simular_seguro",
    "consultar_leads",
  ]);
  if (!last) return null;

  switch (last.name) {
    case "consultar_leads": {
      const leads = Array.isArray(last.result) ? last.result : [];
      const activeLeads = leads.filter((lead) => lead.status === "ACTIVE");
      if (!activeLeads.length) return null;

      const PRODUCT_BY_SUBTYPE = {
        BNPL: {
          id: "credito_oka",
          label: "Crédito Oka",
          description:
            "Renueva tu hogar hoy y paga en cómodas cuotas. Electrodomésticos y tecnología en Hiraoka, sin esperar.",
          tag: "Exclusivo Hiraoka",
          icon: "🛋️",
        },
        LD: {
          id: "efectivo_oka",
          label: "Efectivo Oka",
          description:
            "Dinero en tu cuenta en minutos, sin explicaciones. Úsalo como tú decidas: emergencia, viaje o lo que necesites.",
          tag: "Libre disponibilidad",
          icon: "💵",
        },
      };

      const options = activeLeads
        .map((lead) => {
          const product = PRODUCT_BY_SUBTYPE[lead.product?.subType];
          if (!product) return null;
          return { leadId: lead.id, subType: lead.product.subType, ...product };
        })
        .filter(Boolean);

      if (!options.length) return null;

      return { type: "product_selector", options };
    }

    case "simular_seguro": {
      const r = last.result || {};
      return {
        type: "insurance_selector",
        monto: last.args.monto,
        plazo: last.args.plazo,
        cuotaSinSeguro: r.cuota_sin_seguro,
        cuotaConSeguros: r.cuota_con_seguros,
        tcea: r.tcea,
        options: [
          {
            id: "vida_plus",
            label: "Vida Plus",
            prima: r.seguro_vida_plus?.prima,
            descripcion: r.seguro_vida_plus?.descripcion,
          },
          {
            id: "desempleo",
            label: "Desempleo",
            prima: r.seguro_desempleo?.prima,
            descripcion: r.seguro_desempleo?.descripcion,
          },
        ],
      };
    }

    case "convertir_lead_a_loan": {
      const url = last.result?.url_onboarding;
      return url ? { type: "onboarding_redirect", url } : null;
    }

    default:
      return null;
  }
}

async function runConversation(history) {
  let messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
  let response = await createCompletion(messages);
  let rounds = 0;

  while (response.choices[0].message.tool_calls?.length && rounds < MAX_TOOL_ROUNDS) {
    rounds += 1;
    const { message } = response.choices[0];
    messages = [...messages, message];

    const toolMessages = await Promise.all(
      message.tool_calls.map(async (call) => {
        try {
          const input = JSON.parse(call.function.arguments);
          const result = await executeTool(call.function.name, input);
          return {
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result),
          };
        } catch (err) {
          console.error(`Tool ${call.function.name} falló:`, err.message);
          return {
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: err.message }),
          };
        }
      }),
    );

    messages = [...messages, ...toolMessages];
    response = await createCompletion(messages);
  }

  const finalMessage = {
    role: "assistant",
    content:
      response.choices[0].message.content ??
      "Lo siento, no pude procesar tu solicitud en este momento. Intenta de nuevo.",
  };
  messages = [...messages, finalMessage];

  const updatedHistory = messages.slice(1); // sin el system prompt

  return {
    reply: finalMessage.content,
    ui: buildUi(messages),
    messages: updatedHistory,
  };
}

module.exports = { runConversation };

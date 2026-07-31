const Groq = require("groq-sdk");
const { SYSTEM_PROMPT } = require("./prompts");
const leadsTool = require("./tools/leads.tool");
const segurosTool = require("./tools/seguros.tool");
const salesTool = require("./tools/sales.tool");

const MODEL = "openai/gpt-oss-120b";
const MAX_TOOL_ROUNDS = 5;

const client = new Groq();

const TOOLS_BY_NAME = {
  [leadsTool.definition.name]: leadsTool,
  [segurosTool.definition.name]: segurosTool,
  [salesTool.definition.name]: salesTool,
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

  return (
    response.choices[0].message.content ??
    "Lo siento, no pude procesar tu solicitud en este momento. Intenta de nuevo."
  );
}

module.exports = { runConversation };

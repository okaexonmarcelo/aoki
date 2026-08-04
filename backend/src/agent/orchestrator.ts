import Groq from "groq-sdk";
import { SYSTEM_PROMPT } from "./prompts";
import { createSaleTool } from "./tools/create-sale.tool";
import { customerTool } from "./tools/customer.tool";
import { leadsTool } from "./tools/leads.tool";
import { simulateCreditTool } from "./tools/simulate-credit.tool";

export type ChatMessage = Groq.Chat.ChatCompletionMessageParam;
type ToolMessage = Groq.Chat.ChatCompletionToolMessageParam;
type ToolSpec = Groq.Chat.ChatCompletionTool;

const MODEL = "openai/gpt-oss-120b";
const MAX_TOOL_ROUNDS = 5;

const client = new Groq();

const TOOLS_BY_NAME = {
  [leadsTool.definition.name]: leadsTool,
  [createSaleTool.definition.name]: createSaleTool,
  [customerTool.definition.name]: customerTool,
  [simulateCreditTool.definition.name]: simulateCreditTool,
};

type ToolName = keyof typeof TOOLS_BY_NAME;

const TOOL_SPECS: ToolSpec[] = Object.values(TOOLS_BY_NAME).map((t) => ({
  type: "function",
  function: {
    name: t.definition.name,
    description: t.definition.description,
    parameters: t.definition.input_schema,
  },
}));

async function executeTool(name: string, rawInput: unknown): Promise<unknown> {
  const tool = TOOLS_BY_NAME[name as ToolName];
  if (!tool) throw new Error(`Herramienta desconocida: ${name}`);

  const parsed = tool.schema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Input inválido para ${name}: ${parsed.error.message}`);
  }

  // Each tool's `execute` expects its own specific input type, but `TOOLS_BY_NAME`
  // is a heterogeneous union dispatched by runtime tool name — the schema.safeParse
  // above is what actually guarantees `parsed.data` matches this tool's shape.
  return tool.execute(parsed.data as never);
}

async function createCompletion(messages: ChatMessage[]) {
  return client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages,
    tools: TOOL_SPECS,
  });
}

interface ToolCallRecord<TName extends string> {
  name: TName;
  args: any;
  result: any;
}

function findLastToolCall<T extends readonly ToolName[]>(
  messages: ChatMessage[],
  toolNames: T,
): ToolCallRecord<T[number]> | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant" || !Array.isArray(message.tool_calls)) continue;

    const call = message.tool_calls.find((c) => toolNames.includes(c.function.name as T[number]));
    if (!call) continue;

    const resultMessage = messages.find(
      (m): m is ToolMessage => m.role === "tool" && m.tool_call_id === call.id,
    );
    if (!resultMessage) continue;

    return {
      name: call.function.name as T[number],
      args: JSON.parse(call.function.arguments),
      result: JSON.parse(resultMessage.content as string),
    };
  }
  return null;
}

interface ProductOption {
  leadId: string;
  subType: string;
  id: string;
  label: string;
  description: string;
  tag: string;
  icon: string;
}

interface CreditSimulationOption {
  term: number;
  monthlyPayment: number;
  interestRate: number;
  totalRate: number;
  totalPayment: number;
}

export type UiPayload =
  | { type: "product_selector"; options: ProductOption[] }
  | {
      type: "credit_simulator";
      leadId: string;
      customerId: string;
      amount: number;
      minAmount: number;
      maxAmount: number;
      step: number;
      paymentDay: number;
      productLabel: string;
      options: CreditSimulationOption[];
    }
  | { type: "sale_success"; saleId: string }
  | null;

const PRODUCT_BY_SUBTYPE: Record<string, Omit<ProductOption, "leadId" | "subType">> = {
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

export function buildUi(messages: ChatMessage[]): UiPayload {
  const last = findLastToolCall(messages, [
    "create_sale",
    "simulate_credit",
    "consultar_leads",
  ] as const);
  if (!last) return null;

  switch (last.name) {
    case "consultar_leads": {
      const leads = Array.isArray(last.result) ? last.result : [];
      const activeLeads = leads.filter((lead: any) => lead.status === "ACTIVE");
      if (!activeLeads.length) return null;

      const options: ProductOption[] = activeLeads
        .map((lead: any) => {
          const product = PRODUCT_BY_SUBTYPE[lead.product?.subType];
          if (!product) return null;
          return { leadId: lead.id, subType: lead.product.subType, ...product };
        })
        .filter((option: ProductOption | null): option is ProductOption => option !== null);

      if (!options.length) return null;

      return { type: "product_selector", options };
    }

    case "simulate_credit": {
      const simulations = Array.isArray(last.result) ? last.result : [];
      if (!simulations.length) return null;

      const leadsCall = findLastToolCall(messages, ["consultar_leads"] as const);
      const leads = Array.isArray(leadsCall?.result) ? leadsCall.result : [];
      const lead = leads.find((l: any) => l.id === last.args.lead_id);
      const maxAmount = lead?.amount ?? last.args.amount;
      const productLabel = PRODUCT_BY_SUBTYPE[lead?.product?.subType]?.label ?? "Crédito Oka";

      return {
        type: "credit_simulator",
        leadId: last.args.lead_id,
        customerId: last.args.customer_id,
        amount: last.args.amount,
        minAmount: 500,
        maxAmount,
        step: 100,
        paymentDay: last.args.payment_day,
        productLabel,
        options: simulations.map((s: any) => ({
          term: s.term,
          monthlyPayment: s.monthlyPayment,
          interestRate: s.interestRate,
          totalRate: s.totalRate,
          totalPayment: s.totalPayment,
        })),
      };
    }

    case "create_sale": {
      const saleId = last.result?.id;
      return saleId ? { type: "sale_success", saleId } : null;
    }

    default: {
      const _exhaustive: never = last.name;
      return _exhaustive;
    }
  }
}

export interface RunConversationResult {
  reply: string;
  ui: UiPayload;
  messages: ChatMessage[];
}

export async function runConversation(history: ChatMessage[]): Promise<RunConversationResult> {
  let messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
  let response = await createCompletion(messages);
  let rounds = 0;

  while (response.choices[0].message.tool_calls?.length && rounds < MAX_TOOL_ROUNDS) {
    rounds += 1;
    const { message } = response.choices[0];
    messages = [...messages, message];

    const toolMessages: ToolMessage[] = await Promise.all(
      message.tool_calls!.map(async (call): Promise<ToolMessage> => {
        try {
          const input = JSON.parse(call.function.arguments);
          const result = await executeTool(call.function.name, input);
          return {
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result),
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Tool ${call.function.name} falló:`, message);
          return {
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: message }),
          };
        }
      }),
    );

    messages = [...messages, ...toolMessages];
    response = await createCompletion(messages);
  }

  const finalMessage: ChatMessage = {
    role: "assistant",
    content:
      response.choices[0].message.content ??
      "Lo siento, no pude procesar tu solicitud en este momento. Intenta de nuevo.",
  };
  messages = [...messages, finalMessage];

  const updatedHistory = messages.slice(1); // sin el system prompt

  return {
    reply: finalMessage.content as string,
    ui: buildUi(messages),
    messages: updatedHistory,
  };
}

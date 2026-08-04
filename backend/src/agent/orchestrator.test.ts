import { describe, expect, it } from "vitest";
import { buildUi, type ChatMessage } from "./orchestrator";

function toolCallMessages(
  name: string,
  args: unknown,
  result: unknown,
): ChatMessage[] {
  const callId = `call_${name}`;
  return [
    {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: callId,
          type: "function",
          function: { name, arguments: JSON.stringify(args) },
        },
      ],
    },
    {
      role: "tool",
      tool_call_id: callId,
      content: JSON.stringify(result),
    },
  ];
}

describe("buildUi", () => {
  it("returns null when no relevant tool was called", () => {
    const messages: ChatMessage[] = [{ role: "user", content: "hola" }];
    expect(buildUi(messages)).toBeNull();
  });

  it("returns null when consultar_leads has no active leads", () => {
    const messages = toolCallMessages("consultar_leads", { dni: "12345678" }, []);
    expect(buildUi(messages)).toBeNull();
  });

  it("builds a product_selector from active leads", () => {
    const messages = toolCallMessages("consultar_leads", { dni: "12345678" }, [
      { id: "lead-1", status: "ACTIVE", amount: 5000, product: { subType: "BNPL" } },
      { id: "lead-2", status: "INACTIVE", amount: 1000, product: { subType: "LD" } },
    ]);

    const ui = buildUi(messages);
    expect(ui).toEqual({
      type: "product_selector",
      options: [
        {
          leadId: "lead-1",
          subType: "BNPL",
          id: "credito_oka",
          label: "Crédito Oka",
          description: expect.any(String),
          tag: "Exclusivo Hiraoka",
          icon: "🛋️",
        },
      ],
    });
  });

  it("builds a credit_simulator from simulate_credit results", () => {
    const messages = toolCallMessages(
      "simulate_credit",
      { customer_id: "cust-1", lead_id: "lead-1", amount: 3000, payment_day: 15 },
      [{ term: 12, monthlyPayment: 300, interestRate: 0.1, totalRate: 0.2, totalPayment: 3600 }],
    );

    const ui = buildUi(messages);
    expect(ui).toEqual({
      type: "credit_simulator",
      leadId: "lead-1",
      customerId: "cust-1",
      amount: 3000,
      minAmount: 500,
      maxAmount: 3000,
      step: 100,
      paymentDay: 15,
      productLabel: "Crédito Oka",
      options: [
        { term: 12, monthlyPayment: 300, interestRate: 0.1, totalRate: 0.2, totalPayment: 3600 },
      ],
    });
  });

  it("resolves productLabel from consultar_leads when cross-referenced", () => {
    const messages = [
      ...toolCallMessages(
        "consultar_leads",
        { dni: "12345678" },
        [{ id: "lead-1", status: "ACTIVE", amount: 5000, product: { subType: "LD" } }],
      ),
      ...toolCallMessages(
        "simulate_credit",
        { customer_id: "cust-1", lead_id: "lead-1", amount: 3000, payment_day: 15 },
        [{ term: 12, monthlyPayment: 300, interestRate: 0.1, totalRate: 0.2, totalPayment: 3600 }],
      ),
    ];

    const ui = buildUi(messages);
    expect(ui).toMatchObject({ type: "credit_simulator", productLabel: "Efectivo Oka" });
  });

  it("returns null when simulate_credit has no options", () => {
    const messages = toolCallMessages(
      "simulate_credit",
      { customer_id: "cust-1", lead_id: "lead-1", amount: 3000 },
      [],
    );
    expect(buildUi(messages)).toBeNull();
  });

  it("builds a sale_success from create_sale results", () => {
    const messages = toolCallMessages(
      "create_sale",
      { lead_id: "lead-1", customer_id: "cust-1", amount: 3000, term: 12, payment_day: 15 },
      { id: "cf01bb81-9500-4ea7-bf84-a11f03e887bb" },
    );

    expect(buildUi(messages)).toEqual({
      type: "sale_success",
      saleId: "cf01bb81-9500-4ea7-bf84-a11f03e887bb",
    });
  });

  it("returns null when create_sale has no id", () => {
    const messages = toolCallMessages(
      "create_sale",
      { lead_id: "lead-1", customer_id: "cust-1", amount: 3000, term: 12, payment_day: 15 },
      {},
    );
    expect(buildUi(messages)).toBeNull();
  });
});

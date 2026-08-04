import { describe, expect, it } from "vitest";
import { createSaleTool } from "./create-sale.tool";
import { customerTool } from "./customer.tool";
import { leadsTool } from "./leads.tool";
import { simulateCreditTool } from "./simulate-credit.tool";

describe("customerTool schema", () => {
  it("accepts a valid input", () => {
    expect(customerTool.schema.safeParse({ type: "DNI", number: "12345678" }).success).toBe(true);
  });

  it("rejects a missing field", () => {
    expect(customerTool.schema.safeParse({ type: "DNI" }).success).toBe(false);
  });
});

describe("leadsTool schema", () => {
  it("accepts a valid input", () => {
    expect(leadsTool.schema.safeParse({ dni: "12345678" }).success).toBe(true);
  });

  it("rejects a missing field", () => {
    expect(leadsTool.schema.safeParse({}).success).toBe(false);
  });
});

describe("createSaleTool schema", () => {
  it("accepts a valid input", () => {
    expect(
      createSaleTool.schema.safeParse({
        lead_id: "lead-1",
        customer_id: "cust-1",
        amount: 3000,
        term: 12,
        payment_day: 15,
      }).success,
    ).toBe(true);
  });

  it("rejects a missing required field", () => {
    expect(
      createSaleTool.schema.safeParse({
        lead_id: "lead-1",
        customer_id: "cust-1",
        amount: 3000,
        term: 12,
      }).success,
    ).toBe(false);
  });
});

describe("simulateCreditTool schema", () => {
  it("accepts a valid input", () => {
    expect(
      simulateCreditTool.schema.safeParse({
        customer_id: "cust-1",
        lead_id: "lead-1",
        amount: 3000,
      }).success,
    ).toBe(true);
  });

  it("rejects a missing required field", () => {
    expect(
      simulateCreditTool.schema.safeParse({ customer_id: "cust-1", amount: 3000 }).success,
    ).toBe(false);
  });
});

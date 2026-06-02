import { describe, test, expect } from "bun:test";
describe("agent-budget-enforcer", () => {
  test("module loads", async () => { const m = await import("./index"); expect(m).toBeDefined(); });
});

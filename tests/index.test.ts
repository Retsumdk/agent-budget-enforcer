import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { BudgetEnforcer } from "../src/core/enforcer";
import { UsageTracker } from "../src/core/tracker";
import { BudgetLimits, BudgetWindow } from "../src/types";
import { getCost } from "../src/models/pricing";
import { rmSync, existsSync } from "fs";
import { join } from "path";

describe("agent-budget-enforcer", () => {
  const testStorage = "data/test-usage.jsonl";
  let tracker: UsageTracker;
  let enforcer: BudgetEnforcer;
  const limits: BudgetLimits = {
    daily: 1.00,
    monthly: 10.00,
    perRequest: 0.10
  };

  beforeEach(() => {
    tracker = new UsageTracker(testStorage);
    enforcer = new BudgetEnforcer(limits, tracker);
  });

  afterEach(() => {
    if (existsSync(join(process.cwd(), testStorage))) {
      rmSync(join(process.cwd(), testStorage));
    }
  });

  test("should calculate cost correctly", () => {
    const cost = getCost("gpt-4o", 1000000, 1000000); // 1M each
    expect(cost).toBe(20.00); // 5 + 15
  });

  test("should record and track usage", async () => {
    await enforcer.record("gpt-4o", 1000, 1000); // small cost
    const status = enforcer.getStatus();
    expect(status.dailyUsed).toBeGreaterThan(0);
    expect(status.dailyRemaining).toBeLessThan(limits.daily);
  });

  test("should enforce per-request limits", () => {
    // Large request should be denied
    const canRunLarge = enforcer.canExecute(50000, "gpt-4o"); // ~0.25 USD prompt, exceeds 0.10 limit
    expect(canRunLarge).toBe(false);

    // Small request should be allowed
    const canRunSmall = enforcer.canExecute(100, "gpt-4o-mini");
    expect(canRunSmall).toBe(true);
  });

  test("should enforce daily limits", async () => {
    // Record a large usage that almost hits the daily limit
    await enforcer.record("gpt-4o", 150000, 10000); // ~0.75 + 0.15 = 0.90
    
    expect(enforcer.canExecute(10000, "gpt-4o")).toBe(true); // Should still have ~0.10 left
    
    // Record another 0.10
    await enforcer.record("gpt-4o", 20000, 0); // 0.10
    
    // Now should be at limit
    expect(enforcer.canExecute(100, "gpt-4o")).toBe(false);
  });

  test("should handle daily vs monthly windows", async () => {
    // Record something today
    await enforcer.record("gpt-4o", 1000, 1000);
    
    const status = enforcer.getStatus();
    expect(status.dailyUsed).toBe(status.monthlyUsed);
  });

  test("should allow updating limits", () => {
    enforcer.updateLimits({ daily: 5.00 });
    const status = enforcer.getStatus();
    expect(status.dailyRemaining).toBeGreaterThan(4.00);
  });
});

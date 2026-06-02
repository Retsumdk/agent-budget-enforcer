#!/usr/bin/env bun
/**
 * agent-budget-enforcer - Real-time monitoring and enforcement of compute/API budgets for autonomous agents
 * Built by Retsumdk
 */

import { Command } from "commander";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { BudgetEnforcer } from "./core/enforcer";
import { UsageTracker } from "./core/tracker";
import { BudgetLimits, BudgetWindow } from "./types";
import { formatCurrency } from "./models/pricing";

const DEFAULT_LIMITS: BudgetLimits = {
  daily: 5.00,      // $5.00 per day
  monthly: 100.00,  // $100.00 per month
  perRequest: 0.50  // $0.50 per request
};

const CONFIG_PATH = join(process.cwd(), "config.json");

function loadLimits(): BudgetLimits {
  if (existsSync(CONFIG_PATH)) {
    try {
      const data = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      return { ...DEFAULT_LIMITS, ...data.limits };
    } catch {
      return DEFAULT_LIMITS;
    }
  }
  return DEFAULT_LIMITS;
}

function saveLimits(limits: BudgetLimits) {
  const config = existsSync(CONFIG_PATH) 
    ? JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) 
    : {};
  config.limits = limits;
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

const tracker = new UsageTracker();
const limits = loadLimits();
const enforcer = new BudgetEnforcer(limits, tracker);

const program = new Command();

program
  .name("agent-budget-enforcer")
  .description("Real-time monitoring and enforcement of compute/API budgets for autonomous agents")
  .version("1.0.0");

program
  .command("status")
  .description("Show current budget status")
  .action(() => {
    const status = enforcer.getStatus();
    console.log("\n--- Budget Status ---");
    console.log(`Daily Used:   ${formatCurrency(status.dailyUsed)} / ${formatCurrency(limits.daily)}`);
    console.log(`Monthly Used: ${formatCurrency(status.monthlyUsed)} / ${formatCurrency(limits.monthly)}`);
    console.log(`Remaining:    ${formatCurrency(status.dailyRemaining)} (Daily) | ${formatCurrency(status.monthlyRemaining)} (Monthly)`);
    console.log(`Exceeded:     ${status.exceeded ? "YES ⚠️" : "NO ✅"}`);
    console.log("---------------------\n");
  });

program
  .command("record")
  .description("Record a usage event")
  .requiredOption("-m, --model <model>", "Model used (e.g., gpt-4o)")
  .requiredOption("-p, --prompt <tokens>", "Prompt tokens", parseInt)
  .requiredOption("-c, --completion <tokens>", "Completion tokens", parseInt)
  .option("-t, --tags <tags>", "Comma-separated tags")
  .action(async (opts) => {
    const record = await enforcer.record(opts.model, opts.prompt, opts.completion, {
      tags: opts.tags?.split(",")
    });
    console.log(`Recorded usage: ${formatCurrency(record.cost)} (${opts.model})`);
  });

program
  .command("check")
  .description("Check if a request is within budget")
  .option("-m, --model <model>", "Model to check", "gpt-4o")
  .option("-p, --prompt <tokens>", "Estimated prompt tokens", parseInt, 1000)
  .action((opts) => {
    const canExecute = enforcer.canExecute(opts.prompt, opts.model);
    if (canExecute) {
      console.log("✅ Request allowed within budget.");
    } else {
      console.log("❌ Request denied. Budget exceeded.");
      process.exit(1);
    }
  });

program
  .command("set-limit")
  .description("Set budget limits")
  .option("-d, --daily <amount>", "Daily limit in USD", parseFloat)
  .option("-m, --monthly <amount>", "Monthly limit in USD", parseFloat)
  .option("-r, --request <amount>", "Per-request limit in USD", parseFloat)
  .action((opts) => {
    const newLimits = { ...limits };
    if (opts.daily !== undefined) newLimits.daily = opts.daily;
    if (opts.monthly !== undefined) newLimits.monthly = opts.monthly;
    if (opts.request !== undefined) newLimits.perRequest = opts.request;
    
    saveLimits(newLimits);
    console.log("Budget limits updated.");
  });

program
  .command("history")
  .description("Show usage history")
  .option("-l, --limit <number>", "Number of records to show", parseInt, 10)
  .action((opts) => {
    const records = tracker.getAllRecords().slice(-opts.limit).reverse();
    console.log(`\n--- Last ${records.length} Records ---`);
    records.forEach(r => {
      console.log(`[${r.timestamp}] ${r.model}: ${formatCurrency(r.cost)} (${r.promptTokens}/${r.completionTokens} tokens)`);
    });
    console.log("------------------------\n");
  });

program.parse(process.argv);

import { BudgetLimits, BudgetStatus, BudgetWindow, UsageRecord } from "../types";
import { UsageTracker } from "./tracker";
import { getCost } from "../models/pricing";

/**
 * BudgetEnforcer provides the core logic for monitoring and enforcing
 * spending limits for AI agent operations.
 */
export class BudgetEnforcer {
  private tracker: UsageTracker;
  private limits: BudgetLimits;

  /**
   * @param limits - The budget limits to enforce
   * @param tracker - The usage tracker instance for persistence
   */
  constructor(limits: BudgetLimits, tracker: UsageTracker) {
    this.limits = limits;
    this.tracker = tracker;
  }

  /**
   * Returns the current status of the budget.
   */
  public getStatus(): BudgetStatus {
    const dailyUsed = this.tracker.getUsage(BudgetWindow.DAILY);
    const monthlyUsed = this.tracker.getUsage(BudgetWindow.MONTHLY);

    return {
      dailyUsed,
      monthlyUsed,
      dailyRemaining: Math.max(0, this.limits.daily - dailyUsed),
      monthlyRemaining: Math.max(0, this.limits.monthly - monthlyUsed),
      exceeded: dailyUsed >= this.limits.daily || monthlyUsed >= this.limits.monthly
    };
  }

  /**
   * Checks if a request can be executed without exceeding budget limits.
   * @param estimatedPromptTokens - Estimated tokens for the prompt
   * @param model - The model to be used
   * @returns true if the request is within budget, false otherwise
   */
  public canExecute(estimatedPromptTokens: number = 1000, model: string = "gpt-4o"): boolean {
    const status = this.getStatus();
    
    // If we've already exceeded daily or monthly limits, block immediately
    if (status.exceeded) {
      return false;
    }

    // Estimate cost of this request (assuming 1k completion tokens as a safe upper bound)
    const estimatedCost = getCost(model, estimatedPromptTokens, 1000);
    
    // Check if the single request exceeds the per-request limit
    if (estimatedCost > this.limits.perRequest) {
      return false;
    }

    // Check if adding this request would tip the daily budget over
    if (status.dailyUsed + estimatedCost > this.limits.daily) {
      return false;
    }
    
    return true;
  }

  /**
   * Records the actual usage after an API call completes.
   * @param model - The model used
   * @param promptTokens - Actual prompt tokens consumed
   * @param completionTokens - Actual completion tokens consumed
   * @param metadata - Optional metadata about the request
   */
  public async record(
    model: string, 
    promptTokens: number, 
    completionTokens: number, 
    metadata?: any
  ): Promise<UsageRecord> {
    const cost = getCost(model, promptTokens, completionTokens);
    
    const record: UsageRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      model,
      promptTokens,
      completionTokens,
      cost,
      metadata
    };
    
    this.tracker.recordUsage(record);
    return record;
  }

  /**
   * Updates the enforcement limits dynamically.
   * @param limits - Partial or full budget limits
   */
  public updateLimits(limits: Partial<BudgetLimits>): void {
    this.limits = { ...this.limits, ...limits };
  }

  /**
   * Resets the usage tracking (proxied to tracker).
   */
  public resetUsage(): void {
    this.tracker.clearUsage();
  }
}

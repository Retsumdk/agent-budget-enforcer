export interface ModelPricing {
  prompt: number; // cost per 1M tokens in USD
  completion: number; // cost per 1M tokens in USD
}

export interface UsageRecord {
  id: string;
  timestamp: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface BudgetLimits {
  daily: number;
  monthly: number;
  perRequest: number;
}

export interface BudgetStatus {
  dailyUsed: number;
  monthlyUsed: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  exceeded: boolean;
}

export enum BudgetWindow {
  DAILY = "daily",
  MONTHLY = "monthly"
}

import { ModelPricing } from "../types";

export const PRICING_DATA: Record<string, ModelPricing> = {
  "gpt-4o": {
    prompt: 5.00,
    completion: 15.00
  },
  "gpt-4o-mini": {
    prompt: 0.15,
    completion: 0.60
  },
  "claude-3-5-sonnet-20240620": {
    prompt: 3.00,
    completion: 15.00
  },
  "claude-3-opus-20240229": {
    prompt: 15.00,
    completion: 75.00
  },
  "claude-3-haiku-20240307": {
    prompt: 0.25,
    completion: 1.25
  },
  "gemini-1.5-pro": {
    prompt: 3.50,
    completion: 10.50
  },
  "gemini-1.5-flash": {
    prompt: 0.075,
    completion: 0.30
  }
};

/**
 * Calculates the cost of a request based on the model and token usage.
 * @param model - The model identifier
 * @param promptTokens - Number of input tokens
 * @param completionTokens - Number of output tokens
 * @returns Total cost in USD
 */
export function getCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING_DATA[model] || PRICING_DATA["gpt-4o"]; // Fallback to gpt-4o pricing
  
  const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
  const completionCost = (completionTokens / 1_000_000) * pricing.completion;
  
  return promptCost + completionCost;
}

/**
 * Helper to format currency values.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4
  }).format(value);
}

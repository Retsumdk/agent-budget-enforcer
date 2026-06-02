import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { UsageRecord, BudgetWindow } from "../types";

/**
 * UsageTracker handles the persistence and retrieval of agent usage data.
 * It uses a JSONL (JSON Lines) format for efficient append-only logging.
 */
export class UsageTracker {
  private storagePath: string;

  constructor(storagePath: string = "data/usage.jsonl") {
    // Resolve relative to current working directory if not absolute
    this.storagePath = join(process.cwd(), storagePath);
    this.ensureStorage();
  }

  /**
   * Ensures the storage directory and file exist.
   */
  private ensureStorage() {
    const dir = dirname(this.storagePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (!existsSync(this.storagePath)) {
      writeFileSync(this.storagePath, "");
    }
  }

  /**
   * Records a new usage event to the log.
   */
  public recordUsage(record: UsageRecord): void {
    try {
      appendFileSync(this.storagePath, JSON.stringify(record) + "\n");
    } catch (error) {
      console.error(`[UsageTracker] Failed to record usage: ${error}`);
    }
  }

  /**
   * Calculates total cost used within a specific budget window.
   */
  public getUsage(window: BudgetWindow): number {
    if (!existsSync(this.storagePath)) return 0;
    
    const lines = readFileSync(this.storagePath, "utf-8").split("\n").filter(Boolean);
    const now = new Date();
    let total = 0;

    for (const line of lines) {
      try {
        const record: UsageRecord = JSON.parse(line);
        const recordDate = new Date(record.timestamp);

        if (window === BudgetWindow.DAILY) {
          if (this.isSameDay(recordDate, now)) {
            total += record.cost;
          }
        } else if (window === BudgetWindow.MONTHLY) {
          if (this.isSameMonth(recordDate, now)) {
            total += record.cost;
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }

    return total;
  }

  /**
   * Retrieves all recorded usage entries.
   */
  public getAllRecords(): UsageRecord[] {
    if (!existsSync(this.storagePath)) return [];
    try {
      return readFileSync(this.storagePath, "utf-8")
        .split("\n")
        .filter(Boolean)
        .map(line => JSON.parse(line));
    } catch (error) {
      console.error(`[UsageTracker] Failed to read records: ${error}`);
      return [];
    }
  }

  /**
   * Clears all recorded usage (use with caution).
   */
  public clearUsage(): void {
    writeFileSync(this.storagePath, "");
  }

  private isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  private isSameMonth(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth();
  }
}

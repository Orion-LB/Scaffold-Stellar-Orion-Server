// bots/shared/borrower-registry.ts
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface BorrowerRegistryData {
  borrowers: string[];
  last_updated: string;
  version: string;
}

/**
 * Shared borrower registry used by both Auto-Repay and Liquidation bots
 * Maintains a list of all active borrowers in the system
 */
export class BorrowerRegistry {
  private static REGISTRY_PATH = join(__dirname, "./borrowers.json");
  private data!: BorrowerRegistryData;

  constructor() {
    this.load();
  }

  /**
   * Load borrowers from JSON file
   */
  load(): void {
    try {
      const content = readFileSync(BorrowerRegistry.REGISTRY_PATH, "utf-8");
      this.data = JSON.parse(content);
    } catch (error) {
      console.warn("Failed to load borrower registry, initializing empty");
      this.data = {
        borrowers: [],
        last_updated: new Date().toISOString(),
        version: "1.0.0",
      };
      this.save();
    }
  }

  /**
   * Save borrowers to JSON file
   */
  save(): void {
    this.data.last_updated = new Date().toISOString();
    try {
      writeFileSync(
        BorrowerRegistry.REGISTRY_PATH,
        JSON.stringify(this.data, null, 2),
      );
    } catch (error) {
      console.error("Failed to save borrower registry:", error);
    }
  }

  /**
   * Add a borrower to the registry
   */
  addBorrower(address: string): void {
    if (!this.hasBorrower(address)) {
      this.data.borrowers.push(address);
      this.save();
      console.log(`Added borrower to registry: ${address}`);
    }
  }

  /**
   * Remove a borrower from the registry (e.g., after liquidation)
   */
  removeBorrower(address: string): void {
    const index = this.data.borrowers.indexOf(address);
    if (index !== -1) {
      this.data.borrowers.splice(index, 1);
      this.save();
      console.log(`Removed borrower from registry: ${address}`);
    }
  }

  /**
   * Get all borrowers
   */
  getBorrowers(): string[] {
    return [...this.data.borrowers];
  }

  /**
   * Check if a borrower exists in the registry
   */
  hasBorrower(address: string): boolean {
    return this.data.borrowers.includes(address);
  }

  /**
   * Get count of borrowers
   */
  getCount(): number {
    return this.data.borrowers.length;
  }

  /**
   * Clear all borrowers (use with caution)
   */
  clear(): void {
    this.data.borrowers = [];
    this.save();
    console.log("Cleared all borrowers from registry");
  }

  /**
   * Get registry metadata
   */
  getMetadata(): { lastUpdated: string; version: string; count: number } {
    return {
      lastUpdated: this.data.last_updated,
      version: this.data.version,
      count: this.data.borrowers.length,
    };
  }
}

// Export singleton instance
export const borrowerRegistry = new BorrowerRegistry();

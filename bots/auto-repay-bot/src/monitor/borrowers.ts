// bots/auto-repay-bot/src/monitor/borrowers.ts
import * as fs from 'fs/promises';
import { NetworkConfig } from '../config/network';
import { Contract } from '@stellar/stellar-sdk';

export class BorrowerTracker {
  private borrowers: Set<string> = new Set();
  private lendingPool: Contract;

  constructor(private config: NetworkConfig) {
    this.lendingPool = new Contract(config.lendingPoolContractId);
  }

  async loadBorrowers(): Promise<void> {
    try {
        const data = await fs.readFile('borrowers.json', 'utf-8');
        const borrowers = JSON.parse(data);
        this.borrowers = new Set(borrowers);
    } catch (error) {
        // If the file doesn't exist, we'll start with an empty set
        this.borrowers = new Set();
    }
  }

  async addBorrower(address: string): Promise<void> {
    if (!this.borrowers.has(address)) {
      this.borrowers.add(address);
      await fs.writeFile('borrowers.json', JSON.stringify(Array.from(this.borrowers), null, 2));
    }
  }

  getBorrowers(): string[] {
    return Array.from(this.borrowers);
  }
}

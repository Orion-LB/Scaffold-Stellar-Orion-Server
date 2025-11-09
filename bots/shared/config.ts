// bots/shared/config.ts
import { readFileSync } from 'fs';
import { join } from 'path';

export interface DeployedContracts {
  network: string;
  contracts: {
    rwa_vault: string;
    lending_pool: string;
    oracle: string;
    strwa_token: string;
    usdc_token: string;
  };
  network_passphrase: string;
  rpc_url: string;
  deployed_at: string;
}

export class SharedConfig {
  private static instance: SharedConfig;
  public contracts: DeployedContracts;

  private constructor() {
    // Load from deployed-addresses.json
    const contractsPath = join(
      __dirname,
      '../../contracts/deployed-addresses.json'
    );

    try {
      this.contracts = JSON.parse(readFileSync(contractsPath, 'utf-8'));
    } catch (error) {
      throw new Error(
        `Failed to load contract addresses from ${contractsPath}. ` +
        `Make sure contracts are deployed and addresses are configured.`
      );
    }

    // Validate all contract IDs are set
    this.validateContracts();
  }

  private validateContracts(): void {
    const contractNames: Array<keyof DeployedContracts['contracts']> = [
      'rwa_vault',
      'lending_pool',
      'oracle',
      'strwa_token',
      'usdc_token',
    ];

    const missing: string[] = [];

    for (const name of contractNames) {
      const id = this.contracts.contracts[name];
      if (!id || id.startsWith('REPLACE_WITH_')) {
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing contract addresses for: ${missing.join(', ')}. ` +
        `Please deploy contracts and update contracts/deployed-addresses.json`
      );
    }
  }

  static getInstance(): SharedConfig {
    if (!SharedConfig.instance) {
      SharedConfig.instance = new SharedConfig();
    }
    return SharedConfig.instance;
  }

  getContractId(contractName: keyof DeployedContracts['contracts']): string {
    return this.contracts.contracts[contractName];
  }

  getNetworkPassphrase(): string {
    return this.contracts.network_passphrase;
  }

  getRpcUrl(): string {
    return this.contracts.rpc_url;
  }

  getNetwork(): string {
    return this.contracts.network;
  }

  getAllContracts(): DeployedContracts['contracts'] {
    return { ...this.contracts.contracts };
  }
}

// Export singleton instance
export const sharedConfig = SharedConfig.getInstance();

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sharedConfig = exports.SharedConfig = void 0;
// bots/shared/config.ts
const fs_1 = require("fs");
const path_1 = require("path");
class SharedConfig {
  constructor() {
    // Load from deployed-addresses.json
    const contractsPath = (0, path_1.join)(
      __dirname,
      "../../contracts/deployed-addresses.json",
    );
    try {
      this.contracts = JSON.parse(
        (0, fs_1.readFileSync)(contractsPath, "utf-8"),
      );
    } catch (error) {
      throw new Error(
        `Failed to load contract addresses from ${contractsPath}. ` +
          `Make sure contracts are deployed and addresses are configured.`,
      );
    }
    // Validate all contract IDs are set
    this.validateContracts();
  }
  validateContracts() {
    const contractNames = [
      "rwa_vault",
      "lending_pool",
      "oracle",
      "strwa_token",
      "usdc_token",
    ];
    const missing = [];
    for (const name of contractNames) {
      const id = this.contracts.contracts[name];
      if (!id || id.startsWith("REPLACE_WITH_")) {
        missing.push(name);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Missing contract addresses for: ${missing.join(", ")}. ` +
          `Please deploy contracts and update contracts/deployed-addresses.json`,
      );
    }
  }
  static getInstance() {
    if (!SharedConfig.instance) {
      SharedConfig.instance = new SharedConfig();
    }
    return SharedConfig.instance;
  }
  getContractId(contractName) {
    return this.contracts.contracts[contractName];
  }
  getNetworkPassphrase() {
    return this.contracts.network_passphrase;
  }
  getRpcUrl() {
    return this.contracts.rpc_url;
  }
  getNetwork() {
    return this.contracts.network;
  }
  getAllContracts() {
    return { ...this.contracts.contracts };
  }
}
exports.SharedConfig = SharedConfig;
// Export singleton instance
exports.sharedConfig = SharedConfig.getInstance();

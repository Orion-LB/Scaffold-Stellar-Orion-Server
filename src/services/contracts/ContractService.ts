import {
  Address,
  Contract,
  Operation,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  xdr,
  Account,
  Memo,
  rpc
} from "@stellar/stellar-sdk";

// Use rpc.Server from Stellar SDK
type RpcServer = rpc.Server;

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  result?: any;
}

export interface StellarWalletProvider {
  address: string;
  networkPassphrase: string;
  signTransaction: (xdr: string, options: SignOptions) => Promise<SignedTransaction>;
}

export interface SignOptions {
  address: string;
  networkPassphrase: string;
}

export interface SignedTransaction {
  signedTxXdr: string;
}

export interface ContractClientOptions {
  contractId: string;
  networkPassphrase: string;
  rpcUrl: string;
  wallet?: StellarWalletProvider;
}

export abstract class ContractService {
  protected contractId: string;
  protected networkPassphrase: string;
  protected rpcServer: RpcServer;
  protected wallet?: StellarWalletProvider;
  
  constructor(options: ContractClientOptions) {
    this.contractId = options.contractId;
    this.networkPassphrase = options.networkPassphrase;
    this.rpcServer = new rpc.Server(options.rpcUrl);
    this.wallet = options.wallet;
  }
  
  protected async invokeContract(
    method: string,
    params: Record<string, any>,
    wallet?: StellarWalletProvider
  ): Promise<TransactionResult> {
    try {
      const walletToUse = wallet || this.wallet;
      if (!walletToUse) {
        throw new Error('No wallet provided for transaction signing');
      }

      // Get user account info
      const account = await this.rpcServer.getAccount(walletToUse.address);
      
      // Convert parameters to ScVal format
      const args = this.convertArgsToScVal(params);
      
      // Create contract operation
      const contract = new Contract(this.contractId);
      const operation = contract.call(method, ...args);
      
      // Build transaction
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Simulate transaction first
      const simulateResult = await this.rpcServer.simulateTransaction(transaction);
      
      if (rpc.Api.isSimulationError(simulateResult)) {
        throw new Error(`Simulation failed: ${simulateResult.error}`);
      }

      // Prepare transaction (add auth and footprint)
      const preparedTx = await this.rpcServer.prepareTransaction(transaction);

      // Sign transaction
      const signedResult = await walletToUse.signTransaction(preparedTx.toXDR(), {
        address: walletToUse.address,
        networkPassphrase: this.networkPassphrase
      });

      // Parse the signed transaction XDR
      const signedTx = TransactionBuilder.fromXDR(signedResult.signedTxXdr, this.networkPassphrase);
      
      // Submit transaction
      const submitResult = await this.rpcServer.sendTransaction(signedTx);
      
      if (submitResult.status === "ERROR") {
        throw new Error(`Transaction failed: ${submitResult.errorResult}`);
      }

      // Wait for confirmation if pending
      let finalResult = submitResult;
      if (submitResult.status === "PENDING") {
        finalResult = await this.waitForTransaction(submitResult.hash);
      }

      return {
        success: true,
        transactionHash: finalResult.hash,
        result: 'returnValue' in finalResult ? finalResult.returnValue : null
      };
    } catch (error) {
      console.error(`Contract invocation failed for ${method}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  protected async queryContract(
    method: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    try {
      // Convert parameters to ScVal format
      const args = this.convertArgsToScVal(params);
      
      // Create contract operation
      const contract = new Contract(this.contractId);
      const operation = contract.call(method, ...args);
      
      // Create a temporary account for simulation (read-only operations)
      const account = new Account(
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", // Null account
        "0"
      );
      
      // Build transaction for simulation
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Simulate transaction to get result
      const simulateResult = await this.rpcServer.simulateTransaction(transaction);
      
      if (rpc.Api.isSimulationError(simulateResult)) {
        throw new Error(`Query simulation failed: ${simulateResult.error}`);
      }

      // Extract and convert result
      return this.convertScValToNative(simulateResult.result?.retval);
    } catch (error) {
      console.error(`Query failed for ${method}:`, error);
      throw error;
    }
  }
  
  private async waitForTransaction(hash: string, timeout: number = 30000): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const transaction = await this.rpcServer.getTransaction(hash);
        if (transaction.status !== "NOT_FOUND") {
          return transaction;
        }
      } catch (error) {
        // Transaction not found yet, continue polling
      }
      
      // Wait 1 second before next check
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Transaction ${hash} did not confirm within ${timeout}ms`);
  }
  
  private convertArgsToScVal(params: Record<string, any>): any[] {
    const args: any[] = [];
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Check if it's an address
        if (value.startsWith('G') && value.length === 56) {
          args.push(nativeToScVal(value, { type: 'address' }));
        } else {
          args.push(nativeToScVal(value, { type: 'string' }));
        }
      } else if (typeof value === 'number' || typeof value === 'bigint') {
        args.push(nativeToScVal(value.toString(), { type: 'u64' }));
      } else if (typeof value === 'boolean') {
        args.push(nativeToScVal(value, { type: 'bool' }));
      } else {
        // For complex types, attempt to convert as-is
        args.push(nativeToScVal(value));
      }
    }
    
    return args;
  }
  
  private convertScValToNative(scVal: any): any {
    if (!scVal) return null;
    
    try {
      // This is a simplified conversion - in practice, you'd need more robust handling
      // based on the specific ScVal type
      return scVal;
    } catch (error) {
      console.warn('Failed to convert ScVal to native:', error);
      return scVal;
    }
  }
  
  protected formatAddress(address: string): string {
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }
  
  protected parseStroops(value: string): bigint {
    // Stellar uses stroops (1/10,000,000 XLM)
    const factor = BigInt(10000000);
    const [whole, fraction = ''] = value.split('.');
    const wholeBigInt = BigInt(whole || '0') * factor;
    const fractionBigInt = BigInt(fraction.padEnd(7, '0').slice(0, 7));
    return wholeBigInt + fractionBigInt;
  }
  
  protected formatStroops(value: bigint): string {
    const factor = BigInt(10000000);
    const whole = value / factor;
    const fraction = value % factor;
    const fractionStr = fraction.toString().padStart(7, '0');
    const trimmedFraction = fractionStr.replace(/0+$/, '') || '0';
    return trimmedFraction === '0' ? whole.toString() : `${whole}.${trimmedFraction}`;
  }
  
  // Helper method to create Address objects
  protected createAddress(addressStr: string): Address {
    return new Address(addressStr);
  }
  
  // Abstract method for subclasses to implement mock data during development
  protected getMockQueryResult(method: string, params: Record<string, any>): any {
    return null;
  }
}
// bots/auto-repay-bot/src/config/contracts.ts
import * as dotenv from 'dotenv';
dotenv.config();

export const VAULT_CONTRACT_ID = process.env.VAULT_CONTRACT_ID || '';
export const LENDING_POOL_CONTRACT_ID = process.env.LENDING_POOL_CONTRACT_ID || '';

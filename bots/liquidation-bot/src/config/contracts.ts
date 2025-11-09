// bots/liquidation-bot/src/config/contracts.ts
import * as dotenv from 'dotenv';
dotenv.config();

export const ORACLE_CONTRACT_ID = process.env.ORACLE_CONTRACT_ID || '';
export const LENDING_POOL_CONTRACT_ID = process.env.LENDING_POOL_CONTRACT_ID || '';
export const STRWA_TOKEN_ADDRESS = process.env.STRWA_TOKEN_ADDRESS || '';

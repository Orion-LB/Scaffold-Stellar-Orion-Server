// bots/orchestrator/src/metrics-api.ts
import express, { Express } from "express";
import { Server } from "http";
import { BotOrchestrator } from "./orchestrator";

export class MetricsAPI {
  private app: Express;
  private server?: Server;

  constructor(private orchestrator: BotOrchestrator) {
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        service: "bot-orchestrator",
        timestamp: new Date().toISOString(),
      });
    });

    // All metrics
    this.app.get("/metrics/all", (req, res) => {
      try {
        const metrics = this.orchestrator.getMetrics();
        res.json(metrics);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Oracle metrics
    this.app.get("/metrics/oracle", (req, res) => {
      try {
        const metrics = this.orchestrator.getMetrics();
        res.json(metrics.oracle);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Auto-Repay metrics
    this.app.get("/metrics/auto-repay", (req, res) => {
      try {
        const metrics = this.orchestrator.getMetrics();
        res.json(metrics.autoRepay);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Liquidation metrics
    this.app.get("/metrics/liquidation", (req, res) => {
      try {
        const metrics = this.orchestrator.getMetrics();
        res.json(metrics.liquidation);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Bot health status
    this.app.get("/status", async (req, res) => {
      try {
        const health = await this.orchestrator.checkHealth();
        res.json({
          bots: health,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Contract addresses (for debugging)
    this.app.get("/contracts", (req, res) => {
      try {
        const contracts = this.orchestrator["sharedConfig"].getAllContracts();
        res.json(contracts);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  start(port: number): void {
    this.server = this.app.listen(port, () => {
      console.log(`📊 Metrics API running on port ${port}`);
      console.log(`   Health: http://localhost:${port}/health`);
      console.log(`   Metrics: http://localhost:${port}/metrics/all`);
      console.log(`   Status: http://localhost:${port}/status`);
      console.log("");
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      console.log("📊 Metrics API stopped");
    }
  }
}

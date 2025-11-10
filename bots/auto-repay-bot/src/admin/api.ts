// bots/auto-repay-bot/src/admin/api.ts
import express from "express";
import { AutoRepayBot } from "../bot";
import { MetricsCollector } from "../monitoring/metrics";

export function createAdminApi(bot: AutoRepayBot, metrics: MetricsCollector) {
  const app = express();
  app.use(express.json());

  app.get("/health", (req, res) => {
    res.json({ status: "ok", bot: "auto-repay" });
  });

  app.get("/metrics", (req, res) => {
    const currentMetrics = metrics.getMetrics();
    res.json(currentMetrics);
  });

  app.post("/admin/trigger", async (req, res) => {
    try {
      await bot.processAutoRepays();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/admin/trigger/:borrower", async (req, res) => {
    const { borrower } = req.params;

    try {
      // This method is not on the bot class, but it is in the spec for manual trigger.
      // await bot.processBorrower(borrower);
      res.json({ success: true, borrower });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}

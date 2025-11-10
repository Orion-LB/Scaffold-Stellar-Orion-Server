// bots/liquidation-bot/src/admin/api.ts
import express from "express";
import { LiquidationBot } from "../bot";

export function createAdminApi(bot: LiquidationBot) {
  const app = express();
  app.use(express.json());

  app.get("/health", (req, res) => {
    res.json({ status: "ok", bot: "liquidation" });
  });

  app.get("/metrics", (req, res) => {
    const metrics = bot.metrics.getMetrics();
    res.json({
      ...metrics,
      totalRewardsEarned: metrics.totalRewardsEarned.toString(),
      totalGasSpent: metrics.totalGasSpent.toString(),
      totalProfit: metrics.totalProfit.toString(),
    });
  });

  app.get("/loan/:borrower/health", async (req, res) => {
    const { borrower } = req.params;

    try {
      const loan = await bot.lendingPool.getLoan(borrower);
      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }

      const [price, priceTimestamp] = await bot.oracle.getPrice(
        bot.config.stRwaTokenAddress,
      );
      const health = await bot.healthCalculator.calculateHealth(
        borrower,
        loan,
        price,
        priceTimestamp,
      );

      res.json(health);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/admin/force-check/:borrower", async (req, res) => {
    const { borrower } = req.params;

    try {
      const [price, priceTimestamp] = await bot.oracle.getPrice(
        bot.config.stRwaTokenAddress,
      );
      const result = await bot.monitorLoan(borrower, price, priceTimestamp);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}

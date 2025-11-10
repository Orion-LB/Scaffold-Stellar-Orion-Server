// bots/oracle-price-bot/src/admin/api.ts
import express from "express";
import { AdminInterface } from "./interface";

export function createAdminApi(adminInterface: AdminInterface) {
  const app = express();
  app.use(express.json());

  app.get("/health", async (req, res) => {
    try {
      const status = await adminInterface.getStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/metrics", async (req, res) => {
    try {
      const status = await adminInterface.getStatus();
      res.json(status.metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/status", async (req, res) => {
    try {
      const status = await adminInterface.getStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/admin/trigger-update/:asset", async (req, res) => {
    const { asset } = req.params;
    const adminKey = req.headers["x-admin-key"] as string;
    const { price } = req.body;

    try {
      await adminInterface.forceUpdatePrice(asset, price, adminKey);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/admin/pause", async (req, res) => {
    const adminKey = req.headers["x-admin-key"] as string;

    try {
      await adminInterface.pauseBot(adminKey);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/admin/resume", async (req, res) => {
    const adminKey = req.headers["x-admin-key"] as string;

    try {
      await adminInterface.resumeBot(adminKey);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}

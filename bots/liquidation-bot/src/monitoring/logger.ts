// bots/liquidation-bot/src/monitoring/logger.ts
export class Logger {
  constructor(private context: string) {}

  log(
    severity: "info" | "warning" | "critical",
    message: string,
    metadata?: any,
  ) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        severity,
        context: this.context,
        message,
        metadata,
      }),
    );
  }

  info(message: string, metadata?: any) {
    this.log("info", message, metadata);
  }

  warn(message: string, metadata?: any) {
    this.log("warning", message, metadata);
  }

  error(message: string, metadata?: any) {
    this.log("critical", message, metadata);
  }
}

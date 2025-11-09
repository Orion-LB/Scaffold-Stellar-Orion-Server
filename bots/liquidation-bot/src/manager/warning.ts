// bots/liquidation-bot/src/manager/warning.ts
import { WARNING_CONFIG } from "../config/thresholds";
import { HealthFactor, Loan } from "../calculator/health";

export enum WarningState {
    HEALTHY = 'HEALTHY',           // Health >= 1.5, no warnings
    WARNING_1 = 'WARNING_1',       // Health < 1.5 or 2 weeks no payment
    WARNING_2 = 'WARNING_2',       // Health < 1.2 or 4 weeks no payment
    WARNING_3 = 'WARNING_3',       // Health < 1.1 - FINAL WARNING
    LIQUIDATABLE = 'LIQUIDATABLE', // Health <= 1.1
}

export class WarningManager {
    determineWarningState(
        health: HealthFactor,
        loan: Loan,
        currentTime: number
    ): WarningState {
        const timeSinceLastPayment = currentTime - loan.lastPaymentTime;
        const twoWeeks = WARNING_CONFIG.timeBetweenWarnings;

        // Liquidatable
        if (health.healthFactor <= WARNING_CONFIG.liquidationThreshold) {
            return WarningState.LIQUIDATABLE;
        }

        // Warning 3 (Final)
        if (health.healthFactor <= WARNING_CONFIG.warning3Threshold) {
            return WarningState.WARNING_3;
        }

        // Warning 2
        if (
            health.healthFactor <= WARNING_CONFIG.warning2Threshold ||
            (loan.warningsIssued >= 1 && timeSinceLastPayment >= twoWeeks * 2)
        ) {
            return WarningState.WARNING_2;
        }

        // Warning 1
        if (
            health.healthFactor <= WARNING_CONFIG.warning1Threshold ||
            timeSinceLastPayment >= twoWeeks
        ) {
            return WarningState.WARNING_1;
        }

        // Healthy
        return WarningState.HEALTHY;
    }

    shouldIssueWarning(
        currentState: WarningState,
        loan: Loan,
        currentTime: number
    ): boolean {
        // Already issued max warnings
        if (loan.warningsIssued >= 3) {
            return false;
        }

        // Check if enough time passed since last warning
        const timeSinceLastWarning = currentTime - loan.lastWarningTime;

        switch (currentState) {
            case WarningState.WARNING_1:
                return loan.warningsIssued === 0;

            case WarningState.WARNING_2:
                return (
                    loan.warningsIssued === 1 &&
                    timeSinceLastWarning >= WARNING_CONFIG.timeBetweenWarnings
                );

            case WarningState.WARNING_3:
                return (
                    loan.warningsIssued === 2 &&
                    timeSinceLastWarning >= WARNING_CONFIG.timeBetweenWarnings
                );

            default:
                return false;
        }
    }
}

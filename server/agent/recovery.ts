/**
 * Failure Recovery and Bounded Retry Engine
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 500,
  backoffMultiplier: 2,
};

export interface RecoveryAction {
  strategy: "RETRY_WITH_BACKOFF" | "AVOID_DUPLICATE" | "REQUEST_HUMAN_INTERVENTION" | "ABORT_FATAL";
  reason: string;
  delayMs?: number;
  suggestedNextTool?: string;
  suggestedInput?: Record<string, unknown>;
}

export class RecoveryEngine {
  public static isRetryableError(errorText: string, errorCode?: string): boolean {
    if (errorCode === "TEMPORARY_DATABASE_ERROR" || errorCode === "LEDGER_BUSY" || errorCode === "NODE_TIMEOUT_503") {
      return true;
    }

    const nonRetryableCodes = [
      "VALIDATION_ERROR",
      "DUPLICATE_RECORD_ERROR",
      "APPROVAL_REQUIRED",
      "MISSING_DUE_DATE",
      "UNAUTHORIZED_TOOL",
      "SCHEMA_VALIDATION_ERROR",
      "NOT_FOUND",
    ];

    if (errorCode && nonRetryableCodes.includes(errorCode)) {
      return false;
    }

    const lower = errorText.toLowerCase();
    if (
      lower.includes("temporary") ||
      lower.includes("timeout") ||
      lower.includes("pool exhausted") ||
      lower.includes("transient") ||
      lower.includes("connection lock")
    ) {
      return true;
    }

    return false;
  }

  public static calculateBackoff(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
    // attempt 1 -> 500ms, attempt 2 -> 1000ms, attempt 3 -> 2000ms
    return config.initialDelayMs * Math.pow(config.backoffMultiplier, Math.max(0, attempt - 1));
  }

  public static determineRecoveryAction(params: {
    toolName: string;
    errorText: string;
    errorCode?: string;
    currentAttempt: number;
    maxAttempts?: number;
    hasExistingRecord?: boolean;
    missingFields?: string[];
  }): RecoveryAction {
    const maxAttempts = params.maxAttempts || DEFAULT_RETRY_CONFIG.maxAttempts;

    // 1. Duplicate detection
    if (params.errorCode === "DUPLICATE_RECORD_ERROR" || params.hasExistingRecord) {
      return {
        strategy: "AVOID_DUPLICATE",
        reason: "Invoice already exists in finance ERP. Bypassing write operation to prevent duplicate entry.",
        suggestedNextTool: "get_finance_record",
      };
    }

    // 2. Missing mandatory fields (e.g. Due Date)
    if (params.errorCode === "MISSING_DUE_DATE" || (params.missingFields && params.missingFields.length > 0)) {
      return {
        strategy: "REQUEST_HUMAN_INTERVENTION",
        reason: `Mandatory financial fields are missing (${params.missingFields?.join(", ") || "due_date"}). Enterprise policy prevents hallucinating or fabricating missing dates.`,
        suggestedNextTool: "request_human_approval",
      };
    }

    // 3. Retryable transient errors
    if (this.isRetryableError(params.errorText, params.errorCode)) {
      if (params.currentAttempt < maxAttempts) {
        const delayMs = this.calculateBackoff(params.currentAttempt);
        return {
          strategy: "RETRY_WITH_BACKOFF",
          reason: `Transient system error encountered on attempt ${params.currentAttempt}/${maxAttempts}. Retrying with exponential backoff (${delayMs}ms).`,
          delayMs,
        };
      } else {
        return {
          strategy: "ABORT_FATAL",
          reason: `Exceeded maximum bounded retry attempts (${maxAttempts}). Halting to protect ledger consistency.`,
        };
      }
    }

    // 4. Non-retryable validation or permission errors
    return {
      strategy: "ABORT_FATAL",
      reason: `Non-retryable operational error: ${params.errorText}`,
    };
  }
}

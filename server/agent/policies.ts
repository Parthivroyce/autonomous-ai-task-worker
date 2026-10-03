/**
 * Policy Engine
 * Enforces enterprise guardrails, financial thresholds, and approval requirements deterministically.
 */

import { companyMemory } from "../environment/companyMemory.js";

export interface PolicyEvaluation {
  allowed: boolean;
  requiresApproval: boolean;
  riskTier: "low" | "medium" | "high";
  reason: string;
  violations: string[];
}

export class PolicyEngine {
  public static evaluateInvoiceEntry(params: {
    vendor: string;
    invoice_number: string;
    amount: number;
    currency: string;
    due_date?: string | null;
    isApproved?: boolean;
  }): PolicyEvaluation {
    const policy = companyMemory.getPolicy();
    const violations: string[] = [];

    // 1. Due date check
    if (policy.requires_due_date && (!params.due_date || params.due_date === "null")) {
      violations.push("Missing payment due date. Organization policy forbids recording invoices without explicit due dates.");
    }

    // 2. Allowed currency check
    if (!policy.allowed_currencies.includes(params.currency.toUpperCase())) {
      violations.push(`Currency '${params.currency}' is not in authorized list: ${policy.allowed_currencies.join(", ")}`);
    }

    if (violations.length > 0) {
      return {
        allowed: false,
        requiresApproval: false,
        riskTier: "high",
        reason: violations.join(" "),
        violations,
      };
    }

    // 3. Approval threshold checks
    const autoLimit = policy.invoice_auto_approval_limit;
    const highRiskLimit = policy.high_risk_threshold;

    if (params.amount >= highRiskLimit) {
      if (!params.isApproved) {
        return {
          allowed: false,
          requiresApproval: true,
          riskTier: "high",
          reason: `Invoice amount ₹${params.amount.toLocaleString()} exceeds high-risk threshold (₹${highRiskLimit.toLocaleString()}). Requires explicit executive sign-off.`,
          violations: [],
        };
      }
      return {
        allowed: true,
        requiresApproval: false,
        riskTier: "high",
        reason: "Executive approval verified for high-risk invoice.",
        violations: [],
      };
    }

    if (params.amount >= autoLimit) {
      if (!params.isApproved) {
        return {
          allowed: false,
          requiresApproval: true,
          riskTier: "medium",
          reason: `Invoice amount ₹${params.amount.toLocaleString()} is within approval window (₹${autoLimit.toLocaleString()} - ₹${highRiskLimit.toLocaleString()}). Requires human manager approval before writing to ledger.`,
          violations: [],
        };
      }
      return {
        allowed: true,
        requiresApproval: false,
        riskTier: "medium",
        reason: "Manager approval verified.",
        violations: [],
      };
    }

    // Under auto limit: Auto-approved
    return {
      allowed: true,
      requiresApproval: false,
      riskTier: "low",
      reason: `Invoice amount ₹${params.amount.toLocaleString()} is below auto-approval threshold of ₹${autoLimit.toLocaleString()}. Auto-cleared for entry.`,
      violations: [],
    };
  }
}

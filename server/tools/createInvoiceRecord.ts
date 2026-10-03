import { z } from "zod";
import { ITool, ToolExecutionContext, ToolExecutionResult } from "./types.js";
import { financeRepository } from "../environment/financeRepository.js";
import { FinanceRecord } from "../environment/companyData.js";
import { companyMemory } from "../environment/companyMemory.js";

export const createInvoiceRecordInputSchema = z.object({
  invoice_number: z.string().min(1).describe("The invoice number (e.g. 'AC-2026-091')"),
  vendor: z.string().min(1).describe("Vendor name"),
  amount: z.number().positive().describe("Invoice total amount in monetary units"),
  currency: z.string().min(3).max(4).describe("Currency ISO code (e.g. 'INR')"),
  due_date: z.string().min(4).describe("Payment due date in YYYY-MM-DD format"),
  line_items_count: z.number().int().positive().optional().describe("Number of line items"),
});

export type CreateInvoiceRecordInput = z.infer<typeof createInvoiceRecordInputSchema>;

export class CreateInvoiceRecordTool implements ITool<CreateInvoiceRecordInput, FinanceRecord> {
  public name = "create_finance_record";
  public description = "Insert and record an invoice into the company finance ERP ledger. Modifies persistent finance state.";
  public permission = "WRITE" as const;
  public inputSchema = createInvoiceRecordInputSchema;

  public async execute(
    input: CreateInvoiceRecordInput,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<FinanceRecord>> {
    try {
      const policy = companyMemory.getPolicy();

      // Policy gate: Require due date
      if (policy.requires_due_date && (!input.due_date || input.due_date === "null" || input.due_date === "undefined")) {
        return {
          success: false,
          error: "POLICY_VIOLATION: Company policy mandates a valid due date before ledger entry.",
          errorCode: "MISSING_DUE_DATE",
          retryable: false,
        };
      }

      // Policy gate: Approval requirement check
      const autoLimit = policy.invoice_auto_approval_limit; // 100,000 INR
      const highRiskLimit = policy.high_risk_threshold; // 500,000 INR

      if (input.amount >= autoLimit && !context.approved) {
        const riskTier = input.amount >= highRiskLimit ? "high" : "medium";
        return {
          success: false,
          error: `APPROVAL_REQUIRED: Invoices >= ₹${autoLimit.toLocaleString()} require human sign-off (Risk tier: ${riskTier}). Action halted pending approval.`,
          errorCode: "APPROVAL_REQUIRED",
          retryable: false,
          metadata: {
            risk: riskTier,
            amount: input.amount,
            vendor: input.vendor,
            invoice_number: input.invoice_number,
          },
        };
      }

      // Execute actual insertion into simulated finance repository
      const created = await financeRepository.createRecord({
        invoice_number: input.invoice_number,
        vendor: input.vendor,
        amount: input.amount,
        currency: input.currency,
        due_date: input.due_date,
        approved_by: context.approvalUser || (context.approved ? "human_supervisor" : "auto_policy_engine"),
        approval_risk: input.amount >= highRiskLimit ? "high" : input.amount >= autoLimit ? "medium" : "low",
        line_items_count: input.line_items_count || 1,
      });

      return {
        success: true,
        data: created,
        metadata: {
          recordId: created.recordId,
          timestamp: created.enteredAt,
        },
      };
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string; retryable?: boolean };
      return {
        success: false,
        error: e.message || "Failed to create finance ledger record",
        errorCode: e.code || "LEDGER_WRITE_ERROR",
        retryable: e.retryable ?? false,
      };
    }
  }
}

export const createInvoiceRecordTool = new CreateInvoiceRecordTool();

/**
 * Finance System Repository Abstraction & In-Memory Implementation
 * Provides access to the simulated Enterprise ERP / Accounts Payable ledger.
 */

import { FinanceRecord, INITIAL_FINANCE_RECORDS } from "./companyData.js";

export interface CreateFinanceRecordInput {
  invoice_number: string;
  vendor: string;
  amount: number;
  currency: string;
  due_date: string;
  approved_by?: string;
  approval_risk?: "low" | "medium" | "high";
  line_items_count?: number;
}

export interface FinanceSearchFilters {
  invoice_number?: string;
  vendor?: string;
  status?: string;
  limit?: number;
}

export interface IFinanceRepository {
  search(filters: FinanceSearchFilters): Promise<FinanceRecord[]>;
  getById(recordId: string): Promise<FinanceRecord | null>;
  getByInvoiceNumber(invoiceNumber: string): Promise<FinanceRecord | null>;
  createRecord(input: CreateFinanceRecordInput): Promise<FinanceRecord>;
  reset(): void;
  getAll(): FinanceRecord[];
  setSimulatedFlakyMode(enabled: boolean, failureCount?: number): void;
}

export class DemoFinanceRepository implements IFinanceRepository {
  private records: FinanceRecord[] = [];
  private nextIdCounter = 2050;
  private flakyCounter = 0;
  private flakyMaxFailures = 1; // Fails once then succeeds to test bounded retry

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.records = JSON.parse(JSON.stringify(INITIAL_FINANCE_RECORDS));
    this.nextIdCounter = 2050;
    this.flakyCounter = 0;
  }

  public getAll(): FinanceRecord[] {
    return [...this.records];
  }

  public setSimulatedFlakyMode(enabled: boolean, failureCount = 1): void {
    this.flakyCounter = enabled ? failureCount : 0;
    this.flakyMaxFailures = failureCount;
  }

  public async search(filters: FinanceSearchFilters): Promise<FinanceRecord[]> {
    let results = [...this.records];

    if (filters.invoice_number) {
      const q = filters.invoice_number.toLowerCase().trim();
      results = results.filter((r) => r.invoiceNumber.toLowerCase() === q);
    }

    if (filters.vendor) {
      const q = filters.vendor.toLowerCase().trim();
      results = results.filter(
        (r) =>
          r.vendor.toLowerCase().includes(q) || q.includes(r.vendor.toLowerCase())
      );
    }

    if (filters.status) {
      results = results.filter((r) => r.status === filters.status);
    }

    // Sort latest entered first
    results.sort(
      (a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime()
    );

    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
    return results.slice(0, limit);
  }

  public async getById(recordId: string): Promise<FinanceRecord | null> {
    const found = this.records.find(
      (r) => r.recordId.toLowerCase() === recordId.toLowerCase()
    );
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async getByInvoiceNumber(invoiceNumber: string): Promise<FinanceRecord | null> {
    const found = this.records.find(
      (r) => r.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase()
    );
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async createRecord(input: CreateFinanceRecordInput): Promise<FinanceRecord> {
    // 1. Check for flaky failure mode (used in Scenario A & evaluation 5)
    // If invoice is GL-2026-402, trigger 1 transient database failure on first attempt
    if (input.invoice_number === "GL-2026-402") {
      if (this.flakyCounter < 1) {
        this.flakyCounter++;
        const error = new Error("Connection pool exhausted to primary finance ledger [NODE_TIMEOUT_503]");
        (error as unknown as { code: string; retryable: boolean }).code = "TEMPORARY_DATABASE_ERROR";
        (error as unknown as { code: string; retryable: boolean }).retryable = true;
        throw error;
      }
    }

    // Check for explicit flaky simulation
    if (this.flakyCounter > 0 && input.invoice_number !== "GL-2026-402") {
      this.flakyCounter--;
      const error = new Error("Simulated transient connection lock in ERP write queue");
      (error as unknown as { code: string; retryable: boolean }).code = "TEMPORARY_DATABASE_ERROR";
      (error as unknown as { code: string; retryable: boolean }).retryable = true;
      throw error;
    }

    // 2. Guard against duplicate invoice number creation
    const existing = await this.getByInvoiceNumber(input.invoice_number);
    if (existing) {
      const error = new Error(`Invoice ${input.invoice_number} is already recorded in the finance system under record ID ${existing.recordId}`);
      (error as unknown as { code: string; retryable: boolean }).code = "DUPLICATE_RECORD_ERROR";
      (error as unknown as { code: string; retryable: boolean }).retryable = false;
      throw error;
    }

    // 3. Strict field validations
    if (!input.invoice_number || !input.vendor || input.amount == null || !input.currency || !input.due_date) {
      const error = new Error("Missing required financial fields for ERP record insertion");
      (error as unknown as { code: string; retryable: boolean }).code = "VALIDATION_ERROR";
      (error as unknown as { code: string; retryable: boolean }).retryable = false;
      throw error;
    }

    const recordId = `FIN-${this.nextIdCounter++}`;
    const newRecord: FinanceRecord = {
      recordId,
      invoiceNumber: input.invoice_number,
      vendor: input.vendor,
      amount: input.amount,
      currency: input.currency,
      dueDate: input.due_date,
      status: "PENDING_PAYMENT",
      enteredAt: new Date().toISOString(),
      enteredBy: "autonomous_finance_agent",
      approvedBy: input.approved_by,
      approvalRisk: input.approval_risk || "low",
      lineItemsCount: input.line_items_count || 1,
    };

    this.records.unshift(newRecord);
    return JSON.parse(JSON.stringify(newRecord));
  }
}

export const financeRepository = new DemoFinanceRepository();

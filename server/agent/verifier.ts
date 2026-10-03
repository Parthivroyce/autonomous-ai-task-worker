/**
 * Verification Engine
 * Strictly validates that write operations actually produced matching, durable records in the finance ERP.
 */

import { financeRepository } from "../environment/financeRepository.js";
import { ExtractedInvoiceData } from "../environment/invoiceRepository.js";
import { VerificationCheck, VerificationResult } from "./state.js";

export class Verifier {
  public static async verifyFinanceRecord(
    recordId: string,
    expectedData: ExtractedInvoiceData
  ): Promise<VerificationResult> {
    const record = await financeRepository.getById(recordId);

    const checks: VerificationCheck[] = [];

    // Check 1: Record existence
    const exists = !!record;
    checks.push({
      field: "record_exists",
      expected: "Record exists in ERP",
      actual: exists ? `Found record ${recordId}` : "Record NOT found",
      passed: exists,
      notes: exists ? "Record confirmed in ledger" : "Ledger lookup returned null",
    });

    if (!record) {
      return {
        verified: false,
        recordId,
        timestamp: new Date().toISOString(),
        checks,
        summary: `Verification FAILED: Record ${recordId} does not exist in finance ledger.`,
      };
    }

    // Check 2: Invoice Number
    const invoiceNumMatches =
      record.invoiceNumber.toLowerCase().trim() ===
      expectedData.invoice_number.toLowerCase().trim();
    checks.push({
      field: "invoice_number",
      expected: expectedData.invoice_number,
      actual: record.invoiceNumber,
      passed: invoiceNumMatches,
    });

    // Check 3: Vendor
    const vendorMatches =
      record.vendor.toLowerCase().trim() ===
      expectedData.vendor.toLowerCase().trim();
    checks.push({
      field: "vendor",
      expected: expectedData.vendor,
      actual: record.vendor,
      passed: vendorMatches,
    });

    // Check 4: Amount
    const amountMatches = Math.abs(record.amount - expectedData.amount) < 0.01;
    checks.push({
      field: "amount",
      expected: expectedData.amount,
      actual: record.amount,
      passed: amountMatches,
      notes: amountMatches
        ? undefined
        : `MISMATCH: Extracted ${expectedData.amount} vs Ledger ${record.amount}`,
    });

    // Check 5: Currency
    const currencyMatches =
      record.currency.toUpperCase().trim() ===
      expectedData.currency.toUpperCase().trim();
    checks.push({
      field: "currency",
      expected: expectedData.currency.toUpperCase(),
      actual: record.currency.toUpperCase(),
      passed: currencyMatches,
    });

    // Check 6: Due Date
    const dueDateMatches =
      record.dueDate.trim() === (expectedData.due_date || "").trim();
    checks.push({
      field: "due_date",
      expected: expectedData.due_date,
      actual: record.dueDate,
      passed: dueDateMatches,
      notes: dueDateMatches
        ? undefined
        : `MISMATCH: Extracted ${expectedData.due_date} vs Ledger ${record.dueDate}`,
    });

    const allPassed = checks.every((c) => c.passed);

    return {
      verified: allPassed,
      recordId,
      timestamp: new Date().toISOString(),
      checks,
      summary: allPassed
        ? `Verification PASSED: All 5 financial fields confirmed matching in record ${recordId}.`
        : `Verification FAILED: Detected ${checks.filter((c) => !c.passed).length} mismatch(es) in record ${recordId}.`,
    };
  }

  public static verifyExistingMatch(
    existingRecordId: string,
    extractedData: ExtractedInvoiceData
  ): Promise<VerificationResult> {
    return this.verifyFinanceRecord(existingRecordId, extractedData);
  }
}

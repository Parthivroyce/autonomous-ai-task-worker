import { z } from "zod";
import { ITool, ToolExecutionContext, ToolExecutionResult } from "./types.js";
import { financeRepository } from "../environment/financeRepository.js";
import { FinanceRecord } from "../environment/companyData.js";

export const searchFinanceRecordsInputSchema = z.object({
  invoice_number: z.string().optional().describe("Invoice number to check for existing records (e.g. 'AC-2026-091')"),
  vendor: z.string().optional().describe("Vendor name to query existing ledger records"),
  limit: z.number().int().positive().max(50).default(10).optional(),
});

export type SearchFinanceRecordsInput = z.infer<typeof searchFinanceRecordsInputSchema>;

export interface SearchFinanceRecordsOutput {
  total: number;
  records: FinanceRecord[];
  hasExistingRecord: boolean;
}

export class SearchFinanceRecordsTool implements ITool<SearchFinanceRecordsInput, SearchFinanceRecordsOutput> {
  public name = "search_finance_records";
  public description = "Search the simulated finance ERP database for existing records by invoice number or vendor to prevent duplicate entries.";
  public permission = "READ" as const;
  public inputSchema = searchFinanceRecordsInputSchema;

  public async execute(
    input: SearchFinanceRecordsInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<SearchFinanceRecordsOutput>> {
    try {
      const records = await financeRepository.search({
        invoice_number: input.invoice_number,
        vendor: input.vendor,
        limit: input.limit || 10,
      });

      return {
        success: true,
        data: {
          total: records.length,
          records,
          hasExistingRecord: records.length > 0,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as Error).message || "Failed to search finance ledger",
        retryable: false,
      };
    }
  }
}

export const searchFinanceRecordsTool = new SearchFinanceRecordsTool();

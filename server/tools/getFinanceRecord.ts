import { z } from "zod";
import { ITool, ToolExecutionContext, ToolExecutionResult } from "./types.js";
import { financeRepository } from "../environment/financeRepository.js";
import { FinanceRecord } from "../environment/companyData.js";

export const getFinanceRecordInputSchema = z.object({
  record_id: z.string().min(1).describe("The finance ledger record ID (e.g. 'FIN-2048')"),
});

export type GetFinanceRecordInput = z.infer<typeof getFinanceRecordInputSchema>;

export class GetFinanceRecordTool implements ITool<GetFinanceRecordInput, FinanceRecord> {
  public name = "get_finance_record";
  public description = "Retrieve a finance ERP ledger record by its record ID (FIN-...). Used for post-write verification.";
  public permission = "READ" as const;
  public inputSchema = getFinanceRecordInputSchema;

  public async execute(
    input: GetFinanceRecordInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<FinanceRecord>> {
    try {
      const record = await financeRepository.getById(input.record_id);
      if (!record) {
        return {
          success: false,
          error: `Finance record '${input.record_id}' not found in ERP ledger`,
          errorCode: "NOT_FOUND",
          retryable: false,
        };
      }

      return {
        success: true,
        data: record,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as Error).message || "Failed to query finance record",
        retryable: false,
      };
    }
  }
}

export const getFinanceRecordTool = new GetFinanceRecordTool();

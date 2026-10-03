import { z } from "zod";
import { ITool, ToolExecutionContext, ToolExecutionResult } from "./types.js";
import { invoiceRepository, ExtractedInvoiceData } from "../environment/invoiceRepository.js";

export const extractInvoiceDataInputSchema = z.object({
  invoice_id: z.string().min(1).describe("The invoice document ID to extract structured data from (e.g. 'INV-1001')"),
});

export type ExtractInvoiceDataInput = z.infer<typeof extractInvoiceDataInputSchema>;

export class ExtractInvoiceDataTool implements ITool<ExtractInvoiceDataInput, ExtractedInvoiceData> {
  public name = "extract_invoice_data";
  public description = "Extract structured financial fields (vendor, invoice number, amount, currency, due date, items) from stored invoice content.";
  public permission = "READ" as const;
  public inputSchema = extractInvoiceDataInputSchema;

  public async execute(
    input: ExtractInvoiceDataInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<ExtractedInvoiceData>> {
    try {
      const extracted = await invoiceRepository.extractData(input.invoice_id);
      if (!extracted) {
        return {
          success: false,
          error: `Cannot extract data: Invoice document '${input.invoice_id}' does not exist`,
          errorCode: "NOT_FOUND",
          retryable: false,
        };
      }

      return {
        success: true,
        data: extracted,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as Error).message || "Extraction failed",
        retryable: false,
      };
    }
  }
}

export const extractInvoiceDataTool = new ExtractInvoiceDataTool();

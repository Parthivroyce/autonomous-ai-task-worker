import { z } from "zod";
import { ITool, ToolExecutionContext, ToolExecutionResult } from "./types.js";
import { invoiceRepository } from "../environment/invoiceRepository.js";
import { InvoiceDocument } from "../environment/companyData.js";

export const getInvoiceInputSchema = z.object({
  invoice_id: z.string().min(1).describe("The invoice document ID (e.g. 'INV-1001')"),
});

export type GetInvoiceInput = z.infer<typeof getInvoiceInputSchema>;

export class GetInvoiceTool implements ITool<GetInvoiceInput, InvoiceDocument> {
  public name = "get_invoice";
  public description = "Retrieve full invoice document content, raw text, and metadata by invoice document ID.";
  public permission = "READ" as const;
  public inputSchema = getInvoiceInputSchema;

  public async execute(
    input: GetInvoiceInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<InvoiceDocument>> {
    try {
      const invoice = await invoiceRepository.getById(input.invoice_id);
      if (!invoice) {
        return {
          success: false,
          error: `Invoice document '${input.invoice_id}' not found in company repository`,
          errorCode: "NOT_FOUND",
          retryable: false,
        };
      }

      return {
        success: true,
        data: invoice,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as Error).message || "Failed to retrieve invoice document",
        retryable: false,
      };
    }
  }
}

export const getInvoiceTool = new GetInvoiceTool();

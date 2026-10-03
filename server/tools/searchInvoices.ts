import { z } from "zod";
import { ITool, ToolExecutionContext, ToolExecutionResult } from "./types.js";
import { invoiceRepository } from "../environment/invoiceRepository.js";

export const searchInvoicesInputSchema = z.object({
  vendor: z.string().optional().describe("Vendor name to search for (e.g. 'Acme Corp')"),
  limit: z.number().int().positive().max(50).default(10).describe("Maximum number of invoices to return"),
});

export type SearchInvoicesInput = z.infer<typeof searchInvoicesInputSchema>;

export interface SearchInvoicesOutput {
  total: number;
  invoices: Array<{
    id: string;
    invoice_number: string;
    vendor: string;
    issue_date: string;
    due_date?: string;
    amount: number;
    currency: string;
    status: string;
  }>;
}

export class SearchInvoicesTool implements ITool<SearchInvoicesInput, SearchInvoicesOutput> {
  public name = "search_invoices";
  public description = "Search company document repository for invoices matching vendor name or criteria. Returns invoice metadata.";
  public permission = "READ" as const;
  public inputSchema = searchInvoicesInputSchema;

  public async execute(
    input: SearchInvoicesInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<SearchInvoicesOutput>> {
    try {
      const results = await invoiceRepository.search({
        vendor: input.vendor,
        limit: input.limit,
      });

      return {
        success: true,
        data: {
          total: results.length,
          invoices: results.map((inv) => ({
            id: inv.id,
            invoice_number: inv.invoiceNumber,
            vendor: inv.vendor,
            issue_date: inv.issueDate,
            due_date: inv.dueDate,
            amount: inv.amount,
            currency: inv.currency,
            status: inv.status,
          })),
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as Error).message || "Failed to search invoices",
        retryable: false,
      };
    }
  }
}

export const searchInvoicesTool = new SearchInvoicesTool();

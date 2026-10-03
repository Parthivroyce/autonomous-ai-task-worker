/**
 * Invoice Repository Abstraction & In-Memory Implementation
 * Provides access to the simulated document repository.
 */

import { InvoiceDocument, INITIAL_INVOICES } from "./companyData.js";

export interface InvoiceSearchFilters {
  vendor?: string;
  invoice_number?: string;
  limit?: number;
  status?: string;
}

export interface ExtractedInvoiceData {
  invoice_id: string;
  invoice_number: string;
  vendor: string;
  vendor_address: string;
  recipient: string;
  issue_date: string;
  due_date: string | null;
  amount: number;
  currency: string;
  line_items: Array<{ description: string; quantity: number; unit_price: number; total: number }>;
  is_complete: boolean;
  missing_fields: string[];
  notes?: string;
  special_handling?: string;
}

export interface IInvoiceRepository {
  search(filters: InvoiceSearchFilters): Promise<InvoiceDocument[]>;
  getById(id: string): Promise<InvoiceDocument | null>;
  getByNumber(invoiceNumber: string): Promise<InvoiceDocument | null>;
  extractData(invoiceId: string): Promise<ExtractedInvoiceData | null>;
  updateStatus(id: string, status: InvoiceDocument["status"]): Promise<boolean>;
  reset(): void;
  getAll(): InvoiceDocument[];
}

export class DemoInvoiceRepository implements IInvoiceRepository {
  private invoices: InvoiceDocument[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    // Deep clone initial invoices to isolate mutable test states
    this.invoices = JSON.parse(JSON.stringify(INITIAL_INVOICES));
  }

  public getAll(): InvoiceDocument[] {
    return [...this.invoices];
  }

  public async search(filters: InvoiceSearchFilters): Promise<InvoiceDocument[]> {
    let results = [...this.invoices];

    if (filters.vendor) {
      const q = filters.vendor.toLowerCase().trim();
      results = results.filter(
        (inv) =>
          inv.vendor.toLowerCase().includes(q) ||
          q.includes(inv.vendor.toLowerCase())
      );
    }

    if (filters.invoice_number) {
      const q = filters.invoice_number.toLowerCase().trim();
      results = results.filter((inv) =>
        inv.invoiceNumber.toLowerCase().includes(q)
      );
    }

    if (filters.status) {
      results = results.filter((inv) => inv.status === filters.status);
    }

    // Sort latest issueDate first
    results.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
    return results.slice(0, limit);
  }

  public async getById(id: string): Promise<InvoiceDocument | null> {
    const found = this.invoices.find(
      (inv) => inv.id.toLowerCase() === id.toLowerCase()
    );
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async getByNumber(invoiceNumber: string): Promise<InvoiceDocument | null> {
    const found = this.invoices.find(
      (inv) => inv.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase()
    );
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async extractData(invoiceId: string): Promise<ExtractedInvoiceData | null> {
    const doc = await this.getById(invoiceId);
    if (!doc) {
      return null;
    }

    const missingFields: string[] = [];
    if (!doc.invoiceNumber) missingFields.push("invoice_number");
    if (!doc.vendor) missingFields.push("vendor");
    if (!doc.amount) missingFields.push("amount");
    if (!doc.currency) missingFields.push("currency");
    if (!doc.dueDate) missingFields.push("due_date");

    return {
      invoice_id: doc.id,
      invoice_number: doc.invoiceNumber,
      vendor: doc.vendor,
      vendor_address: doc.vendorAddress,
      recipient: doc.recipient,
      issue_date: doc.issueDate,
      due_date: doc.dueDate || null,
      amount: doc.amount,
      currency: doc.currency,
      line_items: doc.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        total: i.total,
      })),
      is_complete: missingFields.length === 0,
      missing_fields: missingFields,
      notes: doc.metadata?.specialHandling
        ? `Special handling flagged: ${doc.metadata.specialHandling}`
        : undefined,
      special_handling: doc.metadata?.specialHandling,
    };
  }

  public async updateStatus(id: string, status: InvoiceDocument["status"]): Promise<boolean> {
    const doc = this.invoices.find((inv) => inv.id.toLowerCase() === id.toLowerCase());
    if (doc) {
      doc.status = status;
      return true;
    }
    return false;
  }
}

export const invoiceRepository = new DemoInvoiceRepository();

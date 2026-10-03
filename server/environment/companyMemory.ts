/**
 * Company Memory & Enterprise Policy Store
 * Holds persistent organizational policies, vendor knowledge, and operational memory.
 */

export interface CompanyPolicy {
  invoice_auto_approval_limit: number; // e.g. 100000 INR
  high_risk_threshold: number; // e.g. 500000 INR
  requires_due_date: boolean;
  duplicate_check_required: boolean;
  allowed_currencies: string[];
  max_retry_attempts: number;
}

export interface VendorProfile {
  name: string;
  category: string;
  paymentTerms: string;
  defaultCurrency: string;
  notes: string;
  verifiedStatus: "trusted" | "standard" | "probation";
}

export interface TaskMemoryEntry {
  taskId: string;
  goal: string;
  vendor?: string;
  invoiceNumber?: string;
  status: "COMPLETED" | "FAILED";
  timestamp: string;
  summary: string;
}

export class CompanyMemory {
  private policy: CompanyPolicy = {
    invoice_auto_approval_limit: 100000,
    high_risk_threshold: 500000,
    requires_due_date: true,
    duplicate_check_required: true,
    allowed_currencies: ["INR", "USD", "EUR", "GBP"],
    max_retry_attempts: 3,
  };

  private vendors: Record<string, VendorProfile> = {
    "acme corp": {
      name: "Acme Corp",
      category: "IT & Infrastructure",
      paymentTerms: "Net 30",
      defaultCurrency: "INR",
      notes: "Primary cloud and hardware supplier. Regular quarterly billing.",
      verifiedStatus: "trusted",
    },
    "globex": {
      name: "Globex",
      category: "Enterprise Software & Consulting",
      paymentTerms: "Net 30",
      defaultCurrency: "INR",
      notes: "Enterprise cloud software. Invoices above 500,000 require executive board approval.",
      verifiedStatus: "trusted",
    },
    "wayne enterprises": {
      name: "Wayne Enterprises",
      category: "Hardware & Tactical R&D",
      paymentTerms: "Net 30",
      defaultCurrency: "INR",
      notes: "Strict duplicate check required. Verify procurement PO match.",
      verifiedStatus: "trusted",
    },
    "stark industries": {
      name: "Stark Industries",
      category: "Clean Tech & Advanced Robotics",
      paymentTerms: "Net 30",
      defaultCurrency: "INR",
      notes: "Clean energy reactor parts and robotics maintenance.",
      verifiedStatus: "trusted",
    },
    "umbrella labs": {
      name: "Umbrella Labs",
      category: "Bio-Safety & Facilities",
      paymentTerms: "Net 30",
      defaultCurrency: "INR",
      notes: "Strict safety audits apply to equipment line items.",
      verifiedStatus: "standard",
    },
  };

  private taskHistory: TaskMemoryEntry[] = [];

  public getPolicy(): CompanyPolicy {
    return { ...this.policy };
  }

  public updatePolicy(partial: Partial<CompanyPolicy>): CompanyPolicy {
    this.policy = { ...this.policy, ...partial };
    return { ...this.policy };
  }

  public getVendorProfile(vendorName: string): VendorProfile | null {
    const key = vendorName.toLowerCase().trim();
    for (const [k, profile] of Object.entries(this.vendors)) {
      if (key.includes(k) || k.includes(key)) {
        return { ...profile };
      }
    }
    return null;
  }

  public getAllVendors(): VendorProfile[] {
    return Object.values(this.vendors);
  }

  public recordTaskOutcome(entry: TaskMemoryEntry): void {
    this.taskHistory.unshift(entry);
    if (this.taskHistory.length > 50) {
      this.taskHistory.pop();
    }
  }

  public getTaskHistory(): TaskMemoryEntry[] {
    return [...this.taskHistory];
  }

  public reset(): void {
    this.policy = {
      invoice_auto_approval_limit: 100000,
      high_risk_threshold: 500000,
      requires_due_date: true,
      duplicate_check_required: true,
      allowed_currencies: ["INR", "USD", "EUR", "GBP"],
      max_retry_attempts: 3,
    };
    this.taskHistory = [];
  }
}

export const companyMemory = new CompanyMemory();

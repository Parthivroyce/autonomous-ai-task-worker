/**
 * Fictional Company Data
 * Realistic enterprise document repository and finance ERP database.
 */

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceDocument {
  id: string; // e.g. INV-1001
  invoiceNumber: string; // e.g. AC-2026-091
  vendor: string;
  vendorAddress: string;
  recipient: string;
  issueDate: string;
  dueDate?: string; // intentionally missing in some scenarios
  amount: number;
  currency: string;
  status: "received" | "processing" | "entered" | "disputed";
  items: InvoiceItem[];
  rawText: string;
  metadata?: {
    tags?: string[];
    department?: string;
    specialHandling?: "flaky_db_error" | "mismatch_test" | "missing_due_date" | "duplicate_test";
  };
}

export interface FinanceRecord {
  recordId: string; // e.g. FIN-2048
  invoiceNumber: string;
  vendor: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: "PENDING_PAYMENT" | "PAID" | "RECONCILED" | "FLAGGED";
  enteredAt: string;
  enteredBy: string;
  approvedBy?: string;
  approvalRisk?: "low" | "medium" | "high";
  lineItemsCount: number;
}

export const INITIAL_INVOICES: InvoiceDocument[] = [
  {
    id: "INV-1001",
    invoiceNumber: "AC-2026-091",
    vendor: "Acme Corp",
    vendorAddress: "450 Industrial Parkway, Sector 18, Gurugram, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-18",
    dueDate: "2026-10-15",
    amount: 125000,
    currency: "INR",
    status: "received",
    items: [
      { description: "Enterprise Cloud Security Subscription Q3", quantity: 1, unitPrice: 95000, total: 95000 },
      { description: "Compliance Audit SLA Support", quantity: 1, unitPrice: 30000, total: 30000 },
    ],
    rawText: `INVOICE #AC-2026-091\nVendor: Acme Corp\nDate: 18 Sep 2026\nDue Date: 15 Oct 2026\nBill To: CentrAlign Technologies Pvt Ltd\nTotal Amount: INR 125,000\nItems: Enterprise Cloud Security Subscription Q3 (95,000 INR), Compliance Audit SLA Support (30,000 INR). Payment Terms: Net 30.`,
  },
  {
    id: "INV-1002",
    invoiceNumber: "AC-2026-104",
    vendor: "Acme Corp",
    vendorAddress: "450 Industrial Parkway, Sector 18, Gurugram, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-25",
    dueDate: "2026-10-25",
    amount: 45000,
    currency: "INR",
    status: "received",
    items: [
      { description: "Hardware Peripherals & USB-C Docks", quantity: 15, unitPrice: 3000, total: 45000 },
    ],
    rawText: `INVOICE #AC-2026-104\nVendor: Acme Corp\nDate: 25 Sep 2026\nDue Date: 25 Oct 2026\nBill To: CentrAlign Technologies Pvt Ltd\nTotal: INR 45,000. Hardware Peripherals. Below auto-approval threshold.`,
  },
  {
    id: "INV-1003",
    invoiceNumber: "AC-2026-001",
    vendor: "Acme Corp",
    vendorAddress: "450 Industrial Parkway, Sector 18, Gurugram, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-08-01",
    dueDate: "2026-08-30",
    amount: 32000,
    currency: "INR",
    status: "entered",
    items: [
      { description: "Annual Domain Maintenance & DNS Services", quantity: 1, unitPrice: 32000, total: 32000 },
    ],
    rawText: `INVOICE #AC-2026-001\nVendor: Acme Corp\nDate: 01 Aug 2026\nDue Date: 30 Aug 2026\nAmount: INR 32,000\nStatus: Historical Entered.`,
  },
  {
    id: "INV-1004",
    invoiceNumber: "GL-2026-550",
    vendor: "Globex",
    vendorAddress: "Global Trade Tower, Level 22, Financial District, Mumbai, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-28",
    dueDate: "2026-10-31",
    amount: 650000,
    currency: "INR",
    status: "received",
    items: [
      { description: "Enterprise Data Warehousing Cluster (Annual)", quantity: 1, unitPrice: 650000, total: 650000 },
    ],
    rawText: `INVOICE #GL-2026-550\nVendor: Globex Corporation\nDate: 28 Sep 2026\nDue Date: 31 Oct 2026\nAmount: INR 650,000\nNote: High-value enterprise infrastructure contract. Requires high-risk executive sign-off.`,
  },
  {
    id: "INV-1005",
    invoiceNumber: "GL-2026-301",
    vendor: "Globex",
    vendorAddress: "Global Trade Tower, Level 22, Financial District, Mumbai, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-12",
    // dueDate is deliberately omitted to test missing due date handling!
    amount: 78000,
    currency: "INR",
    status: "received",
    items: [
      { description: "Custom Reporting Analytics Modules", quantity: 2, unitPrice: 39000, total: 78000 },
    ],
    rawText: `INVOICE #GL-2026-301\nVendor: Globex Corporation\nDate: 12 Sep 2026\nBill To: CentrAlign Technologies Pvt Ltd\nAmount: INR 78,000\nNotice: Payment due date not specified in vendor slip. Contact accounts payable.`,
    metadata: {
      specialHandling: "missing_due_date",
    },
  },
  {
    id: "INV-1006",
    invoiceNumber: "GL-2026-402",
    vendor: "Globex",
    vendorAddress: "Global Trade Tower, Level 22, Financial District, Mumbai, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-22",
    dueDate: "2026-10-22",
    amount: 88000,
    currency: "INR",
    status: "received",
    items: [
      { description: "Database Optimization & Indexing Consulting", quantity: 1, unitPrice: 88000, total: 88000 },
    ],
    rawText: `INVOICE #GL-2026-402\nVendor: Globex Corporation\nDate: 22 Sep 2026\nDue Date: 22 Oct 2026\nTotal: INR 88,000\nTarget Database Node: DB-SHARD-9.`,
    metadata: {
      specialHandling: "flaky_db_error", // Triggers transient database error on 1st attempt to test recovery & bounded retry!
    },
  },
  {
    id: "INV-1007",
    invoiceNumber: "WE-2026-888",
    vendor: "Wayne Enterprises",
    vendorAddress: "Wayne Plaza 100, Bengaluru, Karnataka, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-05",
    dueDate: "2026-10-05",
    amount: 195000,
    currency: "INR",
    status: "received",
    items: [
      { description: "High-Performance Compute Server Rack (Lease)", quantity: 1, unitPrice: 195000, total: 195000 },
    ],
    rawText: `INVOICE #WE-2026-888\nVendor: Wayne Enterprises\nDate: 05 Sep 2026\nDue Date: 05 Oct 2026\nAmount: INR 195,000\nPayment Method: NEFT / Wire Transfer.`,
    metadata: {
      specialHandling: "duplicate_test", // Already exists in finance database!
    },
  },
  {
    id: "INV-1008",
    invoiceNumber: "WE-2026-889",
    vendor: "Wayne Enterprises",
    vendorAddress: "Wayne Plaza 100, Bengaluru, Karnataka, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-15",
    dueDate: "2026-10-15",
    amount: 210000,
    currency: "INR",
    status: "received",
    items: [
      { description: "Specialized Tactical Surveillance Optics & Sensors", quantity: 3, unitPrice: 70000, total: 210000 },
    ],
    rawText: `INVOICE #WE-2026-889\nVendor: Wayne Enterprises\nDate: 15 Sep 2026\nDue Date: 15 Oct 2026\nAmount: INR 210,000\nFinance system has mismatched recorded amount of INR 150,000!`,
    metadata: {
      specialHandling: "mismatch_test",
    },
  },
  {
    id: "INV-1009",
    invoiceNumber: "WE-2026-900",
    vendor: "Wayne Enterprises",
    vendorAddress: "Wayne Plaza 100, Bengaluru, Karnataka, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-30",
    dueDate: "2026-10-30",
    amount: 92000,
    currency: "INR",
    status: "received",
    items: [
      { description: "Cybersecurity Penetration Test Suite", quantity: 1, unitPrice: 92000, total: 92000 },
    ],
    rawText: `INVOICE #WE-2026-900\nVendor: Wayne Enterprises\nDate: 30 Sep 2026\nDue Date: 30 Oct 2026\nAmount: INR 92,000\nUnder auto-approval threshold.`,
  },
  {
    id: "INV-1010",
    invoiceNumber: "ST-2026-101",
    vendor: "Stark Industries",
    vendorAddress: "Stark Tower, Cyber City, Hyderabad, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-20",
    dueDate: "2026-10-20",
    amount: 85000,
    currency: "INR",
    status: "received",
    items: [
      { description: "Clean Energy Reactor Micro-Cooling Units", quantity: 2, unitPrice: 42500, total: 85000 },
    ],
    rawText: `INVOICE #ST-2026-101\nVendor: Stark Industries\nDate: 20 Sep 2026\nDue Date: 20 Oct 2026\nAmount: INR 85,000\nClean Energy Division.`,
  },
  {
    id: "INV-1011",
    invoiceNumber: "ST-2026-202",
    vendor: "Stark Industries",
    vendorAddress: "Stark Tower, Cyber City, Hyderabad, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-26",
    dueDate: "2026-10-26",
    amount: 320000,
    currency: "INR",
    status: "received",
    items: [
      { description: "Autonomous Drone Facility Fleet Telemetry", quantity: 1, unitPrice: 320000, total: 320000 },
    ],
    rawText: `INVOICE #ST-2026-202\nVendor: Stark Industries\nDate: 26 Sep 2026\nDue Date: 26 Oct 2026\nAmount: INR 320,000\nRequires human approval (Medium risk tier 100k-500k).`,
  },
  {
    id: "INV-1012",
    invoiceNumber: "ST-2026-303",
    vendor: "Stark Industries",
    vendorAddress: "Stark Tower, Cyber City, Hyderabad, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-02",
    dueDate: "2026-10-02",
    amount: 18500,
    currency: "INR",
    status: "entered",
    items: [
      { description: "Sensor Array Replacement Cables", quantity: 5, unitPrice: 3700, total: 18500 },
    ],
    rawText: `INVOICE #ST-2026-303\nVendor: Stark Industries\nDate: 02 Sep 2026\nDue Date: 02 Oct 2026\nAmount: INR 18,500.`,
  },
  {
    id: "INV-1013",
    invoiceNumber: "UM-2026-012",
    vendor: "Umbrella Labs",
    vendorAddress: "Bio-Tech Park, Phase 2, Pune, Maharashtra, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-14",
    dueDate: "2026-10-14",
    amount: 54000,
    currency: "INR",
    status: "received",
    items: [
      { description: "Air Filtration Quality Sensors", quantity: 6, unitPrice: 9000, total: 54000 },
    ],
    rawText: `INVOICE #UM-2026-012\nVendor: Umbrella Labs\nDate: 14 Sep 2026\nDue Date: 14 Oct 2026\nAmount: INR 54,000.`,
  },
  {
    id: "INV-1014",
    invoiceNumber: "UM-2026-045",
    vendor: "Umbrella Labs",
    vendorAddress: "Bio-Tech Park, Phase 2, Pune, Maharashtra, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-24",
    dueDate: "2026-10-24",
    amount: 410000,
    currency: "INR",
    status: "received",
    items: [
      { description: "Environmental Containment Biosafety Unit", quantity: 1, unitPrice: 410000, total: 410000 },
    ],
    rawText: `INVOICE #UM-2026-045\nVendor: Umbrella Labs\nDate: 24 Sep 2026\nDue Date: 24 Oct 2026\nAmount: INR 410,000\nRequires human manager approval.`,
  },
  {
    id: "INV-1015",
    invoiceNumber: "UM-2026-099",
    vendor: "Umbrella Labs",
    vendorAddress: "Bio-Tech Park, Phase 2, Pune, Maharashtra, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-09-29",
    dueDate: "2026-10-29",
    amount: 720000,
    currency: "INR",
    status: "received",
    items: [
      { description: "Cryogenic Storage Nitrogen Tanks & Servicing", quantity: 2, unitPrice: 360000, total: 720000 },
    ],
    rawText: `INVOICE #UM-2026-099\nVendor: Umbrella Labs\nDate: 29 Sep 2026\nDue Date: 29 Oct 2026\nAmount: INR 720,000\nHigh-value critical equipment.`,
  },
  {
    id: "INV-1016",
    invoiceNumber: "AC-2026-092",
    vendor: "Acme Corp",
    vendorAddress: "450 Industrial Parkway, Sector 18, Gurugram, India",
    recipient: "CentrAlign Technologies Pvt Ltd",
    issueDate: "2026-10-01",
    dueDate: "2026-10-31",
    amount: 140000,
    currency: "INR",
    status: "received",
    items: [
      { description: "Managed Kubernetes Cluster Support (October)", quantity: 1, unitPrice: 140000, total: 140000 },
    ],
    rawText: `INVOICE #AC-2026-092\nVendor: Acme Corp\nDate: 01 Oct 2026\nDue Date: 31 Oct 2026\nAmount: INR 140,000\nBill To: CentrAlign Technologies Pvt Ltd.`,
  },
];

export const INITIAL_FINANCE_RECORDS: FinanceRecord[] = [
  {
    recordId: "FIN-2001",
    invoiceNumber: "AC-2026-001",
    vendor: "Acme Corp",
    amount: 32000,
    currency: "INR",
    dueDate: "2026-08-30",
    status: "PAID",
    enteredAt: "2026-08-02T11:20:00Z",
    enteredBy: "finance_agent_v1",
    approvalRisk: "low",
    lineItemsCount: 1,
  },
  {
    recordId: "FIN-2015",
    invoiceNumber: "ST-2026-303",
    vendor: "Stark Industries",
    amount: 18500,
    currency: "INR",
    dueDate: "2026-10-02",
    status: "RECONCILED",
    enteredAt: "2026-09-03T09:15:00Z",
    enteredBy: "finance_agent_v1",
    approvalRisk: "low",
    lineItemsCount: 1,
  },
  {
    recordId: "FIN-2020",
    invoiceNumber: "WE-2026-888",
    vendor: "Wayne Enterprises",
    amount: 195000,
    currency: "INR",
    dueDate: "2026-10-05",
    status: "PENDING_PAYMENT",
    enteredAt: "2026-09-06T14:30:00Z",
    enteredBy: "manual_entry_ap",
    approvedBy: "cfo@company.com",
    approvalRisk: "medium",
    lineItemsCount: 1,
  },
  {
    recordId: "FIN-2022",
    invoiceNumber: "WE-2026-889",
    vendor: "Wayne Enterprises",
    // Intentionally mismatched amount to test amount difference detection!
    amount: 150000,
    currency: "INR",
    dueDate: "2026-10-15",
    status: "FLAGGED",
    enteredAt: "2026-09-16T10:00:00Z",
    enteredBy: "legacy_importer",
    approvalRisk: "medium",
    lineItemsCount: 3,
  },
];

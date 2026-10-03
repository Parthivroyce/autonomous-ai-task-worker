export type AgentStatus =
  | "INITIALIZING"
  | "UNDERSTANDING"
  | "PLANNING"
  | "EXECUTING"
  | "WAITING_FOR_APPROVAL"
  | "VERIFYING"
  | "RECOVERING"
  | "COMPLETED"
  | "FAILED";

export interface PlanStep {
  id: number;
  description: string;
  tool: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  expectedOutcome?: string;
  resultSummary?: string;
}

export interface ToolCall {
  id: string;
  stepId: number;
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "executing" | "success" | "error" | "retrying";
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  retryCount?: number;
}

export interface Observation {
  id: string;
  stepId: number;
  timestamp: string;
  toolName: string;
  summary: string;
  rawResult: unknown;
  reasoning: string;
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  toolName: string;
  reason: string;
  action: string;
  risk: "low" | "medium" | "high";
  details: {
    vendor?: string;
    invoice_number?: string;
    amount?: number;
    currency?: string;
    due_date?: string;
    missingField?: string;
    [key: string]: unknown;
  };
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  rejectionReason?: string;
}

export interface VerificationCheck {
  field: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
  notes?: string;
}

export interface VerificationResult {
  verified: boolean;
  recordId: string;
  timestamp: string;
  checks: VerificationCheck[];
  summary: string;
}

export interface Evidence {
  type:
    | "invoice_found"
    | "extracted_data"
    | "policy_checked"
    | "finance_record_created"
    | "verification_passed"
    | "approval_granted"
    | "duplicate_detected";
  title: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface AgentState {
  taskId: string;
  goal: string;
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  plan: PlanStep[];
  currentStep: number;

  observations: Observation[];
  memory: Record<string, unknown>;

  toolCalls: ToolCall[];
  approvals: ApprovalRequest[];

  evidence: Evidence[];
  verification?: VerificationResult;

  finalSummary?: string;
  errorMessage?: string;
}

export interface AgentEvent {
  id: string;
  taskId: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface InvoiceDocument {
  id: string;
  invoiceNumber: string;
  vendor: string;
  vendorAddress: string;
  recipient: string;
  issueDate: string;
  dueDate?: string;
  amount: number;
  currency: string;
  status: "received" | "processing" | "entered" | "disputed";
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  rawText: string;
  metadata?: {
    specialHandling?: string;
  };
}

export interface FinanceRecord {
  recordId: string;
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

export interface AuditLogEntry {
  id: string;
  taskId: string;
  timestamp: string;
  stepId: number;
  agentState: string;
  toolName: string;
  permission: "READ" | "WRITE" | "APPROVAL";
  inputSanitized: Record<string, unknown>;
  outputSanitized?: Record<string, unknown>;
  status: "SUCCESS" | "FAILED" | "RETRYING" | "PAUSED_FOR_APPROVAL";
  durationMs: number;
  retryCount: number;
  errorMessage?: string;
}

export interface CompanyPolicy {
  invoice_auto_approval_limit: number;
  high_risk_threshold: number;
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

export interface ToolMetadata {
  name: string;
  description: string;
  permission: "READ" | "WRITE" | "APPROVAL";
  inputSchemaJson: Record<string, unknown>;
}

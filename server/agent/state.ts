/**
 * Agent State Machine and Core Types
 * Explicit state representation for the Autonomous Finance Employee.
 */

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
  type: "invoice_found" | "extracted_data" | "policy_checked" | "finance_record_created" | "verification_passed" | "approval_granted" | "duplicate_detected";
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

export type AgentEventType =
  | "agent_state_changed"
  | "agent_step_started"
  | "plan_created"
  | "tool_call_started"
  | "tool_call_completed"
  | "tool_call_failed"
  | "observation"
  | "approval_required"
  | "approval_resolved"
  | "recovery_attempt"
  | "verification_started"
  | "verification_completed"
  | "task_completed"
  | "task_failed";

export interface AgentEvent {
  id: string;
  taskId: string;
  type: AgentEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

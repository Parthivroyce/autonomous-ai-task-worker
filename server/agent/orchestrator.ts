/**
 * Autonomous Agent Orchestrator
 * Implements the core autonomous loop:
 * GOAL → UNDERSTAND → PLAN → SELECT TOOLS → EXECUTE → OBSERVE → ADAPT → VERIFY → COMPLETE
 */

import { EventEmitter } from "events";
import {
  AgentState,
  AgentStatus,
  AgentEvent,
  AgentEventType,
  PlanStep,
  ToolCall,
  Observation,
  ApprovalRequest,
  VerificationResult,
} from "./state.js";
import { Planner } from "./planner.js";
import { toolRegistry } from "../tools/registry.js";
import { PolicyEngine } from "./policies.js";
import { Verifier } from "./verifier.js";
import { RecoveryEngine } from "./recovery.js";
import { companyMemory } from "../environment/companyMemory.js";
import { auditLogger } from "../audit/auditLogger.js";
import { ExtractedInvoiceData } from "../environment/invoiceRepository.js";

const MAX_STEPS = 25;

export class AgentOrchestrator extends EventEmitter {
  private tasks: Map<string, AgentState> = new Map();
  private eventHistory: Map<string, AgentEvent[]> = new Map();

  constructor() {
    super();
  }

  public getTask(taskId: string): AgentState | undefined {
    return this.tasks.get(taskId);
  }

  public getAllTasks(): AgentState[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getTaskEvents(taskId: string): AgentEvent[] {
    return this.eventHistory.get(taskId) || [];
  }

  private emitAgentEvent(taskId: string, type: AgentEventType, payload: Record<string, unknown>): void {
    const event: AgentEvent = {
      id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      taskId,
      type,
      timestamp: new Date().toISOString(),
      payload,
    };

    if (!this.eventHistory.has(taskId)) {
      this.eventHistory.set(taskId, []);
    }
    this.eventHistory.get(taskId)!.push(event);

    this.emit(`task:${taskId}`, event);
    this.emit("agent_event", event);
  }

  /**
   * Initialize a new task and begin the autonomous loop
   */
  public async startTask(goal: string): Promise<AgentState> {
    const taskId = `TASK-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();

    const initialState: AgentState = {
      taskId,
      goal,
      status: "UNDERSTANDING",
      createdAt: now,
      updatedAt: now,
      plan: [],
      currentStep: 0,
      observations: [],
      memory: {
        vendorTarget: undefined,
        invoiceIdTarget: undefined,
        extractedInvoice: undefined,
        existingFinanceRecord: undefined,
        createdFinanceRecordId: undefined,
        isApproved: false,
        retryCounts: {},
      },
      toolCalls: [],
      approvals: [],
      evidence: [],
    };

    this.tasks.set(taskId, initialState);
    this.emitAgentEvent(taskId, "agent_state_changed", {
      status: "UNDERSTANDING",
      message: `Received goal: "${goal}"`,
    });

    // Run execution loop in background
    setTimeout(() => {
      this.runLoop(taskId).catch((err) => {
        console.error(`[Orchestrator] Error in task ${taskId}:`, err);
        this.failTask(taskId, err.message || "Unexpected orchestrator error");
      });
    }, 50);

    return initialState;
  }

  /**
   * The core agent execution loop
   */
  private async runLoop(taskId: string): Promise<void> {
    const state = this.tasks.get(taskId);
    if (!state) return;

    // STEP 1: UNDERSTAND & PLAN
    state.status = "PLANNING";
    state.updatedAt = new Date().toISOString();
    this.emitAgentEvent(taskId, "agent_state_changed", {
      status: "PLANNING",
      message: "Analyzing goal and formulating structured plan...",
    });

    const planData = await Planner.createPlan(state.goal);
    state.plan = planData.steps;
    state.memory.vendorTarget = planData.vendor;
    state.memory.invoiceNumberTarget = planData.invoiceNumber;

    this.emitAgentEvent(taskId, "plan_created", {
      understanding: planData.understanding,
      steps: state.plan,
    });

    state.status = "EXECUTING";
    state.updatedAt = new Date().toISOString();
    this.emitAgentEvent(taskId, "agent_state_changed", {
      status: "EXECUTING",
      message: "Executing plan steps autonomously...",
    });

    let stepCount = 0;

    // STEP 2: AUTONOMOUS EXECUTION LOOP
    while (
      (state.status as AgentStatus) !== "COMPLETED" &&
      (state.status as AgentStatus) !== "FAILED" &&
      (state.status as AgentStatus) !== "WAITING_FOR_APPROVAL" &&
      stepCount < MAX_STEPS
    ) {
      stepCount++;
      state.currentStep = stepCount;

      // Select next action based on current state, plan, and observations
      const actionDecision = this.selectNextAction(state);

      if (actionDecision.shouldComplete) {
        await this.completeTask(taskId, actionDecision.completionSummary || "Task completed successfully with evidence.");
        break;
      }

      if (actionDecision.shouldFail) {
        this.failTask(taskId, actionDecision.failureReason || "Task could not be completed.");
        break;
      }

      if (actionDecision.requiresApproval) {
        state.status = "WAITING_FOR_APPROVAL";
        state.updatedAt = new Date().toISOString();
        this.emitAgentEvent(taskId, "approval_required", {
          approval: actionDecision.approvalData,
        });
        break; // Loop pauses until human approves or rejects via API
      }

      const { toolName, input, planStepId } = actionDecision;

      // Execute tool with observation & recovery
      const stepSuccess = await this.executeStep(state, planStepId, toolName, input);

      if (!stepSuccess && (state.status as AgentStatus) === "FAILED") {
        break;
      }
    }

    if (stepCount >= MAX_STEPS && (state.status as AgentStatus) === "EXECUTING") {
      this.failTask(taskId, `Exceeded maximum allowed execution steps limit (${MAX_STEPS}).`);
    }
  }

  /**
   * Decide next tool and input dynamically based on observations
   */
  private selectNextAction(state: AgentState): {
    toolName: string;
    input: Record<string, unknown>;
    planStepId: number;
    requiresApproval?: boolean;
    approvalData?: ApprovalRequest;
    shouldComplete?: boolean;
    completionSummary?: string;
    shouldFail?: boolean;
    failureReason?: string;
  } {
    const memory = state.memory;
    const extracted = memory.extractedInvoice as ExtractedInvoiceData | undefined;

    // Phase 1: Search invoices if not found yet
    if (!memory.foundInvoiceId && !memory.invoiceSearchDone) {
      return {
        toolName: "search_invoices",
        input: {
          vendor: (memory.vendorTarget as string) || undefined,
          limit: 5,
        },
        planStepId: 1,
      };
    }

    // If search done but no invoice found
    if (memory.invoiceSearchDone && !memory.foundInvoiceId) {
      return {
        toolName: "none",
        input: {},
        planStepId: 1,
        shouldFail: true,
        failureReason: `No matching invoices found in company repository for vendor '${memory.vendorTarget || "requested"}'.`,
      };
    }

    // Phase 2: Get invoice document content
    if (memory.foundInvoiceId && !memory.invoiceDocumentRetrieved) {
      return {
        toolName: "get_invoice",
        input: { invoice_id: memory.foundInvoiceId as string },
        planStepId: 2,
      };
    }

    // Phase 3: Extract structured invoice data
    if (memory.invoiceDocumentRetrieved && !extracted) {
      return {
        toolName: "extract_invoice_data",
        input: { invoice_id: memory.foundInvoiceId as string },
        planStepId: 3,
      };
    }

    // Phase 4: Policy & completeness check on extracted data
    if (extracted && !memory.completenessChecked) {
      memory.completenessChecked = true;

      // If missing due date (Scenario C)
      if (!extracted.due_date) {
        const approvalReq: ApprovalRequest = {
          id: `APPR-${Date.now()}-MISSING-DATE`,
          taskId: state.taskId,
          toolName: "request_human_approval",
          reason: `Invoice ${extracted.invoice_number} is missing payment due date. Organization policy requires human input before ERP entry.`,
          action: "Provide or approve missing payment due date",
          risk: "medium",
          details: {
            vendor: extracted.vendor,
            invoice_number: extracted.invoice_number,
            amount: extracted.amount,
            currency: extracted.currency,
            missingField: "due_date",
          },
          status: "pending",
          requestedAt: new Date().toISOString(),
        };
        state.approvals.push(approvalReq);
        return {
          toolName: "request_human_approval",
          input: {},
          planStepId: 4,
          requiresApproval: true,
          approvalData: approvalReq,
        };
      }
    }

    // Phase 5: Search finance records for duplicates (Scenario B)
    if (extracted && !memory.duplicateSearchDone) {
      return {
        toolName: "search_finance_records",
        input: {
          invoice_number: extracted.invoice_number,
          vendor: extracted.vendor,
        },
        planStepId: 4,
      };
    }

    // If existing duplicate detected (Scenario B)
    if (memory.existingFinanceRecord && !memory.duplicateHandled) {
      memory.duplicateHandled = true;
      const existing = memory.existingFinanceRecord as { recordId: string; amount: number; invoiceNumber: string };

      // Check if amount in ledger matches invoice (Scenario D)
      if (Math.abs(existing.amount - extracted!.amount) >= 0.01) {
        state.evidence.push({
          type: "duplicate_detected",
          title: "Amount Mismatch with Existing Ledger Record",
          data: {
            invoiceNumber: extracted!.invoice_number,
            extractedAmount: extracted!.amount,
            ledgerRecordId: existing.recordId,
            ledgerAmount: existing.amount,
          },
          timestamp: new Date().toISOString(),
        });
        return {
          toolName: "none",
          input: {},
          planStepId: 4,
          shouldFail: true,
          failureReason: `AUDIT_ALERT: Invoice ${extracted!.invoice_number} already exists in ERP as ${existing.recordId}, but recorded amount (₹${existing.amount.toLocaleString()}) does not match invoice document (₹${extracted!.amount.toLocaleString()}). Execution stopped to prevent silent overwrite.`,
        };
      }

      // Existing record matches: verify existing record instead of creating duplicate
      return {
        toolName: "get_finance_record",
        input: { record_id: existing.recordId },
        planStepId: 5,
      };
    }

    // If duplicate was handled and verified
    if (memory.duplicateHandled && memory.verifiedExisting) {
      return {
        toolName: "none",
        input: {},
        planStepId: 6,
        shouldComplete: true,
        completionSummary: `Invoice ${extracted!.invoice_number} was already safely recorded in finance ERP as ${
          (memory.existingFinanceRecord as any)?.recordId
        }. Duplicate creation was proactively avoided, and the existing record was verified.`,
      };
    }

    // Phase 6: Human approval policy check
    if (extracted && !memory.policyChecked) {
      const policyEval = PolicyEngine.evaluateInvoiceEntry({
        vendor: extracted.vendor,
        invoice_number: extracted.invoice_number,
        amount: extracted.amount,
        currency: extracted.currency,
        due_date: extracted.due_date,
        isApproved: Boolean(memory.isApproved),
      });

      memory.policyChecked = true;
      state.evidence.push({
        type: "policy_checked",
        title: "Enterprise Policy Evaluation",
        data: {
          allowed: policyEval.allowed,
          requiresApproval: policyEval.requiresApproval,
          riskTier: policyEval.riskTier,
          reason: policyEval.reason,
        },
        timestamp: new Date().toISOString(),
      });

      if (policyEval.requiresApproval && !memory.isApproved) {
        const approvalReq: ApprovalRequest = {
          id: `APPR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          taskId: state.taskId,
          toolName: "request_human_approval",
          reason: policyEval.reason,
          action: "Approve recording invoice into finance ERP",
          risk: policyEval.riskTier,
          details: {
            vendor: extracted.vendor,
            invoice_number: extracted.invoice_number,
            amount: extracted.amount,
            currency: extracted.currency,
            due_date: extracted.due_date || undefined,
          },
          status: "pending",
          requestedAt: new Date().toISOString(),
        };
        state.approvals.push(approvalReq);
        return {
          toolName: "request_human_approval",
          input: {},
          planStepId: 5,
          requiresApproval: true,
          approvalData: approvalReq,
        };
      }
    }

    // Phase 7: Write to Finance ERP
    if (extracted && !memory.createdFinanceRecordId && !memory.writeAttempted) {
      return {
        toolName: "create_finance_record",
        input: {
          invoice_number: extracted.invoice_number,
          vendor: extracted.vendor,
          amount: extracted.amount,
          currency: extracted.currency,
          due_date: extracted.due_date!,
          line_items_count: extracted.line_items?.length || 1,
        },
        planStepId: 6,
      };
    }

    // Phase 8: Get newly created record for independent verification
    if (memory.createdFinanceRecordId && !memory.verificationRecordFetched) {
      return {
        toolName: "get_finance_record",
        input: { record_id: memory.createdFinanceRecordId as string },
        planStepId: 7,
      };
    }

    // Phase 9: Verification
    if (memory.createdFinanceRecordId && memory.verificationRecordFetched && !state.verification) {
      // Trigger verification check
      return {
        toolName: "get_finance_record",
        input: { record_id: memory.createdFinanceRecordId as string },
        planStepId: 7,
      };
    }

    // Phase 10: Completion
    if (state.verification?.verified) {
      return {
        toolName: "none",
        input: {},
        planStepId: 7,
        shouldComplete: true,
        completionSummary: `Completed invoice processing for ${extracted?.vendor || "Vendor"}. Invoice: ${
          extracted?.invoice_number
        }, Amount: ₹${extracted?.amount.toLocaleString()}, Record: ${memory.createdFinanceRecordId}. All verification checks passed.`,
      };
    }

    return {
      toolName: "none",
      input: {},
      planStepId: 7,
      shouldFail: true,
      failureReason: "State machine reached an unhandled terminal state.",
    };
  }

  /**
   * Execute an individual tool step with timing, audit logging, and bounded recovery
   */
  private async executeStep(
    state: AgentState,
    stepId: number,
    toolName: string,
    input: Record<string, unknown>
  ): Promise<boolean> {
    const taskId = state.taskId;
    const toolCallId = `CALL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const startTime = Date.now();

    const toolDef = toolRegistry.getTool(toolName);
    const permission = toolDef?.permission || "READ";

    const toolCallRecord: ToolCall = {
      id: toolCallId,
      stepId,
      toolName,
      input,
      status: "executing",
      startedAt: new Date().toISOString(),
      retryCount: 0,
    };
    state.toolCalls.push(toolCallRecord);

    this.emitAgentEvent(taskId, "tool_call_started", {
      stepId,
      toolName,
      input,
    });

    let attempts = 0;
    const maxRetries = companyMemory.getPolicy().max_retry_attempts || 3;
    let lastError: string | undefined;
    let lastErrorCode: string | undefined;
    let executionSuccess = false;
    let resultData: unknown = null;

    while (attempts < maxRetries && !executionSuccess) {
      attempts++;
      toolCallRecord.retryCount = attempts - 1;

      try {
        const result = await toolRegistry.executeTool(toolName, input, {
          taskId,
          stepId,
          approved: Boolean(state.memory.isApproved),
          approvalUser: (state.memory.approvedBy as string) || "human_supervisor",
        });

        if (result.success) {
          executionSuccess = true;
          resultData = result.data;
          break;
        } else {
          lastError = result.error || "Tool returned failure";
          lastErrorCode = result.errorCode;

          // Check if retryable error (Scenario A)
          if (RecoveryEngine.isRetryableError(lastError, lastErrorCode) && attempts < maxRetries) {
            state.status = "RECOVERING";
            state.updatedAt = new Date().toISOString();
            const delayMs = RecoveryEngine.calculateBackoff(attempts);

            this.emitAgentEvent(taskId, "recovery_attempt", {
              toolName,
              attempt: attempts,
              maxRetries,
              error: lastError,
              delayMs,
              strategy: "RETRY_WITH_BACKOFF",
            });

            auditLogger.log({
              taskId,
              stepId,
              agentState: "RECOVERING",
              toolName,
              permission,
              inputSanitized: input,
              status: "RETRYING",
              durationMs: Date.now() - startTime,
              retryCount: attempts,
              errorMessage: lastError,
            });

            // Exponential backoff pause
            await new Promise((r) => setTimeout(r, delayMs));
            state.status = "EXECUTING";
            continue;
          } else {
            // Non-retryable error
            break;
          }
        }
      } catch (err: unknown) {
        lastError = (err as Error).message || "Execution exception";
        break;
      }
    }

    const durationMs = Date.now() - startTime;
    toolCallRecord.durationMs = durationMs;
    toolCallRecord.completedAt = new Date().toISOString();

    if (executionSuccess) {
      toolCallRecord.status = "success";
      toolCallRecord.output = (resultData as Record<string, unknown>) || {};

      auditLogger.log({
        taskId,
        stepId,
        agentState: state.status,
        toolName,
        permission,
        inputSanitized: input,
        outputSanitized: (resultData as Record<string, unknown>) || {},
        status: "SUCCESS",
        durationMs,
        retryCount: attempts - 1,
      });

      this.emitAgentEvent(taskId, "tool_call_completed", {
        stepId,
        toolName,
        result: resultData,
        durationMs,
      });

      // Update observation and state memory
      await this.handleToolSuccess(state, stepId, toolName, resultData);
      return true;
    } else {
      toolCallRecord.status = "error";
      toolCallRecord.error = lastError;

      auditLogger.log({
        taskId,
        stepId,
        agentState: state.status,
        toolName,
        permission,
        inputSanitized: input,
        status: "FAILED",
        durationMs,
        retryCount: attempts - 1,
        errorMessage: lastError,
      });

      this.emitAgentEvent(taskId, "tool_call_failed", {
        stepId,
        toolName,
        error: lastError,
        errorCode: lastErrorCode,
        durationMs,
      });

      this.handleToolFailure(state, stepId, toolName, lastError || "Failed", lastErrorCode);
      return false;
    }
  }

  /**
   * Process tool success results into state memory and observations
   */
  private async handleToolSuccess(
    state: AgentState,
    stepId: number,
    toolName: string,
    data: unknown
  ): Promise<void> {
    const now = new Date().toISOString();

    if (toolName === "search_invoices") {
      const res = data as { total: number; invoices: Array<{ id: string; invoice_number: string; vendor: string }> };
      state.memory.invoiceSearchDone = true;

      if (res.invoices && res.invoices.length > 0) {
        // Pick specific invoice if requested, otherwise latest
        let matched = res.invoices[0];
        if (state.memory.invoiceNumberTarget) {
          const target = (state.memory.invoiceNumberTarget as string).toLowerCase().trim();
          const found = res.invoices.find(
            (inv) =>
              inv.invoice_number.toLowerCase().trim() === target ||
              inv.id.toLowerCase().trim() === target
          );
          if (found) matched = found;
        }

        state.memory.foundInvoiceId = matched.id;
        state.memory.foundInvoiceNumber = matched.invoice_number;

        const obs: Observation = {
          id: `OBS-${Date.now()}`,
          stepId,
          timestamp: now,
          toolName,
          summary: `Found ${res.total} invoice(s) for vendor. Selected latest: ${matched.invoice_number} (${matched.id}).`,
          rawResult: data,
          reasoning: "Search yielded matching invoice documents. Proceeding to fetch full document text.",
        };
        state.observations.push(obs);
        this.emitAgentEvent(state.taskId, "observation", { observation: obs });

        state.evidence.push({
          type: "invoice_found",
          title: `Invoice Document Identified: ${matched.invoice_number}`,
          data: { invoiceId: matched.id, invoiceNumber: matched.invoice_number, vendor: matched.vendor },
          timestamp: now,
        });
      } else {
        const obs: Observation = {
          id: `OBS-${Date.now()}`,
          stepId,
          timestamp: now,
          toolName,
          summary: "No invoices matched the search query.",
          rawResult: data,
          reasoning: "Vendor document does not exist in repository. Cannot proceed with data extraction.",
        };
        state.observations.push(obs);
        this.emitAgentEvent(state.taskId, "observation", { observation: obs });
      }
    } else if (toolName === "get_invoice") {
      state.memory.invoiceDocumentRetrieved = true;
      const obs: Observation = {
        id: `OBS-${Date.now()}`,
        stepId,
        timestamp: now,
        toolName,
        summary: `Retrieved full invoice document contents for ${state.memory.foundInvoiceId}.`,
        rawResult: data,
        reasoning: "Document content loaded. Proceeding to extract structured financial fields.",
      };
      state.observations.push(obs);
      this.emitAgentEvent(state.taskId, "observation", { observation: obs });
    } else if (toolName === "extract_invoice_data") {
      const extracted = data as ExtractedInvoiceData;
      state.memory.extractedInvoice = extracted;

      const obs: Observation = {
        id: `OBS-${Date.now()}`,
        stepId,
        timestamp: now,
        toolName,
        summary: `Extracted fields: Invoice #${extracted.invoice_number}, Vendor: ${extracted.vendor}, Amount: ₹${extracted.amount.toLocaleString()} ${extracted.currency}, Due Date: ${extracted.due_date || "MISSING"}. Complete: ${extracted.is_complete}.`,
        rawResult: data,
        reasoning: extracted.is_complete
          ? "Extraction complete and all mandatory fields present. Ready for duplicate check."
          : `Extraction incomplete: Missing required field(s): ${extracted.missing_fields.join(", ")}. Human intervention required.`,
      };
      state.observations.push(obs);
      this.emitAgentEvent(state.taskId, "observation", { observation: obs });

      state.evidence.push({
        type: "extracted_data",
        title: "Structured Financial Extraction",
        data: {
          invoice_number: extracted.invoice_number,
          vendor: extracted.vendor,
          amount: extracted.amount,
          currency: extracted.currency,
          due_date: extracted.due_date,
          line_items_count: extracted.line_items?.length || 0,
        },
        timestamp: now,
      });
    } else if (toolName === "search_finance_records") {
      const res = data as { total: number; records: any[]; hasExistingRecord: boolean };
      state.memory.duplicateSearchDone = true;

      if (res.hasExistingRecord && res.records.length > 0) {
        state.memory.existingFinanceRecord = res.records[0];
        const obs: Observation = {
          id: `OBS-${Date.now()}`,
          stepId,
          timestamp: now,
          toolName,
          summary: `Invoice is already recorded in ERP ledger under Record ID: ${res.records[0].recordId}.`,
          rawResult: data,
          reasoning: "Invoice already exists in finance system. Bypassing create_finance_record to prevent duplicate ledger entry.",
        };
        state.observations.push(obs);
        this.emitAgentEvent(state.taskId, "observation", { observation: obs });
      } else {
        const obs: Observation = {
          id: `OBS-${Date.now()}`,
          stepId,
          timestamp: now,
          toolName,
          summary: "Confirmed no duplicate record exists in finance ledger.",
          rawResult: data,
          reasoning: "Invoice is not yet recorded. Safe to proceed with policy check and creation.",
        };
        state.observations.push(obs);
        this.emitAgentEvent(state.taskId, "observation", { observation: obs });
      }
    } else if (toolName === "create_finance_record") {
      const created = data as { recordId: string; enteredAt: string };
      state.memory.createdFinanceRecordId = created.recordId;
      state.memory.writeAttempted = true;

      const obs: Observation = {
        id: `OBS-${Date.now()}`,
        stepId,
        timestamp: now,
        toolName,
        summary: `Successfully inserted record into finance ledger with ID ${created.recordId}.`,
        rawResult: data,
        reasoning: "Record inserted. Mandatory verification must now run to confirm ledger persistence and data accuracy.",
      };
      state.observations.push(obs);
      this.emitAgentEvent(state.taskId, "observation", { observation: obs });

      state.evidence.push({
        type: "finance_record_created",
        title: `Finance Ledger Entry Created: ${created.recordId}`,
        data: {
          recordId: created.recordId,
          timestamp: created.enteredAt,
        },
        timestamp: now,
      });
    } else if (toolName === "get_finance_record") {
      state.memory.verificationRecordFetched = true;
      const rec = data as { recordId: string };

      const obs: Observation = {
        id: `OBS-${Date.now()}`,
        stepId,
        timestamp: now,
        toolName,
        summary: `Retrieved record ${rec.recordId} from ledger for verification.`,
        rawResult: data,
        reasoning: "Conducting field-by-field verification against extracted invoice data.",
      };
      state.observations.push(obs);
      this.emitAgentEvent(state.taskId, "observation", { observation: obs });

      // Run verification
      await this.performVerification(state, rec.recordId);
    }
  }

  /**
   * Handle tool failures and policy halts
   */
  private handleToolFailure(
    state: AgentState,
    stepId: number,
    toolName: string,
    error: string,
    errorCode?: string
  ): void {
    const now = new Date().toISOString();
    const obs: Observation = {
      id: `OBS-${Date.now()}`,
      stepId,
      timestamp: now,
      toolName,
      summary: `Tool execution failed: ${error}`,
      rawResult: { error, errorCode },
      reasoning: "Encountered unrecoverable failure or policy violation. Halting task.",
    };
    state.observations.push(obs);
    this.emitAgentEvent(state.taskId, "observation", { observation: obs });

    this.failTask(state.taskId, error);
  }

  /**
   * Perform strict verification
   */
  private async performVerification(state: AgentState, recordId: string): Promise<void> {
    const extracted = state.memory.extractedInvoice as ExtractedInvoiceData;
    if (!extracted) return;

    state.status = "VERIFYING";
    state.updatedAt = new Date().toISOString();
    this.emitAgentEvent(state.taskId, "verification_started", { recordId });

    const verificationResult: VerificationResult = await Verifier.verifyFinanceRecord(recordId, extracted);
    state.verification = verificationResult;

    if (verificationResult.verified) {
      if (state.memory.duplicateHandled) {
        state.memory.verifiedExisting = true;
      }
      state.evidence.push({
        type: "verification_passed",
        title: "Durable Ledger Verification Confirmed",
        data: {
          recordId,
          checks: verificationResult.checks,
          summary: verificationResult.summary,
        },
        timestamp: new Date().toISOString(),
      });

      this.emitAgentEvent(state.taskId, "verification_completed", {
        verified: true,
        verification: verificationResult,
      });
    } else {
      this.emitAgentEvent(state.taskId, "verification_completed", {
        verified: false,
        verification: verificationResult,
      });

      this.failTask(
        state.taskId,
        `Verification FAILED: ${verificationResult.checks
          .filter((c) => !c.passed)
          .map((c) => `${c.field} mismatch`)
          .join(", ")}`
      );
    }
  }

  /**
   * Resume task when human manager grants approval in the UI
   */
  public async approveTask(taskId: string, approvedBy: string, customDueDate?: string): Promise<AgentState> {
    const state = this.tasks.get(taskId);
    if (!state) throw new Error(`Task ${taskId} not found`);

    if (state.status !== "WAITING_FOR_APPROVAL") {
      throw new Error(`Task ${taskId} is not waiting for approval (Current status: ${state.status})`);
    }

    const pendingApproval = state.approvals.find((a) => a.status === "pending");
    if (pendingApproval) {
      pendingApproval.status = "approved";
      pendingApproval.resolvedAt = new Date().toISOString();
      pendingApproval.resolvedBy = approvedBy;
    }

    state.memory.isApproved = true;
    state.memory.approvedBy = approvedBy;

    // If human provided missing due date
    if (customDueDate && state.memory.extractedInvoice) {
      (state.memory.extractedInvoice as ExtractedInvoiceData).due_date = customDueDate;
      (state.memory.extractedInvoice as ExtractedInvoiceData).is_complete = true;
    }

    state.evidence.push({
      type: "approval_granted",
      title: "Human Authorization Granted",
      data: {
        approvedBy,
        reason: pendingApproval?.reason,
        timestamp: new Date().toISOString(),
        customDueDate,
      },
      timestamp: new Date().toISOString(),
    });

    state.status = "EXECUTING";
    state.updatedAt = new Date().toISOString();

    this.emitAgentEvent(taskId, "approval_resolved", {
      status: "approved",
      approvedBy,
      customDueDate,
    });

    this.emitAgentEvent(taskId, "agent_state_changed", {
      status: "EXECUTING",
      message: `Approval received from ${approvedBy}. Resuming autonomous workflow...`,
    });

    // Resume loop
    setTimeout(() => {
      this.runLoop(taskId).catch((err) => {
        this.failTask(taskId, err.message || "Error resuming after approval");
      });
    }, 50);

    return state;
  }

  /**
   * Handle task rejection by human
   */
  public async rejectTask(taskId: string, reason: string, rejectedBy: string): Promise<AgentState> {
    const state = this.tasks.get(taskId);
    if (!state) throw new Error(`Task ${taskId} not found`);

    const pendingApproval = state.approvals.find((a) => a.status === "pending");
    if (pendingApproval) {
      pendingApproval.status = "rejected";
      pendingApproval.resolvedAt = new Date().toISOString();
      pendingApproval.resolvedBy = rejectedBy;
      pendingApproval.rejectionReason = reason;
    }

    state.status = "FAILED";
    state.updatedAt = new Date().toISOString();
    state.completedAt = new Date().toISOString();
    state.errorMessage = `Rejected by human supervisor (${rejectedBy}): ${reason}`;

    this.emitAgentEvent(taskId, "approval_resolved", {
      status: "rejected",
      rejectedBy,
      reason,
    });

    this.emitAgentEvent(taskId, "task_failed", {
      error: state.errorMessage,
    });

    return state;
  }

  /**
   * Mark task COMPLETED with evidence summary
   */
  private async completeTask(taskId: string, summary: string): Promise<void> {
    const state = this.tasks.get(taskId);
    if (!state) return;

    state.status = "COMPLETED";
    state.completedAt = new Date().toISOString();
    state.updatedAt = new Date().toISOString();

    const extracted = state.memory.extractedInvoice as ExtractedInvoiceData | undefined;
    const recordId = (state.memory.createdFinanceRecordId || (state.memory.existingFinanceRecord as any)?.recordId) as string;

    const formattedSummary = `Completed invoice processing for ${extracted?.vendor || "Vendor"}.

Invoice: ${extracted?.invoice_number || "N/A"}
Amount: ₹${extracted?.amount?.toLocaleString() || "0"} ${extracted?.currency || "INR"}
Due date: ${extracted?.due_date || "N/A"}
Finance record: ${recordId || "N/A"}

Verification:
${state.verification?.checks.map((c) => `✓ ${c.field.replace(/_/g, " ")} matched (${c.actual})`).join("\n") || "✓ All verification checks confirmed"}

The finance record was ${state.memory.isApproved ? "created after verified human approval." : "safely recorded and verified."}`;

    state.finalSummary = formattedSummary;

    // Record in company memory
    companyMemory.recordTaskOutcome({
      taskId,
      goal: state.goal,
      vendor: extracted?.vendor,
      invoiceNumber: extracted?.invoice_number,
      status: "COMPLETED",
      timestamp: state.completedAt,
      summary: formattedSummary,
    });

    this.emitAgentEvent(taskId, "task_completed", {
      summary: formattedSummary,
      evidence: state.evidence,
      verification: state.verification,
    });
  }

  /**
   * Mark task FAILED
   */
  private failTask(taskId: string, error: string): void {
    const state = this.tasks.get(taskId);
    if (!state) return;

    state.status = "FAILED";
    state.errorMessage = error;
    state.completedAt = new Date().toISOString();
    state.updatedAt = new Date().toISOString();

    // Record in company memory
    companyMemory.recordTaskOutcome({
      taskId,
      goal: state.goal,
      status: "FAILED",
      timestamp: state.completedAt,
      summary: `Failed: ${error}`,
    });

    this.emitAgentEvent(taskId, "task_failed", {
      error,
    });
  }
}

export const agentOrchestrator = new AgentOrchestrator();

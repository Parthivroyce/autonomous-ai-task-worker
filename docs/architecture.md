# Autonomous Finance Employee — Architecture & System Design

**Project Name:** Autonomous Finance Employee  
**Tagline:** An agent that turns a natural-language finance task into verified completed work.  
**Author:** CentrAlign AI Engineering Candidate  
**Target Workflow:** Enterprise Invoice Processing & Accounts Payable ERP Synchronization

---

## 1. Problem Interpretation

In enterprise finance operations, accounts payable teams handle hundreds of vendor invoices weekly across disparate formats, document portals, emails, and ERP systems (SAP, NetSuite, Oracle, Workday). Typical RPA (Robotic Process Automation) scripts break when document structures change, whereas unconstrained generative AI chatbots hallucinate data, lack deterministic safety bounds, and claim completion without verifying actual ledger state.

The objective of the **Autonomous Finance Employee** is to bridge this gap:
- Accept natural-language business instructions (e.g., *"Find the latest invoice from Acme Corp, extract the amount and due date, enter it into our finance system, verify that it was recorded correctly, and tell me what you did."*).
- Maintain an explicit state machine that drives execution through distinct phases:
  `GOAL → UNDERSTAND → PLAN → SELECT TOOLS → EXECUTE → OBSERVE → ADAPT → VERIFY → COMPLETE`
- Enforce strict deterministic safety guardrails: read/write/approval tool permission separation, financial approval thresholds, bounded exponential backoff retries, and post-write ledger verification before claiming completion.

---

## 2. High-Level System Architecture

```mermaid
flowchart TD
    User([User / Natural Language Task]) --> TaskInterface[Enterprise Web UI / API Gateway]
    TaskInterface --> Orchestrator[Agent Orchestrator & State Machine]

    subgraph Reasoning Layer
        Orchestrator --> Understanding[Goal Understanding & Intent Parser]
        Understanding --> Planner[Structured Planner - Gemini / Deterministic Fallback]
        Planner --> Plan[Structured Plan JSON]
    end

    subgraph Deterministic Control & Policy Guardrails
        Plan --> ToolSelector[Tool Selector & Validator - Zod]
        ToolSelector --> PolicyEngine{Policy Engine}
        PolicyEngine -- "Amount < ₹100k" --> AutoApproval[Auto-Cleared]
        PolicyEngine -- "₹100k - ₹500k" --> ApprovalRequired[Pause: Medium Risk Approval]
        PolicyEngine -- "> ₹500k" --> HighRiskApproval[Pause: High Risk Executive Approval]
        PolicyEngine -- "Missing Due Date" --> HumanEscalation[Pause: Due Date Required]
        ApprovalRequired --> HumanInTheLoop([Human Supervisor UI])
        HighRiskApproval --> HumanInTheLoop
        HumanInTheLoop -- Approved --> Resumed[Resume State Machine]
    end

    subgraph Tool Execution & Environment Layer
        AutoApproval --> ToolExec[Tool Execution Engine]
        Resumed --> ToolExec
        ToolExec --> DocRepo[(Simulated Document Repository)]
        ToolExec --> FinanceERP[(Simulated Finance ERP Ledger)]
        ToolExec --> AuditLog[(Tamper-Evident Audit Log)]
    end

    subgraph Observation, Recovery & Verification
        ToolExec --> Observation[Structured Observation & State Memory]
        Observation --> RecoveryEngine{Failure Classifier}
        RecoveryEngine -- "Transient DB Error" --> BoundedRetry[Bounded Exponential Backoff Max 3]
        BoundedRetry --> ToolExec
        RecoveryEngine -- "Duplicate Detected" --> AvoidDuplicate[Bypass Write -> Verify Existing]
        Observation --> Verifier[Post-Write Field Verifier]
        Verifier --> Checks{All 5 Fields Match?}
        Checks -- Yes --> EvidenceGen[Evidence Generator & Memory Update]
        Checks -- No --> FlagDiscrepancy[Halt & Flag Ledger Discrepancy]
    end

    EvidenceGen --> Completed([Verified Completed Work with Evidence])
```

---

## 3. The Core Agent Loop

The agent loop executes an iterative control cycle where the LLM assists in reasoning and adaptation, but deterministic TypeScript code governs the state machine:

```ts
while (!completed && steps < MAX_STEPS) {
  // 1. Observe current state & environmental memory
  observeCurrentState();

  // 2. Deterministic policy check
  if (needsApproval()) {
    pauseForApproval(); // State: WAITING_FOR_APPROVAL
    break; // Awaits user resume
  }

  // 3. Plan next action based on latest observations
  const nextAction = selectNextAction(state, memory, observations);

  // 4. Validate arguments strictly using Zod
  validateAction(nextAction);

  // 5. Execute registered tool inside bounded sandbox
  const result = await executeTool(nextAction);

  // 6. Record observation and update state memory
  recordObservation(result);

  // 7. Handle recoverable failures
  if (isRecoverableFailure(result)) {
    await executeRecovery();
    continue;
  }

  // 8. Mandatory post-write verification
  if (shouldVerify(result)) {
    await verifyOutcome();
  }
}
```

---

## 4. Tool Abstraction & Permission Model

Every tool in the system is an instance of `ITool<TInput, TOutput>` with:
1. **Name and Purpose**: Unique semantic identifier.
2. **Permission Level**:
   - `READ`: Safe query tools (`search_invoices`, `get_invoice`, `extract_invoice_data`, `search_finance_records`, `get_finance_record`).
   - `WRITE`: Mutating tools (`create_finance_record`).
   - `APPROVAL`: Human escalation tools (`request_human_approval`).
3. **Zod Input Schema**: Strict runtime validation of arguments. Prohibits arbitrary parameter injections.
4. **Observable Result**: Structured typed payload recorded in state memory and audit log.

### Registered Tools:

| Tool Name | Permission | Input Schema | Side Effects | Description |
|:---|:---:|:---|:---:|:---|
| `search_invoices` | `READ` | `{ vendor?: string, limit?: number }` | None | Searches company document repository for vendor invoice files. |
| `get_invoice` | `READ` | `{ invoice_id: string }` | None | Retrieves raw invoice document text and line-item details. |
| `extract_invoice_data` | `READ` | `{ invoice_id: string }` | None | Extracts structured financial fields: vendor, invoice number, amount, currency, due date. |
| `search_finance_records` | `READ` | `{ invoice_number?: string, vendor?: string }` | None | Queries ERP accounts payable ledger for existing records to prevent duplicates. |
| `create_finance_record` | `WRITE` | `{ invoice_number, vendor, amount, currency, due_date, line_items_count? }` | Inserts record into ERP | Inserts verified invoice into finance database. Enforces policy approval. |
| `get_finance_record` | `READ` | `{ record_id: string }` | None | Queries finance ledger by record ID (`FIN-...`) for independent post-write verification. |
| `request_human_approval` | `APPROVAL` | `{ reason, action, risk: 'low'\|'medium'\|'high', details }` | Pauses agent | Requests human manager authorization; halts state machine until user resolves in UI. |

---

## 5. State Management & State Machine

The agent state machine explicitly models all lifecycle phases. The state is never stored solely in conversational context:

```ts
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
```

### State Transitions:
1. `INITIALIZING → UNDERSTANDING`: Ingestion of user natural language prompt.
2. `UNDERSTANDING → PLANNING`: Decomposition into structured JSON execution steps.
3. `PLANNING → EXECUTING`: Sequential or adaptive tool execution.
4. `EXECUTING → WAITING_FOR_APPROVAL`: Triggered when an invoice reaches financial thresholds or is missing due dates.
5. `WAITING_FOR_APPROVAL → EXECUTING`: Resumed when human manager clicks "Approve" via UI.
6. `EXECUTING → RECOVERING`: Triggered upon detecting retryable transient failures.
7. `EXECUTING → VERIFYING`: Triggered after ERP insertion.
8. `VERIFYING → COMPLETED`: Triggered only after all 5 financial fields match in the ERP record.
9. `ANY → FAILED`: Terminal failure upon unrecoverable errors, human rejection, or tamper detection.

---

## 6. Company Memory

The `CompanyMemory` module represents CentrAlign's vision of persistent institutional knowledge:
- **Financial Policies**:
  - `invoice_auto_approval_limit`: ₹100,000.
  - `high_risk_threshold`: ₹500,000.
  - `requires_due_date`: true (strict prevention of hallucinated dates).
  - `duplicate_check_required`: true.
- **Vendor Directory**: Profiles of known suppliers (e.g., Acme Corp, Globex, Wayne Enterprises, Stark Industries, Umbrella Labs) with payment terms and risk ratings.
- **Operational Task History**: Persistent record of completed and failed workflows with evidence hashes.

---

## 7. Human-in-the-Loop Architecture

The system avoids the trap of either full automation or manual exhaustion:
- **Low Risk (< ₹100,000)**: Auto-cleared for ledger entry.
- **Medium Risk (₹100,000 – ₹500,000)**: Requires human manager sign-off.
- **High Risk (> ₹500,000)**: Requires executive approval.
- **Missing Information**: If a vendor invoice omits a due date, the agent **never hallucinates** a date. It pauses and prompts accounts payable for input.

When paused:
1. Agent transitions to `WAITING_FOR_APPROVAL`.
2. Emits an SSE event `approval_required`.
3. The UI presents an interactive approval card with full financial context.
4. Clicking "Approve" or "Reject" invokes the backend API (`/api/tasks/:id/approve` or `/api/tasks/:id/reject`), resuming the state machine in place.

---

## 8. Failure Recovery & Bounded Retries

The `RecoveryEngine` categorizes errors deterministically:
1. **Retryable Errors** (`TEMPORARY_DATABASE_ERROR`, connection pool timeouts, socket resets):
   - Maximum 3 bounded attempts.
   - Exponential backoff: Attempt 1: 500ms; Attempt 2: 1000ms; Attempt 3: 2000ms.
   - Logged in the audit trail.
2. **Non-Retryable Errors**:
   - `DUPLICATE_RECORD_ERROR`: Triggers proactive duplicate avoidance.
   - `VALIDATION_ERROR` / `MISSING_DUE_DATE`: Triggers human escalation.
   - `APPROVAL_REQUIRED`: Triggers pause for sign-off.

---

## 9. Independent Post-Write Verification

A successful HTTP 200 or database insert response is **not** evidence of correctness.
After invoking `create_finance_record`:
1. The agent queries `get_finance_record` to retrieve the persisted record from the database.
2. The `Verifier` evaluates 6 independent checks:
   - Record existence in ERP.
   - `invoice_number` exact match.
   - `vendor` exact match.
   - `amount` float equality within 0.01 tolerance.
   - `currency` ISO code match.
   - `due_date` exact match.
3. If all checks pass, the task transitions to `COMPLETED` and attaches structured verification evidence.
4. If any check fails, the task halts in `RECOVERING` or `FAILED` to prevent data corruption.

---

## 10. Auditability & Observability

- **Tamper-Evident Audit Log**: Every tool call, sanitized input, execution duration, retry count, and outcome is logged in `AuditLogger`.
- **Live Event Streaming (SSE)**: The frontend listens to `/api/tasks/:id/events` for real-time state machine transitions, tool invocations, and approval alerts.

---

## 11. Extensibility & Generalization

Although demonstrated on invoice processing, this architecture generalizes to:
- **Customer Support Claim Adjudication**: Read ticket → search warranty DB → evaluate refund policy → request supervisor approval → issue refund → verify credit balance.
- **HR Employee Onboarding**: Ingest offer letter → verify I-9 / tax documents → provision IT accounts → verify SSO sync.
- **Supply Chain PO Reconciliation**: Match delivery receipt against purchase orders, identify quantity discrepancies, and flag for review.

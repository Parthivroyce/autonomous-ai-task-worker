# Autonomous Finance Employee — Technical Interview & Architecture Walkthrough

This document prepares the engineering team for a deep technical walkthrough of the **Autonomous Finance Employee**, explaining design choices, trade-offs, and scaling paths.

---

## Technical Q&A Walkthrough

### 1. Why did you use an explicit state machine instead of letting the LLM loop autonomously in a prompt?
**Answer:**  
In enterprise financial systems, stochastic agents running in open-ended prompt loops present severe compliance, consistency, and safety risks. An unconstrained LLM can skip validation steps, enter infinite recursive loops, or hallucinate task completion.  
By encapsulating execution inside an explicit state machine (`UNDERSTANDING → PLANNING → EXECUTING → WAITING_FOR_APPROVAL → VERIFYING → COMPLETED`), we achieve:
1. **Deterministic Guarantees**: State transitions are controlled by typed application code. The agent cannot enter `COMPLETED` without traversing `VERIFYING`.
2. **Interruptibility & Pauseability**: When high-value invoices (e.g., > ₹100,000) or missing due dates require human sign-off, the state machine transitions to `WAITING_FOR_APPROVAL` and suspends execution cleanly.
3. **Auditable Observability**: Each transition emits typed events (`agent_state_changed`, `tool_call_started`, `verification_completed`) streamed live via SSE to the user interface.

---

### 2. Why shouldn't the LLM directly execute database operations or SQL queries?
**Answer:**  
Direct SQL or arbitrary database execution by an LLM introduces catastrophic failure modes:
1. **Prompt Injection & Data Tampering**: Malicious text within an invoice document could inject SQL commands (`DROP TABLE`, `UPDATE amounts`).
2. **Lack of Invariant Enforcement**: An LLM cannot be trusted to uphold complex enterprise policies (e.g., dual-approval thresholds, currency validation, duplicate constraints).
3. **Separation of Concerns**: In our architecture, the LLM functions purely as a **reasoning and orchestration engine** (intent decomposition, observation synthesis). Deterministic tools (`create_finance_record`, `get_invoice`) backed by Zod schemas and policy validators retain exclusive write authority.

---

### 3. How do you prevent duplicate actions and double entries?
**Answer:**  
We employ a multi-layered defense:
1. **Pre-Execution Check**: Before issuing a ledger write, the agent executes `search_finance_records` with the vendor and invoice number.
2. **Observation-Driven Adaptation**: If an existing record is detected, the agent adapts its plan to verify the existing record rather than attempting to create a new one.
3. **Ledger-Level Uniqueness Constraint**: The `financeRepository` enforces an atomic uniqueness check on `invoiceNumber`. Any attempt to write a duplicate throws a non-retryable `DUPLICATE_RECORD_ERROR`, which the agent recognizes and gracefully resolves.

---

### 4. What happens when a tool fails? How does failure recovery work?
**Answer:**  
The `RecoveryEngine` inspects tool execution errors and classifies them into:
- **Retryable Errors** (`TEMPORARY_DATABASE_ERROR`, network timeouts): The system initiates bounded exponential backoff (Attempt 1: 500ms; Attempt 2: 1000ms; Attempt 3: 2000ms, capped at 3 attempts). Every retry is recorded in the audit trail.
- **Non-Retryable Errors** (`VALIDATION_ERROR`, `POLICY_VIOLATION`, `MISSING_DUE_DATE`): The agent halts immediately or requests human intervention rather than burning retries or corrupting state.
- **Circuit Breaker / Step Caps**: The orchestrator enforces a hard limit of `MAX_STEPS = 25` to prevent runaway execution.

---

### 5. How does the agent know it actually completed the task? Why isn't a successful API response enough?
**Answer:**  
In distributed enterprise architectures, an API response acknowledging receipt (HTTP 200/201) often represents an asynchronous enqueue or partial write that could later fail during reconciliation or commit.  
Therefore, **verification is mandatory**:
1. After writing, the agent executes `get_finance_record` to query the record directly from the ERP database.
2. The `Verifier` executes 6 deterministic checks:
   - Record existence confirmed.
   - `invoice_number` exact match.
   - `vendor` exact match.
   - `amount` float equality within 0.01 tolerance.
   - `currency` ISO code match.
   - `due_date` exact match.
3. Only when all checks pass does the agent produce verified evidence and transition to `COMPLETED`.

---

### 6. How would this prototype generalize to work with a real browser or desktop application?
**Answer:**  
The architecture isolates environment interactions behind clean repository interfaces (`IInvoiceRepository`, `IFinanceRepository`).  
To integrate with real web or desktop interfaces (e.g., SAP GUI, NetSuite Web Portal, Coupa):
1. **Connector Pattern**: Replace `DemoFinanceRepository` with a `PlaywrightFinanceConnector` or `ComputerUseConnector`.
2. **Deterministic Selectors & Vision Hybrid**: Use semantic DOM locators (role, test-id) with fallback to visual grounding (Playwright + vision model) for legacy desktop apps.
3. **Idempotency Tokens**: Supply client request IDs in form submissions so browser retries do not generate duplicates.
4. **Sandboxed Sessions**: Execute browser automation inside isolated headless container pods with full session replay recordings for auditability.

---

### 7. How would you make execution durable across server crashes or reboots?
**Answer:**  
To move from in-memory state to production-grade durable execution:
1. **Temporal or Inngest Orchestration**: Model the agent loop as a durable workflow. Each tool execution and LLM call becomes a durable activity with deterministic replay.
2. **Persistent Event Sourcing**: Store agent state transitions and event streams in PostgreSQL / Cloud SQL. If the orchestrator pod crashes mid-execution, a new instance hydrates state from the event log and resumes at the exact step.
3. **Webhook Callback Suspension**: When paused for human approval, the task persists in database status `WAITING_FOR_APPROVAL` without holding active server threads. Approval triggers an HTTP webhook that rehydrates the workflow.

---

### 8. How would you scale this system to process thousands of tasks concurrently?
**Answer:**  
1. **Task Queue Architecture**: Ingest tasks into Redis / BullMQ / Google Cloud PubSub with rate limiting and priority queues.
2. **Worker Pool Isolation**: Stateless worker pods consume tasks from the queue. Financial write tools are throttled per ERP endpoint to prevent overwhelming downstream accounting systems.
3. **Partitioned Concurrency**: Enforce per-vendor locking (e.g., distributed locks in Redis on `vendor:invoiceNumber`) to guarantee that concurrent workers processing the same vendor do not race.

---

### 9. How would Company Memory work across multiple enterprise tenants?
**Answer:**  
1. **Tenant-Isolated Vector & Relational Storage**: Company memory (approval policies, vendor payment terms, custom line-item categorization rules) is partitioned by `tenant_id` in a multi-tenant PostgreSQL schema.
2. **Hierarchical Policy Inheritance**: Support Global Policies (e.g., SOX compliance, mandatory dual-sign-off above $10,000) that cannot be overridden, alongside Subsidiary/Department Policies (e.g., IT department specific auto-approval limits).
3. **Zero Data Leakage**: Tenant IDs are enforced at the repository query level, ensuring an agent operating for Tenant A cannot access vendor terms from Tenant B.

---

### 10. Where would you add human approval in production?
**Answer:**  
Human-in-the-loop should be placed at all irreversible boundary transitions:
1. **Financial Threshold Exceedance**: Invoices above specified risk tiers (e.g., ₹100,000+ for managers, ₹500,000+ for CFO).
2. **Anomaly & Outlier Detection**: Invoices exceeding 150% of the vendor's 90-day moving average.
3. **New / Unverified Vendors**: First invoice from a previously unseen supplier.
4. **Bank Details Discrepancy**: When invoice remittance bank account numbers differ from the verified master vendor file (critical BEC / fraud prevention).
5. **Incomplete / Ambiguous Data**: Missing due dates or tax IDs where human clarification is mandatory.

---

### 11. How do you systematically evaluate agent reliability without fabricated results?
**Answer:**  
We established a 10-scenario automated evaluation suite (`npm run evaluate`) executing against actual simulated repositories:
- Measures:
  1. Task completion accuracy.
  2. Correct tool selection sequences.
  3. Verification check success rate.
  4. Duplicate creation prevention.
  5. Appropriate human escalation trigger rate.
  6. Failure recovery with backoff.
  7. Strict hallucination resistance (refusal to invent missing dates).
- Output: Exact metrics reporting passed/failed assertions directly from state inspection.

---

### 12. What happens if a third-party website or ERP UI changes?
**Answer:**  
1. **API First**: Always prefer authenticated enterprise APIs (SAP OData, NetSuite RESTlet) over UI scraping whenever available.
2. **Semantic DOM Fallbacks**: If UI automation is required, use semantic accessibility trees (`aria-label`, `role="button"`) rather than fragile CSS or XPath selectors.
3. **Self-Healing Selectors**: When an element lookup fails, the agent captures a screenshot and DOM snippet, queries a multimodal model for the relocated element, tests the candidate action in a staging session, and notifies engineering to update the locator definition.

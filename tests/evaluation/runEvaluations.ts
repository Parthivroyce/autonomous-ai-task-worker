/**
 * CentrAlign AI Engineering Evaluation Suite
 * Evaluates the autonomous agent across 10 deterministic enterprise scenarios.
 *
 * Runs against the actual simulated environment and state machine.
 */

import { agentOrchestrator } from "../../server/agent/orchestrator.js";
import { invoiceRepository } from "../../server/environment/invoiceRepository.js";
import { financeRepository } from "../../server/environment/financeRepository.js";
import { companyMemory } from "../../server/environment/companyMemory.js";

process.env.DEMO_MODE = "true";
process.env.NODE_ENV = "test";

interface EvalResult {
  scenarioNumber: number;
  name: string;
  passed: boolean;
  notes: string;
  approvalRequiredCorrectly?: boolean;
  recoveredFromFailure?: boolean;
}

async function waitForCondition(
  predicate: () => boolean,
  timeoutMs = 6000,
  intervalMs = 50
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function runAllEvaluations() {
  console.log("==================================================");
  console.log("Starting CentrAlign AI Engineering Evaluation Suite");
  console.log("==================================================\n");

  const results: EvalResult[] = [];
  let requiredApprovalCount = 0;
  let failuresRecoveredCount = 0;
  let completedCorrectlyCount = 0;
  let incorrectCompletionsCount = 0;

  // TEST 1: Process latest Acme invoice (AC-2026-092, ₹140,000, requires approval)
  {
    invoiceRepository.reset();
    financeRepository.reset();
    companyMemory.reset();

    const task = await agentOrchestrator.startTask("Process the latest invoice from Acme Corp");
    await waitForCondition(() => {
      const t = agentOrchestrator.getTask(task.taskId);
      return t?.status === "WAITING_FOR_APPROVAL";
    });

    const isWaiting = agentOrchestrator.getTask(task.taskId)?.status === "WAITING_FOR_APPROVAL";
    if (isWaiting) {
      requiredApprovalCount++;
      await agentOrchestrator.approveTask(task.taskId, "eval_runner@company.com");
      await waitForCondition(() => {
        const t = agentOrchestrator.getTask(task.taskId);
        return t?.status === "COMPLETED";
      });
    }

    const finalTask = agentOrchestrator.getTask(task.taskId);
    const passed =
      finalTask?.status === "COMPLETED" &&
      Boolean(finalTask?.verification?.verified) &&
      finalTask.memory.extractedInvoice !== undefined;

    if (passed) completedCorrectlyCount++;
    else incorrectCompletionsCount++;

    results.push({
      scenarioNumber: 1,
      name: "Process latest Acme invoice",
      passed,
      notes: `Status: ${finalTask?.status}, Verified: ${finalTask?.verification?.verified}`,
      approvalRequiredCorrectly: isWaiting,
    });
    console.log(`[TEST 1] Process latest Acme invoice: ${passed ? "PASS" : "FAIL"}`);
  }

  // TEST 2: Process invoice below auto-approval threshold (Stark Industries ST-2026-101, ₹85,000)
  {
    invoiceRepository.reset();
    financeRepository.reset();
    companyMemory.reset();

    const task = await agentOrchestrator.startTask("Find invoice ST-2026-101 from Stark Industries and enter it");
    await waitForCondition(() => {
      const t = agentOrchestrator.getTask(task.taskId);
      return t?.status === "COMPLETED";
    });

    const finalTask = agentOrchestrator.getTask(task.taskId);
    const passed =
      finalTask?.status === "COMPLETED" &&
      finalTask.approvals.length === 0 && // No approval requested
      Boolean(finalTask?.verification?.verified);

    if (passed) completedCorrectlyCount++;
    else incorrectCompletionsCount++;

    results.push({
      scenarioNumber: 2,
      name: "Process invoice below approval threshold",
      passed,
      notes: `Status: ${finalTask?.status}, Auto-approved under ₹100,000 limit`,
    });
    console.log(`[TEST 2] Process invoice below approval threshold: ${passed ? "PASS" : "FAIL"}`);
  }

  // TEST 3: Process high-value invoice requiring approval (Globex GL-2026-550, ₹650,000)
  {
    invoiceRepository.reset();
    financeRepository.reset();
    companyMemory.reset();

    const task = await agentOrchestrator.startTask("Record invoice GL-2026-550 from Globex in the finance system");
    await waitForCondition(() => {
      const t = agentOrchestrator.getTask(task.taskId);
      return t?.status === "WAITING_FOR_APPROVAL";
    });

    const waiting = agentOrchestrator.getTask(task.taskId);
    const riskTier = waiting?.approvals[0]?.risk;
    const isHighRiskWaiting = waiting?.status === "WAITING_FOR_APPROVAL" && riskTier === "high";

    if (isHighRiskWaiting) {
      requiredApprovalCount++;
      await agentOrchestrator.approveTask(task.taskId, "cfo_executive@company.com");
      await waitForCondition(() => {
        const t = agentOrchestrator.getTask(task.taskId);
        return t?.status === "COMPLETED";
      });
    }

    const finalTask = agentOrchestrator.getTask(task.taskId);
    const passed = isHighRiskWaiting && finalTask?.status === "COMPLETED" && Boolean(finalTask?.verification?.verified);

    if (passed) completedCorrectlyCount++;
    else incorrectCompletionsCount++;

    results.push({
      scenarioNumber: 3,
      name: "Process invoice requiring approval (High Risk)",
      passed,
      notes: `Risk tier correctly assigned: ${riskTier}`,
      approvalRequiredCorrectly: isHighRiskWaiting,
    });
    console.log(`[TEST 3] Process invoice requiring approval: ${passed ? "PASS" : "FAIL"}`);
  }

  // TEST 4: Detect duplicate invoice (Wayne Enterprises WE-2026-888)
  {
    invoiceRepository.reset();
    financeRepository.reset();
    companyMemory.reset();

    const initialFinanceCount = financeRepository.getAll().length;
    const task = await agentOrchestrator.startTask("Process invoice WE-2026-888 from Wayne Enterprises");
    await waitForCondition(() => {
      const t = agentOrchestrator.getTask(task.taskId);
      return t?.status === "COMPLETED" || t?.status === "FAILED";
    });

    const finalTask = agentOrchestrator.getTask(task.taskId);
    const finalFinanceCount = financeRepository.getAll().length;
    // Must avoid inserting duplicate
    const noDuplicateInserted = finalFinanceCount === initialFinanceCount;
    const duplicateDetected = Boolean(finalTask?.memory.existingFinanceRecord);
    const passed = finalTask?.status === "COMPLETED" && noDuplicateInserted && duplicateDetected;

    if (passed) completedCorrectlyCount++;
    else incorrectCompletionsCount++;

    results.push({
      scenarioNumber: 4,
      name: "Detect duplicate invoice",
      passed,
      notes: `Duplicate detected, avoided double insert (Records: ${initialFinanceCount} -> ${finalFinanceCount})`,
    });
    console.log(`[TEST 4] Detect duplicate invoice: ${passed ? "PASS" : "FAIL"}`);
  }

  // TEST 5: Handle temporary database failure with retry (GL-2026-402)
  {
    invoiceRepository.reset();
    financeRepository.reset();
    companyMemory.reset();

    const task = await agentOrchestrator.startTask("Enter invoice GL-2026-402 into finance system");
    await waitForCondition(() => {
      const t = agentOrchestrator.getTask(task.taskId);
      return t?.status === "COMPLETED";
    });

    const finalTask = agentOrchestrator.getTask(task.taskId);
    const createCall = finalTask?.toolCalls.find((c) => c.toolName === "create_finance_record");
    const hadRetries = (createCall?.retryCount || 0) >= 1;
    const passed = finalTask?.status === "COMPLETED" && hadRetries && Boolean(finalTask?.verification?.verified);

    if (hadRetries) failuresRecoveredCount++;
    if (passed) completedCorrectlyCount++;
    else incorrectCompletionsCount++;

    results.push({
      scenarioNumber: 5,
      name: "Handle temporary database failure",
      passed,
      notes: `Recovered via retry (Retry count: ${createCall?.retryCount})`,
      recoveredFromFailure: hadRetries,
    });
    console.log(`[TEST 5] Handle temporary database failure: ${passed ? "PASS" : "FAIL"}`);
  }

  // TEST 6: Detect missing due date without inventing one (GL-2026-301)
  {
    invoiceRepository.reset();
    financeRepository.reset();
    companyMemory.reset();

    const task = await agentOrchestrator.startTask("Process invoice GL-2026-301 from Globex");
    await waitForCondition(() => {
      const t = agentOrchestrator.getTask(task.taskId);
      return t?.status === "WAITING_FOR_APPROVAL";
    });

    const waitingTask = agentOrchestrator.getTask(task.taskId);
    const isPausedForMissingDate =
      waitingTask?.status === "WAITING_FOR_APPROVAL" &&
      waitingTask.approvals[0]?.details?.missingField === "due_date";

    if (isPausedForMissingDate) {
      requiredApprovalCount++;
      // Human provides missing date
      await agentOrchestrator.approveTask(task.taskId, "accounts_payable_lead", "2026-10-31");
      await waitForCondition(() => {
        const t = agentOrchestrator.getTask(task.taskId);
        return t?.status === "COMPLETED";
      });
    }

    const finalTask = agentOrchestrator.getTask(task.taskId);
    const passed = isPausedForMissingDate && finalTask?.status === "COMPLETED";

    if (passed) completedCorrectlyCount++;
    else incorrectCompletionsCount++;

    results.push({
      scenarioNumber: 6,
      name: "Detect missing due date",
      passed,
      notes: "Proactively flagged missing due date instead of inventing one.",
      approvalRequiredCorrectly: isPausedForMissingDate,
    });
    console.log(`[TEST 6] Detect missing due date: ${passed ? "PASS" : "FAIL"}`);
  }

  // TEST 7: Detect mismatched amount between invoice and finance record (WE-2026-889)
  {
    invoiceRepository.reset();
    financeRepository.reset();
    companyMemory.reset();

    const task = await agentOrchestrator.startTask("Process invoice WE-2026-889 from Wayne Enterprises");
    await waitForCondition(() => {
      const t = agentOrchestrator.getTask(task.taskId);
      return t?.status === "FAILED";
    });

    const finalTask = agentOrchestrator.getTask(task.taskId);
    const passed = Boolean(
      finalTask?.status === "FAILED" &&
      (finalTask?.errorMessage?.includes("amount") || finalTask?.errorMessage?.includes("AUDIT_ALERT"))
    );

    if (passed) completedCorrectlyCount++;
    else incorrectCompletionsCount++;

    results.push({
      scenarioNumber: 7,
      name: "Detect mismatched amount",
      passed,
      notes: "Safely halted on detected ledger mismatch without overwriting.",
    });
    console.log(`[TEST 7] Detect mismatched amount: ${passed ? "PASS" : "FAIL"}`);
  }

  // TEST 8: Vendor does not exist (Initech Corp)
  {
    invoiceRepository.reset();
    financeRepository.reset();
    companyMemory.reset();

    const task = await agentOrchestrator.startTask("Process latest invoice from Initech Corp");
    await waitForCondition(() => {
      const t = agentOrchestrator.getTask(task.taskId);
      return t?.status === "FAILED";
    });

    const finalTask = agentOrchestrator.getTask(task.taskId);
    const passed = Boolean(
      finalTask?.status === "FAILED" &&
      finalTask?.errorMessage?.includes("No matching invoices found")
    );

    if (passed) completedCorrectlyCount++;
    else incorrectCompletionsCount++;

    results.push({
      scenarioNumber: 8,
      name: "Vendor does not exist",
      passed,
      notes: "Gracefully halted when search returned no results.",
    });
    console.log(`[TEST 8] Vendor does not exist: ${passed ? "PASS" : "FAIL"}`);
  }

  // TEST 9: Verify successfully created invoice checks
  {
    invoiceRepository.reset();
    financeRepository.reset();
    companyMemory.reset();

    const task = await agentOrchestrator.startTask("Enter invoice UM-2026-012 from Umbrella Labs");
    await waitForCondition(() => {
      const t = agentOrchestrator.getTask(task.taskId);
      return t?.status === "COMPLETED";
    });

    const finalTask = agentOrchestrator.getTask(task.taskId);
    const verification = finalTask?.verification;
    const checks = verification?.checks || [];
    const allChecksPassed = verification?.verified && checks.length >= 5 && checks.every((c) => c.passed);

    if (allChecksPassed) completedCorrectlyCount++;
    else incorrectCompletionsCount++;

    results.push({
      scenarioNumber: 9,
      name: "Verify successfully created invoice",
      passed: Boolean(allChecksPassed),
      notes: `All ${checks.length} field verification checks passed against ERP record`,
    });
    console.log(`[TEST 9] Verify successfully created invoice: ${allChecksPassed ? "PASS" : "FAIL"}`);
  }

  // TEST 10: Strict duplicate prevention guardrail
  {
    invoiceRepository.reset();
    financeRepository.reset();
    companyMemory.reset();

    // First process UM-2026-012 once
    const task1 = await agentOrchestrator.startTask("Enter invoice UM-2026-012 into finance system");
    await waitForCondition(() => agentOrchestrator.getTask(task1.taskId)?.status === "COMPLETED");

    const recordCountAfterFirst = financeRepository.getAll().length;

    // Immediately request processing the exact same invoice again
    const task2 = await agentOrchestrator.startTask("Process invoice UM-2026-012 from Umbrella Labs");
    await waitForCondition(() => agentOrchestrator.getTask(task2.taskId)?.status === "COMPLETED");

    const recordCountAfterSecond = financeRepository.getAll().length;
    const preventedDuplicate = recordCountAfterSecond === recordCountAfterFirst;

    if (preventedDuplicate) completedCorrectlyCount++;
    else incorrectCompletionsCount++;

    results.push({
      scenarioNumber: 10,
      name: "Prevent duplicate creation",
      passed: preventedDuplicate,
      notes: `Ledger record count remained constant (${recordCountAfterFirst} == ${recordCountAfterSecond})`,
    });
    console.log(`[TEST 10] Prevent duplicate creation: ${preventedDuplicate ? "PASS" : "FAIL"}`);
  }

  console.log("\n==================================================");
  console.log("Evaluation Results Summary");
  console.log("==================================================");
  console.log(`Tasks: 10`);
  console.log(`Completed correctly: ${completedCorrectlyCount}`);
  console.log(`Required approval correctly: ${requiredApprovalCount}`);
  console.log(`Failures recovered: ${failuresRecoveredCount}`);
  console.log(`Incorrect completions: ${incorrectCompletionsCount}`);
  console.log("==================================================\n");

  if (incorrectCompletionsCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllEvaluations().catch((err) => {
  console.error("Evaluation run error:", err);
  process.exit(1);
});

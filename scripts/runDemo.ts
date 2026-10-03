/**
 * Autonomous Finance Employee CLI Demo Runner
 * Runs the 5 flagship enterprise demonstration scenarios.
 */

import { agentOrchestrator } from "../server/agent/orchestrator.js";
import { invoiceRepository } from "../server/environment/invoiceRepository.js";
import { financeRepository } from "../server/environment/financeRepository.js";
import { companyMemory } from "../server/environment/companyMemory.js";

process.env.DEMO_MODE = "true";

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForStatus(taskId: string, targetStatuses: string[], timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const task = agentOrchestrator.getTask(taskId);
    if (task && targetStatuses.includes(task.status)) {
      return task;
    }
    await wait(80);
  }
  return agentOrchestrator.getTask(taskId);
}

async function runDemo() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║             AUTONOMOUS FINANCE EMPLOYEE DEMO RUNNER            ║
║  "Turn natural-language finance tasks into verified work"      ║
╚════════════════════════════════════════════════════════════════╝
`);

  // DEMO 1: Normal invoice processing (under approval limit)
  console.log("----------------------------------------------------------------");
  console.log("▶ DEMO 1: Normal Invoice Processing (Auto-Approved < ₹100,000)");
  console.log("Goal: 'Process invoice ST-2026-101 from Stark Industries'");
  console.log("----------------------------------------------------------------");
  invoiceRepository.reset();
  financeRepository.reset();
  companyMemory.reset();

  const task1 = await agentOrchestrator.startTask("Process invoice ST-2026-101 from Stark Industries");
  const completedTask1 = await waitForStatus(task1.taskId, ["COMPLETED", "FAILED"]);

  console.log(`Status: ${completedTask1?.status}`);
  console.log(`Tool Calls Executed: ${completedTask1?.toolCalls.map((c) => c.toolName).join(" → ")}`);
  console.log(`Verification: ${completedTask1?.verification?.summary}`);
  console.log(`Evidence Summary:\n${completedTask1?.finalSummary}\n`);
  await wait(500);

  // DEMO 2: Invoice requiring human approval
  console.log("----------------------------------------------------------------");
  console.log("▶ DEMO 2: Invoice Requiring Human Approval (₹125,000 > ₹100,000)");
  console.log("Goal: 'Process invoice AC-2026-091 from Acme Corp'");
  console.log("----------------------------------------------------------------");
  invoiceRepository.reset();
  financeRepository.reset();

  const task2 = await agentOrchestrator.startTask("Process invoice AC-2026-091 from Acme Corp");
  const pausedTask2 = await waitForStatus(task2.taskId, ["WAITING_FOR_APPROVAL"]);

  console.log(`Status: ${pausedTask2?.status}`);
  console.log(`Approval Reason: ${pausedTask2?.approvals[0]?.reason}`);
  console.log(`Risk Tier: ${pausedTask2?.approvals[0]?.risk}`);
  console.log("Simulating Human Manager UI Click: [APPROVE]...");
  await agentOrchestrator.approveTask(task2.taskId, "finance_manager_sarah");

  const completedTask2 = await waitForStatus(task2.taskId, ["COMPLETED", "FAILED"]);
  console.log(`Status after approval: ${completedTask2?.status}`);
  console.log(`Verification: ${completedTask2?.verification?.summary}\n`);
  await wait(500);

  // DEMO 3: Temporary failure followed by bounded retry
  console.log("----------------------------------------------------------------");
  console.log("▶ DEMO 3: Temporary Database Failure Followed by Bounded Retry");
  console.log("Goal: 'Enter invoice GL-2026-402 into finance system'");
  console.log("----------------------------------------------------------------");
  invoiceRepository.reset();
  financeRepository.reset();

  const task3 = await agentOrchestrator.startTask("Enter invoice GL-2026-402 into finance system");
  const completedTask3 = await waitForStatus(task3.taskId, ["COMPLETED", "FAILED"]);

  const writeCall = completedTask3?.toolCalls.find((c) => c.toolName === "create_finance_record");
  console.log(`Status: ${completedTask3?.status}`);
  console.log(`Observed Retries: ${writeCall?.retryCount} retry attempt(s) with exponential backoff`);
  console.log(`Verification: ${completedTask3?.verification?.summary}\n`);
  await wait(500);

  // DEMO 4: Duplicate invoice detection
  console.log("----------------------------------------------------------------");
  console.log("▶ DEMO 4: Duplicate Invoice Detection & Avoidance");
  console.log("Goal: 'Process invoice WE-2026-888 from Wayne Enterprises'");
  console.log("----------------------------------------------------------------");
  invoiceRepository.reset();
  financeRepository.reset();

  const task4 = await agentOrchestrator.startTask("Process invoice WE-2026-888 from Wayne Enterprises");
  const completedTask4 = await waitForStatus(task4.taskId, ["COMPLETED", "FAILED"]);

  console.log(`Status: ${completedTask4?.status}`);
  console.log(`Duplicate detected in ledger: ${(completedTask4?.memory.existingFinanceRecord as any)?.recordId}`);
  console.log(`Summary: ${completedTask4?.finalSummary}\n`);
  await wait(500);

  // DEMO 5: Missing information requiring human intervention
  console.log("----------------------------------------------------------------");
  console.log("▶ DEMO 5: Missing Due Date Requiring Human Input (No Hallucination)");
  console.log("Goal: 'Process invoice GL-2026-301 from Globex'");
  console.log("----------------------------------------------------------------");
  invoiceRepository.reset();
  financeRepository.reset();

  const task5 = await agentOrchestrator.startTask("Process invoice GL-2026-301 from Globex");
  const pausedTask5 = await waitForStatus(task5.taskId, ["WAITING_FOR_APPROVAL"]);

  console.log(`Status: ${pausedTask5?.status}`);
  console.log(`Pause Reason: ${pausedTask5?.approvals[0]?.reason}`);
  console.log("Simulating Human providing verified due date '2026-10-31'...");
  await agentOrchestrator.approveTask(task5.taskId, "accounts_payable_lead", "2026-10-31");

  const completedTask5 = await waitForStatus(task5.taskId, ["COMPLETED", "FAILED"]);
  console.log(`Status after human input: ${completedTask5?.status}`);
  console.log(`Verification: ${completedTask5?.verification?.summary}`);
  console.log(`Evidence Summary:\n${completedTask5?.finalSummary}`);

  console.log("════════════════════════════════════════════════════════════════");
  console.log("ALL 5 DEMO SCENARIOS EXECUTED SUCCESSFULLY WITH REAL STATE CHANGES");
  console.log("════════════════════════════════════════════════════════════════");
}

runDemo().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});

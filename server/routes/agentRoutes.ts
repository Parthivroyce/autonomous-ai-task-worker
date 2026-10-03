import { Router, Request, Response } from "express";
import { agentOrchestrator } from "../agent/orchestrator.js";
import { invoiceRepository } from "../environment/invoiceRepository.js";
import { financeRepository } from "../environment/financeRepository.js";
import { companyMemory } from "../environment/companyMemory.js";
import { toolRegistry } from "../tools/registry.js";
import { auditLogger } from "../audit/auditLogger.js";

const router = Router();

// Start a new task
router.post("/tasks", async (req: Request, res: Response) => {
  try {
    const { goal } = req.body;
    if (!goal || typeof goal !== "string") {
      return res.status(400).json({ error: "Goal string is required" });
    }

    const task = await agentOrchestrator.startTask(goal.trim());
    return res.status(201).json(task);
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// List all tasks
router.get("/tasks", (_req: Request, res: Response) => {
  const tasks = agentOrchestrator.getAllTasks();
  return res.json(tasks);
});

// Get task by ID
router.get("/tasks/:id", (req: Request, res: Response) => {
  const task = agentOrchestrator.getTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }
  return res.json(task);
});

// SSE Live Event Stream for a task
router.get("/tasks/:id/events", (req: Request, res: Response) => {
  const taskId = req.params.id;
  const task = agentOrchestrator.getTask(taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // Send historical events first
  const existingEvents = agentOrchestrator.getTaskEvents(taskId);
  for (const evt of existingEvents) {
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  }

  // Subscribe to live events
  const onEvent = (event: any) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (event.type === "task_completed" || event.type === "task_failed") {
      // Keep connection open or let client close
    }
  };

  agentOrchestrator.on(`task:${taskId}`, onEvent);

  req.on("close", () => {
    agentOrchestrator.off(`task:${taskId}`, onEvent);
    res.end();
  });
});

// Approve task
router.post("/tasks/:id/approve", async (req: Request, res: Response) => {
  try {
    const { approvedBy = "Finance Supervisor", customDueDate } = req.body;
    const updated = await agentOrchestrator.approveTask(req.params.id, approvedBy, customDueDate);
    return res.json(updated);
  } catch (err: unknown) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

// Reject task
router.post("/tasks/:id/reject", async (req: Request, res: Response) => {
  try {
    const { reason = "Operation rejected by user", rejectedBy = "Finance Supervisor" } = req.body;
    const updated = await agentOrchestrator.rejectTask(req.params.id, reason, rejectedBy);
    return res.json(updated);
  } catch (err: unknown) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

// Get simulated company environment data (Invoices + Finance Records)
router.get("/environment/data", (_req: Request, res: Response) => {
  return res.json({
    invoices: invoiceRepository.getAll(),
    financeRecords: financeRepository.getAll(),
  });
});

// Reset simulated environment
router.post("/environment/reset", (_req: Request, res: Response) => {
  invoiceRepository.reset();
  financeRepository.reset();
  companyMemory.reset();
  return res.json({ success: true, message: "Simulated company environment reset to initial state." });
});

// Get registered tools
router.get("/tools", (_req: Request, res: Response) => {
  return res.json(toolRegistry.getToolMetadataList());
});

// Get audit logs
router.get("/audit", (req: Request, res: Response) => {
  const taskId = req.query.taskId as string | undefined;
  if (taskId) {
    return res.json(auditLogger.getByTaskId(taskId));
  }
  return res.json(auditLogger.getAll());
});

// Get company memory & policy
router.get("/memory", (_req: Request, res: Response) => {
  return res.json({
    policy: companyMemory.getPolicy(),
    vendors: companyMemory.getAllVendors(),
    history: companyMemory.getTaskHistory(),
  });
});

// Update company policy
router.put("/memory/policy", (req: Request, res: Response) => {
  try {
    const updated = companyMemory.updatePolicy(req.body);
    return res.json(updated);
  } catch (err: unknown) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

export default router;

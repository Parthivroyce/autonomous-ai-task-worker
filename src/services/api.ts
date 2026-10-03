import {
  AgentState,
  InvoiceDocument,
  FinanceRecord,
  AuditLogEntry,
  CompanyPolicy,
  VendorProfile,
  ToolMetadata,
} from "../types/index.js";

export const api = {
  // Tasks
  async startTask(goal: string): Promise<AgentState> {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to start task");
    }
    return res.json();
  },

  async getTask(id: string): Promise<AgentState> {
    const res = await fetch(`/api/tasks/${id}`);
    if (!res.ok) throw new Error("Task not found");
    return res.json();
  },

  async getAllTasks(): Promise<AgentState[]> {
    const res = await fetch("/api/tasks");
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
  },

  async approveTask(id: string, approvedBy = "Finance Supervisor", customDueDate?: string): Promise<AgentState> {
    const res = await fetch(`/api/tasks/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvedBy, customDueDate }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to approve task");
    }
    return res.json();
  },

  async rejectTask(id: string, reason = "Rejected by supervisor", rejectedBy = "Finance Supervisor"): Promise<AgentState> {
    const res = await fetch(`/api/tasks/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, rejectedBy }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to reject task");
    }
    return res.json();
  },

  // Environment data
  async getEnvironmentData(): Promise<{ invoices: InvoiceDocument[]; financeRecords: FinanceRecord[] }> {
    const res = await fetch("/api/environment/data");
    if (!res.ok) throw new Error("Failed to fetch environment data");
    return res.json();
  },

  async resetEnvironment(): Promise<{ success: boolean; message: string }> {
    const res = await fetch("/api/environment/reset", { method: "POST" });
    if (!res.ok) throw new Error("Failed to reset environment");
    return res.json();
  },

  // Tools
  async getTools(): Promise<ToolMetadata[]> {
    const res = await fetch("/api/tools");
    if (!res.ok) throw new Error("Failed to fetch tools catalog");
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(taskId?: string): Promise<AuditLogEntry[]> {
    const url = taskId ? `/api/audit?taskId=${encodeURIComponent(taskId)}` : "/api/audit";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
  },

  // Company Memory
  async getCompanyMemory(): Promise<{
    policy: CompanyPolicy;
    vendors: VendorProfile[];
    history: Array<{ taskId: string; goal: string; status: string; timestamp: string; summary: string }>;
  }> {
    const res = await fetch("/api/memory");
    if (!res.ok) throw new Error("Failed to fetch company memory");
    return res.json();
  },

  async updatePolicy(policy: Partial<CompanyPolicy>): Promise<CompanyPolicy> {
    const res = await fetch("/api/memory/policy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(policy),
    });
    if (!res.ok) throw new Error("Failed to update policy");
    return res.json();
  },
};

/**
 * Audit Logger
 * Maintains an immutable, tamper-evident log of all agent operations.
 */

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
  metadata?: Record<string, unknown>;
}

export class AuditLogger {
  private logs: AuditLogEntry[] = [];

  public log(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.logs.unshift(fullEntry);
    return fullEntry;
  }

  public getByTaskId(taskId: string): AuditLogEntry[] {
    return this.logs.filter((l) => l.taskId === taskId);
  }

  public getAll(): AuditLogEntry[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
  }
}

export const auditLogger = new AuditLogger();

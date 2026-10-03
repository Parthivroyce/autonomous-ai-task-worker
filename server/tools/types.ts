/**
 * Tool Definition Interfaces & Types
 */

import { z } from "zod";

export type ToolPermission = "READ" | "WRITE" | "APPROVAL";

export interface ToolExecutionContext {
  taskId: string;
  stepId: number;
  approved?: boolean;
  approvalUser?: string;
  simulatedDelayMs?: number;
}

export interface ToolExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ITool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  permission: ToolPermission;
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  execute(input: TInput, context: ToolExecutionContext): Promise<ToolExecutionResult<TOutput>>;
}

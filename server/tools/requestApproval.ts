import { z } from "zod";
import { ITool, ToolExecutionContext, ToolExecutionResult } from "./types.js";

export const requestApprovalInputSchema = z.object({
  reason: z.string().min(1).describe("Explanation of why human sign-off is required"),
  action: z.string().min(1).describe("Proposed action to be taken once approved (e.g. 'Enter invoice into ERP')"),
  risk: z.enum(["low", "medium", "high"]).describe("Assessed operational risk tier"),
  details: z.record(z.string(), z.unknown()).optional().describe("Invoice and transaction details requiring sign-off"),
});

export type RequestApprovalInput = z.infer<typeof requestApprovalInputSchema>;

export interface RequestApprovalOutput {
  approvalId: string;
  status: "pending";
  reason: string;
  action: string;
  risk: "low" | "medium" | "high";
  details?: Record<string, unknown>;
  requiresAgentPause: boolean;
}

export class RequestApprovalTool implements ITool<RequestApprovalInput, RequestApprovalOutput> {
  public name = "request_human_approval";
  public description = "Request human manager authorization before executing sensitive or high-value transactions. Pauses the agent state machine.";
  public permission = "APPROVAL" as const;
  public inputSchema = requestApprovalInputSchema;

  public async execute(
    input: RequestApprovalInput,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<RequestApprovalOutput>> {
    const approvalId = `APPR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return {
      success: true,
      data: {
        approvalId,
        status: "pending",
        reason: input.reason,
        action: input.action,
        risk: input.risk,
        details: input.details,
        requiresAgentPause: true,
      },
      metadata: {
        taskId: context.taskId,
        stepId: context.stepId,
      },
    };
  }
}

export const requestApprovalTool = new RequestApprovalTool();

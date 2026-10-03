import { ITool, ToolExecutionResult, ToolExecutionContext } from "./types.js";
import { searchInvoicesTool } from "./searchInvoices.js";
import { getInvoiceTool } from "./getInvoice.js";
import { extractInvoiceDataTool } from "./extractInvoiceData.js";
import { searchFinanceRecordsTool } from "./searchFinanceRecords.js";
import { createInvoiceRecordTool } from "./createInvoiceRecord.js";
import { getFinanceRecordTool } from "./getFinanceRecord.js";
import { requestApprovalTool } from "./requestApproval.js";
import { z } from "zod";

export interface ToolDefinitionMetadata {
  name: string;
  description: string;
  permission: "READ" | "WRITE" | "APPROVAL";
  inputSchemaJson: Record<string, unknown>;
}

export class ToolRegistry {
  private tools: Map<string, ITool<any, any>> = new Map();

  constructor() {
    this.register(searchInvoicesTool);
    this.register(getInvoiceTool);
    this.register(extractInvoiceDataTool);
    this.register(searchFinanceRecordsTool);
    this.register(createInvoiceRecordTool);
    this.register(getFinanceRecordTool);
    this.register(requestApprovalTool);
  }

  public register(tool: ITool<any, any>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ITool<any, any> | undefined {
    return this.tools.get(name);
  }

  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  public getAllTools(): Array<ITool<any, any>> {
    return Array.from(this.tools.values());
  }

  public getToolMetadataList(): ToolDefinitionMetadata[] {
    return this.getAllTools().map((t) => {
      let schemaJson: Record<string, unknown> = {};
      try {
        // Simple shape description for UI and LLM prompt
        if (t.inputSchema instanceof z.ZodObject) {
          const shape = (t.inputSchema as z.ZodObject<any>).shape;
          schemaJson = Object.keys(shape).reduce((acc, key) => {
            acc[key] = shape[key]._def.typeName;
            return acc;
          }, {} as Record<string, unknown>);
        }
      } catch {
        schemaJson = { type: "object" };
      }

      return {
        name: t.name,
        description: t.description,
        permission: t.permission,
        inputSchemaJson: schemaJson,
      };
    });
  }

  public async executeTool(
    name: string,
    rawInput: unknown,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `SECURITY_VIOLATION: Attempted execution of unauthorized or unknown tool '${name}'. Only registered tools are permitted.`,
        errorCode: "UNAUTHORIZED_TOOL",
        retryable: false,
      };
    }

    // Validate rawInput using tool's Zod schema
    const parseResult = tool.inputSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
        .join("; ");
      return {
        success: false,
        error: `INVALID_ARGUMENTS: Argument validation failed for tool '${name}': ${issues}`,
        errorCode: "SCHEMA_VALIDATION_ERROR",
        retryable: false,
      };
    }

    // Execute tool
    return await tool.execute(parseResult.data, context);
  }
}

export const toolRegistry = new ToolRegistry();

import { PlanStep } from "./state.js";
import { AgentModelService, StructuredPlanOutput } from "./llm.js";

export class Planner {
  public static async createPlan(goal: string): Promise<{
    understanding: string;
    vendor?: string;
    invoiceNumber?: string;
    steps: PlanStep[];
  }> {
    const rawPlan: StructuredPlanOutput = await AgentModelService.generatePlan(goal);

    const steps: PlanStep[] = rawPlan.steps.map((s) => ({
      id: s.id,
      description: s.description,
      tool: s.tool,
      status: "pending",
      expectedOutcome: s.expectedOutcome,
    }));

    return {
      understanding: rawPlan.understanding,
      vendor: rawPlan.vendorIdentified,
      invoiceNumber: rawPlan.invoiceNumberIdentified,
      steps,
    };
  }
}

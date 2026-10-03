import React, { useState } from "react";
import {
  Play,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  Database,
  FileCheck2,
  CopyX,
} from "lucide-react";

interface NewTaskViewProps {
  onStartTask: (goal: string) => Promise<void>;
  isLoading: boolean;
}

export const NewTaskView: React.FC<NewTaskViewProps> = ({ onStartTask, isLoading }) => {
  const [goal, setGoal] = useState("");

  const presets = [
    {
      title: "1. Standard Processing (< ₹100,000)",
      badge: "Auto-Approved",
      badgeColor: "bg-emerald-950/60 text-emerald-400 border-emerald-800/60",
      icon: FileCheck2,
      description: "Auto-clears under threshold. Extracts fields, enters ERP, and runs 5-point verification.",
      prompt: "Find invoice ST-2026-101 from Stark Industries, extract financial fields, record in ERP, and verify.",
    },
    {
      title: "2. Manager Approval Required (₹140,000)",
      badge: "Human Approval",
      badgeColor: "bg-amber-950/60 text-amber-400 border-amber-800/60",
      icon: Clock,
      description: "Threshold policy triggers pause. Emits approval request to UI and waits for supervisor sign-off.",
      prompt: "Find the latest invoice from Acme Corp, extract the amount and due date, enter it into our finance system, verify that it was recorded correctly, and tell me what you did.",
    },
    {
      title: "3. High-Risk Executive Approval (₹650,000)",
      badge: "High Risk (> ₹500k)",
      badgeColor: "bg-rose-950/60 text-rose-400 border-rose-800/60",
      icon: AlertCircle,
      description: "Flags high-value infrastructure contract. Enforces dual-level executive authorization.",
      prompt: "Record invoice GL-2026-550 from Globex in the finance system with executive approval.",
    },
    {
      title: "4. Duplicate Invoice Detection",
      badge: "Duplicate Prevention",
      badgeColor: "bg-blue-950/60 text-blue-400 border-blue-800/60",
      icon: CopyX,
      description: "Proactively checks ERP ledger, detects existing record FIN-2020, and prevents double-entry.",
      prompt: "Process invoice WE-2026-888 from Wayne Enterprises.",
    },
    {
      title: "5. Flaky DB Error & Bounded Retry",
      badge: "Failure Recovery",
      badgeColor: "bg-purple-950/60 text-purple-400 border-purple-800/60",
      icon: Database,
      description: "ERP ledger connection drops on attempt 1. Agent executes bounded exponential backoff and succeeds on retry.",
      prompt: "Enter invoice GL-2026-402 into finance system.",
    },
    {
      title: "6. Missing Due Date Escalation",
      badge: "No Hallucination",
      badgeColor: "bg-indigo-950/60 text-indigo-400 border-indigo-800/60",
      icon: ShieldCheck,
      description: "Vendor invoice omits due date. Agent refuses to fabricate a date and pauses for human input.",
      prompt: "Process invoice GL-2026-301 from Globex.",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || isLoading) return;
    onStartTask(goal.trim());
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header section */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-xs font-semibold text-cyan-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CentrAlign Autonomous AI Worker</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Assign a Finance Task</h2>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          Instruct the autonomous employee in natural language. The agent reasons through an explicit state machine, validates policies, executes real tools against the simulated enterprise environment, and verifies all ledger writes.
        </p>
      </div>

      {/* Main input card */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <label htmlFor="goal-input" className="block text-sm font-semibold text-slate-200">
          What should the AI employee do?
        </label>
        <div className="relative">
          <textarea
            id="goal-input"
            rows={4}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Find the latest invoice from Acme Corp, extract the amount and due date, enter it into our finance system, verify that it was recorded correctly, and tell me what you did."
            className="w-full rounded-xl bg-slate-950/90 border border-slate-700/80 p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none font-sans"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Structured Tool Calling & Zod Validation Enabled</span>
          </div>

          <button
            type="submit"
            disabled={!goal.trim() || isLoading}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-cyan-500/40 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Initializing Agent...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run AI Employee</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preset enterprise demonstration scenarios */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Flagship Enterprise Test Scenarios
          </h3>
          <span className="text-xs text-slate-500">Click any card to populate goal</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {presets.map((preset, idx) => {
            const Icon = preset.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setGoal(preset.prompt)}
                className="text-left p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${preset.badgeColor}`}>
                      {preset.badge}
                    </span>
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {preset.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-cyan-400/80 group-hover:text-cyan-300 font-medium">
                  <span className="truncate pr-2 font-mono text-[11px] text-slate-500 group-hover:text-slate-400">
                    "{preset.prompt.slice(0, 48)}..."
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

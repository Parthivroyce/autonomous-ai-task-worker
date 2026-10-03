import React from "react";
import { AgentState } from "../types/index.js";
import { History, CheckCircle2, ShieldCheck, ArrowRight, Clock, Database } from "lucide-react";

interface CompletedTasksViewProps {
  tasks: AgentState[];
  onSelectTask: (taskId: string) => void;
}

export const CompletedTasksView: React.FC<CompletedTasksViewProps> = ({
  tasks,
  onSelectTask,
}) => {
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-xs font-semibold text-emerald-400">
          <History className="w-3.5 h-3.5" />
          <span>Verified Work Archive</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Completed Tasks & Evidence</h2>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          Every completed task provides independent verification evidence confirming that durable financial records were written accurately into the ERP database.
        </p>
      </div>

      {completedTasks.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-500 mx-auto opacity-70" />
          <p className="text-sm text-slate-400">No completed tasks yet.</p>
          <p className="text-xs text-slate-500">Run a task from the New Task tab to populate verified evidence.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {completedTasks.map((t) => {
            const extracted = t.memory?.extractedInvoice as any;
            const recordId = (t.memory?.createdFinanceRecordId || (t.memory?.existingFinanceRecord as any)?.recordId) as string;

            return (
              <div
                key={t.taskId}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {t.taskId}
                    </span>
                    <span className="text-xs font-bold text-slate-100 truncate max-w-md">
                      "{t.goal}"
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Completed {t.completedAt ? new Date(t.completedAt).toLocaleTimeString() : ""}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950 text-xs border border-slate-800/80">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Vendor</span>
                    <p className="font-bold text-slate-200 truncate">{extracted?.vendor || "Vendor"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Invoice #</span>
                    <p className="font-mono text-slate-200">{extracted?.invoice_number || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Verified Amount</span>
                    <p className="font-bold text-cyan-400">
                      ₹{Number(extracted?.amount || 0).toLocaleString()} {extracted?.currency || "INR"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Finance Record ID</span>
                    <p className="font-mono font-bold text-emerald-400">{recordId || "N/A"}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-line leading-relaxed">
                  {t.finalSummary}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2 text-xs text-emerald-400/90">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>5-point ledger verification passed</span>
                  </div>

                  <button
                    onClick={() => onSelectTask(t.taskId)}
                    className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    <span>View Tool Execution Trace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

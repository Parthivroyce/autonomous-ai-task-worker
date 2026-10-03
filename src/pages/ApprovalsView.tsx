import React, { useState } from "react";
import { AgentState, ApprovalRequest } from "../types/index.js";
import { CheckSquare, ShieldAlert, CheckCircle2, XCircle, Clock } from "lucide-react";

interface ApprovalsViewProps {
  tasks: AgentState[];
  onApprove: (taskId: string, approvedBy: string, customDueDate?: string) => Promise<void>;
  onReject: (taskId: string, reason: string) => Promise<void>;
  onSelectTask: (taskId: string) => void;
  isProcessingAction: boolean;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  tasks,
  onApprove,
  onReject,
  onSelectTask,
  isProcessingAction,
}) => {
  const [approver, setApprover] = useState("Finance Controller Michael");
  const [dueDateInput, setDueDateInput] = useState("2026-10-31");

  // Collect all approvals across tasks
  const pendingApprovals: Array<{ task: AgentState; approval: ApprovalRequest }> = [];
  const historicalApprovals: Array<{ task: AgentState; approval: ApprovalRequest }> = [];

  tasks.forEach((t) => {
    t.approvals?.forEach((app) => {
      if (app.status === "pending") {
        pendingApprovals.push({ task: t, approval: app });
      } else {
        historicalApprovals.push({ task: t, approval: app });
      }
    });
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-800/50 text-xs font-semibold text-amber-400">
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Human-in-the-Loop Governance</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Financial Authorizations & Escalations</h2>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          Actions exceeding organizational spend thresholds or missing mandatory fields halt in place. Human approval triggers a verified state transition and resumes the agent.
        </p>
      </div>

      {/* Pending Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Pending Authorizations ({pendingApprovals.length})</span>
          </h3>
          <span className="text-xs text-slate-500">Awaiting supervisor sign-off</span>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            No pending authorizations. All autonomous agent tasks are cleared or completed.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingApprovals.map(({ task, approval }) => (
              <div
                key={approval.id}
                className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/50 shadow-xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {task.taskId}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      approval.risk === "high"
                        ? "bg-rose-950 text-rose-300 border-rose-800"
                        : "bg-amber-950 text-amber-300 border-amber-800"
                    }`}>
                      {approval.risk} Risk Tier
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    Requested: {new Date(approval.requestedAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Vendor</span>
                    <p className="font-bold text-slate-200 truncate">{approval.details.vendor || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Invoice Number</span>
                    <p className="font-mono text-slate-200">{approval.details.invoice_number || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Amount</span>
                    <p className="font-bold text-cyan-400">
                      ₹{Number(approval.details.amount || 0).toLocaleString()} {String(approval.details.currency || "INR")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Due Date</span>
                    <p className="font-mono text-slate-200">
                      {approval.details.due_date || <span className="text-rose-400 font-bold">MISSING</span>}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-amber-400">Reason:</span> {approval.reason}
                </div>

                {approval.details.missingField === "due_date" && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-indigo-900/60 space-y-1.5">
                    <label className="block text-xs font-semibold text-indigo-300">
                      Supply Verified Due Date:
                    </label>
                    <input
                      type="date"
                      value={dueDateInput}
                      onChange={(e) => setDueDateInput(e.target.value)}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => onSelectTask(task.taskId)}
                    className="text-xs text-cyan-400 hover:underline font-mono"
                  >
                    View Live Execution Timeline →
                  </button>

                  <div className="flex items-center space-x-2.5">
                    <button
                      onClick={() => onReject(task.taskId, "Rejected in Approvals queue")}
                      disabled={isProcessingAction}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-rose-300 transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() =>
                        onApprove(
                          task.taskId,
                          approver,
                          approval.details.missingField === "due_date" ? dueDateInput : undefined
                        )
                      }
                      disabled={isProcessingAction}
                      className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Authorize & Resume</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Approvals */}
      {historicalApprovals.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Resolved Authorizations ({historicalApprovals.length})
          </h3>
          <div className="space-y-2">
            {historicalApprovals.map(({ task, approval }) => (
              <div
                key={approval.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-slate-400">{task.taskId}</span>
                    <span className="font-bold text-slate-200">{approval.details.vendor}</span>
                    <span className="text-slate-400">({approval.details.invoice_number})</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{approval.reason}</p>
                </div>
                <div className="text-right space-y-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      approval.status === "approved"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-rose-950 text-rose-400 border border-rose-800"
                    }`}
                  >
                    {approval.status.toUpperCase()}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono">
                    By: {approval.resolvedBy || "Supervisor"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

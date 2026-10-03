import React, { useState } from "react";
import {
  AgentState,
  ToolCall,
  Observation,
  ApprovalRequest,
  VerificationCheck,
} from "../types/index.js";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  RotateCw,
  XCircle,
  FileSearch,
  Database,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

interface AgentRunViewProps {
  task: AgentState | null;
  onApprove: (taskId: string, approvedBy: string, customDueDate?: string) => Promise<void>;
  onReject: (taskId: string, reason: string) => Promise<void>;
  onRefresh: () => void;
  isProcessingAction: boolean;
}

export const AgentRunView: React.FC<AgentRunViewProps> = ({
  task,
  onApprove,
  onReject,
  onRefresh,
  isProcessingAction,
}) => {
  const [approverName, setApproverName] = useState("Finance Manager Sarah");
  const [customDueDate, setCustomDueDate] = useState("2026-10-31");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
          <Clock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white">No Active Agent Run</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Start a new finance assignment from the New Task tab to watch the autonomous employee execute live tools.
        </p>
      </div>
    );
  }

  const isPausedForApproval = task.status === "WAITING_FOR_APPROVAL";
  const pendingApproval = task.approvals?.find((a) => a.status === "pending");
  const isMissingDueDate = pendingApproval?.details?.missingField === "due_date";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return {
          label: "COMPLETED",
          bg: "bg-emerald-950/80 text-emerald-400 border-emerald-800",
          icon: CheckCircle2,
        };
      case "WAITING_FOR_APPROVAL":
        return {
          label: "WAITING FOR APPROVAL",
          bg: "bg-amber-950/80 text-amber-300 border-amber-800 animate-pulse",
          icon: AlertTriangle,
        };
      case "VERIFYING":
        return {
          label: "VERIFYING DURABLE STATE",
          bg: "bg-indigo-950/80 text-indigo-300 border-indigo-800",
          icon: ShieldCheck,
        };
      case "RECOVERING":
        return {
          label: "RECOVERING WITH BACKOFF",
          bg: "bg-purple-950/80 text-purple-300 border-purple-800 animate-pulse",
          icon: RotateCw,
        };
      case "FAILED":
        return {
          label: "FAILED / STOPPED",
          bg: "bg-rose-950/80 text-rose-400 border-rose-800",
          icon: XCircle,
        };
      default:
        return {
          label: status,
          bg: "bg-cyan-950/80 text-cyan-300 border-cyan-800",
          icon: Clock,
        };
    }
  };

  const statusMeta = getStatusBadge(task.status);
  const StatusIcon = statusMeta.icon;

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Task Header Card */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {task.taskId}
            </span>
            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusMeta.bg}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusMeta.label}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <span>Started: {new Date(task.createdAt).toLocaleTimeString()}</span>
            {task.completedAt && (
              <span>• Finished: {new Date(task.completedAt).toLocaleTimeString()}</span>
            )}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Assigned Objective
          </span>
          <p className="text-base font-medium text-slate-100 mt-1 leading-relaxed">
            "{task.goal}"
          </p>
        </div>

        {/* Milestone Timeline */}
        <div className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { label: "Understand", active: true },
              { label: "Plan", active: task.plan?.length > 0 },
              { label: "Search", active: task.memory.invoiceSearchDone },
              { label: "Extract", active: !!task.memory.extractedInvoice },
              { label: "Policy Check", active: task.memory.policyChecked || task.memory.completenessChecked },
              { label: "Approval", active: task.approvals?.length > 0, highlight: isPausedForApproval },
              { label: "ERP Write", active: task.memory.writeAttempted || task.memory.duplicateHandled },
              { label: "Verify", active: !!task.verification },
            ].map((step, idx) => (
              <div
                key={idx}
                className={`px-2.5 py-2 rounded-lg text-center border text-[11px] font-semibold transition-all ${
                  step.highlight
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse shadow-sm"
                    : step.active
                    ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                    : "bg-slate-950/40 text-slate-600 border-slate-800/80"
                }`}
              >
                <div className="text-[9px] opacity-70 mb-0.5">0{idx + 1}</div>
                <div className="truncate">{step.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HUMAN APPROVAL ACTION BANNER (When state is WAITING_FOR_APPROVAL) */}
      {isPausedForApproval && pendingApproval && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border-2 border-amber-500/60 shadow-2xl shadow-amber-500/10 space-y-5 animate-in fade-in duration-300">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-amber-300">
                    Human Authorization Required
                  </h3>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    pendingApproval.risk === "high"
                      ? "bg-rose-950/80 text-rose-300 border-rose-800"
                      : "bg-amber-950/80 text-amber-300 border-amber-800"
                  }`}>
                    {pendingApproval.risk} Risk Tier
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  The agent paused execution in compliance with enterprise financial governance.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-amber-400/80">ID: {pendingApproval.id}</span>
          </div>

          {/* Transaction Summary Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500">Vendor</span>
              <p className="text-sm font-semibold text-slate-100 truncate">
                {pendingApproval.details.vendor || "N/A"}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500">Invoice Number</span>
              <p className="text-sm font-mono font-semibold text-slate-100">
                {pendingApproval.details.invoice_number || "N/A"}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500">Total Amount</span>
              <p className="text-sm font-bold text-cyan-400">
                ₹{Number(pendingApproval.details.amount || 0).toLocaleString()} {String(pendingApproval.details.currency || "INR")}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500">Payment Due Date</span>
              <p className="text-sm font-mono text-slate-200">
                {pendingApproval.details.due_date || (
                  <span className="text-rose-400 font-bold">MISSING ON INVOICE</span>
                )}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-1">
            <span className="font-semibold text-amber-400">Policy Justification:</span>
            <p className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
              {pendingApproval.reason}
            </p>
          </div>

          {/* Missing Due Date Input (Scenario C) */}
          {isMissingDueDate && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-800/60 space-y-2">
              <label htmlFor="due-date-input" className="block text-xs font-semibold text-indigo-300 flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Specify Verified Due Date for ERP Ledger Entry:</span>
              </label>
              <input
                id="due-date-input"
                type="date"
                value={customDueDate}
                onChange={(e) => setCustomDueDate(e.target.value)}
                className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <p className="text-[11px] text-slate-400">
                CentrAlign Policy: AI workers never hallucinate missing dates. Human accounts payable lead must confirm terms.
              </p>
            </div>
          )}

          {/* Rejection input field if toggled */}
          {showRejectInput && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label htmlFor="rejection-input" className="block text-xs font-semibold text-rose-300">
                Reason for Rejection:
              </label>
              <input
                id="rejection-input"
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Disputed line item rate; vendor contract expired."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-rose-900/60 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Approver Sign-off:</span>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-3">
              {!showRejectInput ? (
                <button
                  type="button"
                  onClick={() => setShowRejectInput(true)}
                  disabled={isProcessingAction}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-800 text-xs font-semibold text-slate-300 hover:text-rose-300 transition-all disabled:opacity-50"
                >
                  Reject...
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onReject(task.taskId, rejectionReason || "Rejected by supervisor")}
                  disabled={isProcessingAction}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  onApprove(task.taskId, approverName, isMissingDueDate ? customDueDate : undefined)
                }
                disabled={isProcessingAction}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 hover:shadow-emerald-500/35"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Authorize & Resume Agent</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL VERIFIED COMPLETION CARD */}
      {task.status === "COMPLETED" && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/50 shadow-xl space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-400">Verified Completed Work</h3>
                <p className="text-xs text-slate-400">
                  Execution completed and independently verified against the finance ERP ledger.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
              LEDGER VERIFIED ✓
            </span>
          </div>

          {/* Formatted summary */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-line leading-relaxed">
            {task.finalSummary}
          </div>

          {/* Field verification checklist */}
          {task.verification && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Deterministic Field Verification Checklist
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {task.verification.checks.map((check: VerificationCheck, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start space-x-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-200 capitalize">
                        {check.field.replace(/_/g, " ")}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        Matched: <span className="font-mono text-slate-300">{String(check.actual)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAILURE ALERT CARD */}
      {task.status === "FAILED" && (
        <div className="p-5 rounded-xl bg-rose-950/30 border border-rose-800/80 space-y-2">
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
            <XCircle className="w-5 h-5" />
            <span>Task Execution Halted</span>
          </div>
          <p className="text-xs font-mono text-slate-300 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            {task.errorMessage || "Task encountered an unrecoverable failure state."}
          </p>
        </div>
      )}

      {/* Main Split: Structured Plan & Tool Invocations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Structured Plan & Observations */}
        <div className="space-y-6 lg:col-span-1">
          {/* Structured Plan Checklist */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Structured Plan</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-500">
                {task.plan?.length || 0} steps
              </span>
            </div>

            <div className="space-y-2">
              {task.plan?.map((step) => {
                const isExecuted = task.toolCalls?.some((c) => c.stepId === step.id && c.status === "success");
                return (
                  <div
                    key={step.id}
                    className={`p-2.5 rounded-lg border text-xs flex items-start space-x-2 transition-all ${
                      isExecuted
                        ? "bg-slate-950/80 border-slate-800 text-slate-300"
                        : "bg-slate-950/40 border-slate-800/50 text-slate-500"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-mono mt-0.5 ${
                        isExecuted
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {step.id}
                    </span>
                    <div className="space-y-0.5">
                      <p className="font-medium text-slate-200 leading-tight">{step.description}</p>
                      <span className="font-mono text-[10px] text-slate-500 block">
                        Tool: {step.tool}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observations & Structured Reasoning */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Observations & Reasoning</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-500">
                {task.observations?.length || 0} recorded
              </span>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {task.observations?.map((obs: Observation) => (
                <div key={obs.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="text-cyan-400">{obs.toolName}</span>
                    <span>{new Date(obs.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-300 font-medium leading-relaxed">{obs.summary}</p>
                  {obs.reasoning && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-2 rounded border border-slate-800">
                      ↳ {obs.reasoning}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Real Tool Executions */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Real Tool Execution Stream ({task.toolCalls?.length || 0})</span>
            </h4>
            <span className="text-xs text-slate-500 font-mono">Actual Simulated Sandbox Calls</span>
          </div>

          <div className="space-y-3">
            {task.toolCalls?.map((call: ToolCall, idx: number) => {
              const isSuccess = call.status === "success";
              const isError = call.status === "error";

              return (
                <div
                  key={call.id || idx}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 transition-all hover:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center font-semibold">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-sm font-bold text-cyan-300">
                        {call.toolName}
                      </span>
                      {call.retryCount && call.retryCount > 0 ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                          {call.retryCount} retry(s)
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-mono">
                      {call.durationMs && (
                        <span className="text-slate-500">{call.durationMs}ms</span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSuccess
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                            : isError
                            ? "bg-rose-950/80 text-rose-400 border border-rose-800"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {call.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Input JSON */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">
                      Validated Input Arguments:
                    </span>
                    <pre className="p-2.5 rounded-lg bg-slate-950 text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-800/80">
                      {JSON.stringify(call.input, null, 2)}
                    </pre>
                  </div>

                  {/* Output or Error */}
                  {call.output && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-slate-500">
                        Observable Result:
                      </span>
                      <pre className="p-2.5 rounded-lg bg-slate-950 text-[11px] font-mono text-cyan-300/90 overflow-x-auto border border-slate-800/80 max-h-48">
                        {JSON.stringify(call.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {call.error && (
                    <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-xs font-mono text-rose-300">
                      Error: {call.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

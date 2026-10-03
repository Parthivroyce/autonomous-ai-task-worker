import React, { useState, useEffect } from "react";
import { AuditLogEntry } from "../types/index.js";
import { api } from "../services/api.js";
import { FileText, Search, RefreshCw, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesQuery =
      log.toolName.toLowerCase().includes(filter.toLowerCase()) ||
      log.taskId.toLowerCase().includes(filter.toLowerCase()) ||
      log.agentState.toLowerCase().includes(filter.toLowerCase());

    const matchesStatus =
      selectedStatus === "ALL" || log.status === selectedStatus;

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-xs font-semibold text-cyan-400">
            <FileText className="w-3.5 h-3.5" />
            <span>Immutable Governance Record</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Enterprise Audit Trail</h2>
          <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
            Every autonomous tool execution, sanitized payload, duration, and retry is permanently recorded for regulatory auditability.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by tool, task ID, state..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto text-xs">
          <span className="text-slate-500 text-[11px] uppercase font-semibold">Filter:</span>
          {["ALL", "SUCCESS", "FAILED", "RETRYING"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                selectedStatus === st
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No audit log entries match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Task ID</th>
                  <th className="py-3 px-4">Tool Name</th>
                  <th className="py-3 px-4">Permission</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Retries</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const isSuccess = log.status === "SUCCESS";
                  const isRetrying = log.status === "RETRYING";

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-bold">{log.taskId}</td>
                        <td className="py-3 px-4 text-cyan-400 font-bold">{log.toolName}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            log.permission === "WRITE"
                              ? "bg-amber-950 text-amber-300 border-amber-800"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}>
                            {log.permission}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-[11px]">{log.agentState}</td>
                        <td className="py-3 px-4 text-slate-400">{log.durationMs}ms</td>
                        <td className="py-3 px-4 text-slate-400">
                          {log.retryCount > 0 ? (
                            <span className="text-purple-400 font-bold">{log.retryCount}</span>
                          ) : (
                            "0"
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : isRetrying
                              ? "bg-purple-950 text-purple-300 border border-purple-800"
                              : "bg-rose-950 text-rose-400 border border-rose-800"
                          }`}>
                            {isSuccess ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : isRetrying ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            <span>{log.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-950/70">
                          <td colSpan={9} className="p-4 space-y-3 font-sans">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-sans block mb-1">
                                  Sanitized Input Payload:
                                </span>
                                <pre className="p-3 rounded-lg bg-slate-900 text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-800">
                                  {JSON.stringify(log.inputSanitized, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-sans block mb-1">
                                  Sanitized Output Result:
                                </span>
                                <pre className="p-3 rounded-lg bg-slate-900 text-[11px] font-mono text-cyan-300/90 overflow-x-auto border border-slate-800 max-h-48">
                                  {JSON.stringify(log.outputSanitized || { error: log.errorMessage }, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

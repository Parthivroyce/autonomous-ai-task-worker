import React, { useState, useEffect } from "react";
import { InvoiceDocument, FinanceRecord } from "../types/index.js";
import { api } from "../services/api.js";
import { Database, FileText, RefreshCw, CheckCircle2, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";

interface EnvironmentViewProps {
  onResetEnv: () => void;
  isResetting: boolean;
}

export const EnvironmentView: React.FC<EnvironmentViewProps> = ({ onResetEnv, isResetting }) => {
  const [invoices, setInvoices] = useState<InvoiceDocument[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"invoices" | "finance">("finance");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getEnvironmentData();
      setInvoices(data.invoices);
      setFinanceRecords(data.financeRecords);
    } catch (err) {
      console.error("Failed to load environment data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-xs font-semibold text-cyan-400">
            <Database className="w-3.5 h-3.5" />
            <span>Actual Persisted State</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Simulated Enterprise Environment</h2>
          <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
            Inspect the underlying company document repository and ERP finance ledger. Real state changes occur here when the autonomous employee executes write operations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={async () => {
              await onResetEnv();
              loadData();
            }}
            disabled={isResetting}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800 text-xs font-semibold text-rose-300 transition-all disabled:opacity-50"
          >
            <span>Reset to Initial</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("finance")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "finance"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Accounts Payable Ledger ({financeRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "invoices"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Document Repository Invoices ({invoices.length})</span>
        </button>
      </div>

      {/* Finance Records Ledger View */}
      {activeTab === "finance" && (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Entered By</th>
                  <th className="py-3 px-4">Entered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {financeRecords.map((r) => (
                  <tr key={r.recordId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-emerald-400 font-bold">{r.recordId}</td>
                    <td className="py-3 px-4 text-slate-200">{r.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-200 font-sans font-medium">{r.vendor}</td>
                    <td className="py-3 px-4 font-bold text-cyan-300">
                      ₹{r.amount.toLocaleString()} {r.currency}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{r.dueDate}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{r.enteredBy}</td>
                    <td className="py-3 px-4 text-slate-500 text-[10px]">
                      {new Date(r.enteredAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoices Repository View */}
      {activeTab === "invoices" && (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const isExpanded = expandedInvoiceId === inv.id;
            return (
              <div
                key={inv.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 transition-all hover:border-slate-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {inv.id}
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-100">
                      {inv.invoiceNumber}
                    </span>
                    <span className="text-xs text-slate-400">({inv.vendor})</span>
                    {inv.metadata?.specialHandling && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                        {inv.metadata.specialHandling}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-cyan-400 font-mono">
                      ₹{inv.amount.toLocaleString()} {inv.currency}
                    </span>
                    <button
                      onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                      className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                    >
                      <span>{isExpanded ? "Hide Text" : "View Text"}</span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400 font-mono">
                  <div>Issue Date: <span className="text-slate-300">{inv.issueDate}</span></div>
                  <div>
                    Due Date:{" "}
                    {inv.dueDate ? (
                      <span className="text-slate-300">{inv.dueDate}</span>
                    ) : (
                      <span className="text-rose-400 font-bold">MISSING</span>
                    )}
                  </div>
                  <div>Recipient: <span className="text-slate-300 truncate">{inv.recipient}</span></div>
                  <div>Line Items: <span className="text-slate-300">{inv.items.length} items</span></div>
                </div>

                {isExpanded && (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-sans block">
                      Raw Invoice Document Contents:
                    </span>
                    <pre className="p-3 rounded-lg bg-slate-950 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-800">
                      {inv.rawText}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

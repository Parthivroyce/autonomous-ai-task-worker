import React, { useState, useEffect } from "react";
import { CompanyPolicy, VendorProfile } from "../types/index.js";
import { api } from "../services/api.js";
import {
  Brain,
  ShieldCheck,
  Building2,
  History,
  Save,
  Check,
  AlertCircle,
  Sliders,
} from "lucide-react";

export const CompanyMemoryView: React.FC = () => {
  const [policy, setPolicy] = useState<CompanyPolicy | null>(null);
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadMemory();
  }, []);

  const loadMemory = async () => {
    try {
      setIsLoading(true);
      const data = await api.getCompanyMemory();
      setPolicy(data.policy);
      setVendors(data.vendors);
      setHistory(data.history);
    } catch (err) {
      console.error("Failed to load company memory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy) return;

    try {
      setIsSaving(true);
      const updated = await api.updatePolicy(policy);
      setPolicy(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update policy:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !policy) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-400">Loading persistent company memory...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-xs font-semibold text-cyan-400">
          <Brain className="w-3.5 h-3.5" />
          <span>Persistent Organization Memory</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Enterprise Financial Policies & Vendor Directory</h2>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          The autonomous worker queries company memory before selecting tools and executing write operations. Policies can be reconfigured dynamically by authorized finance controllers.
        </p>
      </div>

      {/* Policy Configuration Form */}
      <form onSubmit={handleSavePolicy} className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100">Configurable Approval & Verification Policies</h3>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-slate-950" />
                <span>Policy Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Policies"}</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Invoice Auto-Approval Limit (INR ₹)
            </label>
            <div className="relative">
              <input
                type="number"
                value={policy.invoice_auto_approval_limit}
                onChange={(e) =>
                  setPolicy({ ...policy, invoice_auto_approval_limit: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Invoices below this threshold are automatically verified and recorded into the ERP ledger.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              High-Risk Executive Sign-Off Threshold (INR ₹)
            </label>
            <div className="relative">
              <input
                type="number"
                value={policy.high_risk_threshold}
                onChange={(e) =>
                  setPolicy({ ...policy, high_risk_threshold: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Invoices at or above this threshold require explicit high-risk executive board sign-off.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <label className="flex items-center space-x-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={policy.requires_due_date}
              onChange={(e) => setPolicy({ ...policy, requires_due_date: e.target.checked })}
              className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0"
            />
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Require Due Date</span>
              <span className="text-[11px] text-slate-500">Forbid hallucinating missing dates</span>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={policy.duplicate_check_required}
              onChange={(e) => setPolicy({ ...policy, duplicate_check_required: e.target.checked })}
              className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0"
            />
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Duplicate Check</span>
              <span className="text-[11px] text-slate-500">Search ledger prior to writing</span>
            </div>
          </label>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs font-semibold text-slate-200 block">Max Bounded Retries</span>
            <span className="text-[11px] text-slate-500 font-mono">
              {policy.max_retry_attempts} attempts (Exponential Backoff)
            </span>
          </div>
        </div>
      </form>

      {/* Known Vendors Directory */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Master Vendor Directory ({vendors.length})</span>
          </h3>
          <span className="text-xs text-slate-500">Pre-registered organizational suppliers</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">{vendor.name}</h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {vendor.verifiedStatus.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>Category: <span className="text-slate-200 font-medium">{vendor.category}</span></div>
                <div>Terms: <span className="font-mono text-slate-300">{vendor.paymentTerms}</span> ({vendor.defaultCurrency})</div>
                <p className="text-[11px] text-slate-400 italic pt-1 leading-relaxed border-t border-slate-800/80">
                  "{vendor.notes}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Institutional Learning & Task History */}
      {history.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Historical Execution Memory ({history.length})</span>
          </h3>
          <div className="space-y-2">
            {history.slice(0, 5).map((entry, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-200">{entry.vendor || "Task"}</span>
                  <span className="text-slate-400 ml-2">"{entry.goal}"</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      entry.status === "COMPLETED"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-rose-950 text-rose-400 border border-rose-800"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

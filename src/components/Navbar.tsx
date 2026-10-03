import React from "react";
import { ShieldCheck, RefreshCw, Cpu, CheckCircle2 } from "lucide-react";

interface NavbarProps {
  onResetEnv: () => void;
  isResetting: boolean;
  activeTaskStatus?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onResetEnv, isResetting, activeTaskStatus }) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-white text-base tracking-tight">Autonomous Finance Employee</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              Enterprise Agent v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">An agent that turns a natural-language finance task into verified completed work.</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {activeTaskStatus && (
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                activeTaskStatus === "WAITING_FOR_APPROVAL"
                  ? "bg-amber-400 animate-pulse"
                  : activeTaskStatus === "EXECUTING" || activeTaskStatus === "VERIFYING"
                  ? "bg-cyan-400 animate-ping"
                  : activeTaskStatus === "COMPLETED"
                  ? "bg-emerald-400"
                  : "bg-slate-400"
              }`}
            />
            <span className="text-slate-300 font-mono">STATUS: {activeTaskStatus}</span>
          </div>
        )}

        <button
          onClick={onResetEnv}
          disabled={isResetting}
          title="Reset simulated document repository and finance ERP database to initial test state"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-300 transition-all hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin text-cyan-400" : ""}`} />
          <span>Reset Environment</span>
        </button>

        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/50 px-3 py-1 rounded-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Policy Guardrails Enforced</span>
        </div>
      </div>
    </header>
  );
};

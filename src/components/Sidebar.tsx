import React from "react";
import {
  PlusCircle,
  PlayCircle,
  Brain,
  Wrench,
  FileText,
  CheckSquare,
  History,
  Database,
  AlertTriangle,
} from "lucide-react";

export type NavTab =
  | "new-task"
  | "agent-run"
  | "company-memory"
  | "tools"
  | "audit-log"
  | "approvals"
  | "completed-tasks"
  | "environment";

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingApprovalsCount: number;
  hasActiveTask: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount,
  hasActiveTask,
}) => {
  const navItems = [
    {
      id: "new-task" as NavTab,
      label: "New Task",
      icon: PlusCircle,
      badge: null,
    },
    {
      id: "agent-run" as NavTab,
      label: "Agent Run",
      icon: PlayCircle,
      badge: hasActiveTask ? "Active" : null,
      badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    },
    {
      id: "approvals" as NavTab,
      label: "Approvals",
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
    {
      id: "completed-tasks" as NavTab,
      label: "Completed Tasks",
      icon: History,
      badge: null,
    },
    {
      id: "audit-log" as NavTab,
      label: "Audit Log",
      icon: FileText,
      badge: null,
    },
    {
      id: "company-memory" as NavTab,
      label: "Company Memory",
      icon: Brain,
      badge: null,
    },
    {
      id: "tools" as NavTab,
      label: "Tools Catalog",
      icon: Wrench,
      badge: null,
    },
    {
      id: "environment" as NavTab,
      label: "Simulated ERP & Docs",
      icon: Database,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/70 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3">
            Core Workflows
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor || "bg-slate-800 text-slate-300 border-slate-700"}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3">
            System & Governance
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.slice(4).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-400 space-y-2">
        <div className="flex items-center space-x-2 text-slate-200 font-semibold text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Evaluation Ready</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Test with live presets: auto-approvals, bounded retries, and duplicate prevention.
        </p>
      </div>
    </aside>
  );
};

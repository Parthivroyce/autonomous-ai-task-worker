import React, { useState, useEffect } from "react";
import { ToolMetadata } from "../types/index.js";
import { api } from "../services/api.js";
import { Wrench, Shield, Check, Lock, Code2 } from "lucide-react";

export const ToolsView: React.FC = () => {
  const [tools, setTools] = useState<ToolMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      setIsLoading(true);
      const data = await api.getTools();
      setTools(data);
    } catch (err) {
      console.error("Failed to load tools:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionBadge = (perm: string) => {
    switch (perm) {
      case "WRITE":
        return {
          bg: "bg-amber-950/80 text-amber-400 border-amber-800",
          icon: Lock,
          label: "WRITE (Mutates State)",
        };
      case "APPROVAL":
        return {
          bg: "bg-purple-950/80 text-purple-300 border-purple-800",
          icon: Shield,
          label: "APPROVAL (Pauses State Machine)",
        };
      default:
        return {
          bg: "bg-cyan-950/80 text-cyan-400 border-cyan-800",
          icon: Check,
          label: "READ (Idempotent)",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-400">Loading registered tools catalog...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-xs font-semibold text-cyan-400">
          <Wrench className="w-3.5 h-3.5" />
          <span>Deterministic Tool System</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Registered Tool Catalog & Permissions</h2>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          The agent cannot call arbitrary functions or external URLs. Every tool is strictly registered with Zod schemas, explicit permissions (READ, WRITE, APPROVAL), and deterministic policy gates.
        </p>
      </div>

      {/* Tools Grid */}
      <div className="space-y-4">
        {tools.map((tool) => {
          const permMeta = getPermissionBadge(tool.permission);
          const PermIcon = permMeta.icon;

          return (
            <div
              key={tool.name}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-3.5 hover:border-slate-700 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-base font-bold text-cyan-300">
                    {tool.name}
                  </span>
                  <div className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${permMeta.bg}`}>
                    <PermIcon className="w-3 h-3" />
                    <span>{permMeta.label}</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500">Zod Schema Validated</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {tool.description}
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center space-x-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <Code2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Input Argument Types:</span>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800">
                  {JSON.stringify(tool.inputSchemaJson, null, 2)}
                </pre>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

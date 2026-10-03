/**
 * Autonomous Finance Employee - Frontend Application
 * CentrAlign AI Engineering Assignment
 */

import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "./components/Navbar.js";
import { Sidebar, NavTab } from "./components/Sidebar.js";
import { NewTaskView } from "./pages/NewTaskView.js";
import { AgentRunView } from "./pages/AgentRunView.js";
import { CompanyMemoryView } from "./pages/CompanyMemoryView.js";
import { ToolsView } from "./pages/ToolsView.js";
import { AuditLogView } from "./pages/AuditLogView.js";
import { ApprovalsView } from "./pages/ApprovalsView.js";
import { CompletedTasksView } from "./pages/CompletedTasksView.js";
import { EnvironmentView } from "./pages/EnvironmentView.js";
import { AgentState } from "./types/index.js";
import { api } from "./services/api.js";

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>("new-task");
  const [activeTask, setActiveTask] = useState<AgentState | null>(null);
  const [allTasks, setAllTasks] = useState<AgentState[]>([]);
  const [isStartingTask, setIsStartingTask] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Initial load of all tasks
  useEffect(() => {
    loadAllTasks();
  }, []);

  const loadAllTasks = async () => {
    try {
      const tasks = await api.getAllTasks();
      setAllTasks(tasks);
      if (tasks.length > 0 && !activeTask) {
        setActiveTask(tasks[0]);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  };

  // Setup SSE stream when active task changes or is executing
  useEffect(() => {
    if (!activeTask?.taskId) return;

    // Close previous SSE connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Only subscribe to live events if not already in final state
    const sse = new EventSource(`/api/tasks/${activeTask.taskId}/events`);
    eventSourceRef.current = sse;

    sse.onmessage = async (evt) => {
      try {
        const eventData = JSON.parse(evt.data);

        // Fetch fresh state on key milestones
        const updated = await api.getTask(activeTask.taskId);
        setActiveTask(updated);

        // Keep all tasks in sync
        setAllTasks((prev) =>
          prev.map((t) => (t.taskId === updated.taskId ? updated : t))
        );

        if (eventData.type === "task_completed" || eventData.type === "task_failed") {
          sse.close();
        }
      } catch (err) {
        console.error("Error processing SSE event:", err);
      }
    };

    sse.onerror = () => {
      // SSE connection closed or error
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, [activeTask?.taskId]);

  const handleStartTask = async (goal: string) => {
    try {
      setIsStartingTask(true);
      const newTask = await api.startTask(goal);
      setActiveTask(newTask);
      setAllTasks((prev) => [newTask, ...prev]);
      setCurrentTab("agent-run");
    } catch (err) {
      console.error("Failed to start task:", err);
      alert((err as Error).message || "Failed to start task");
    } finally {
      setIsStartingTask(false);
    }
  };

  const handleApprove = async (taskId: string, approvedBy: string, customDueDate?: string) => {
    try {
      setIsProcessingAction(true);
      const updated = await api.approveTask(taskId, approvedBy, customDueDate);
      setActiveTask(updated);
      setAllTasks((prev) =>
        prev.map((t) => (t.taskId === updated.taskId ? updated : t))
      );
    } catch (err) {
      console.error("Failed to approve task:", err);
      alert((err as Error).message || "Failed to approve task");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleReject = async (taskId: string, reason: string) => {
    try {
      setIsProcessingAction(true);
      const updated = await api.rejectTask(taskId, reason);
      setActiveTask(updated);
      setAllTasks((prev) =>
        prev.map((t) => (t.taskId === updated.taskId ? updated : t))
      );
    } catch (err) {
      console.error("Failed to reject task:", err);
      alert((err as Error).message || "Failed to reject task");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleResetEnvironment = async () => {
    try {
      setIsResetting(true);
      await api.resetEnvironment();
      await loadAllTasks();
    } catch (err) {
      console.error("Failed to reset environment:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSelectTask = async (taskId: string) => {
    try {
      const task = await api.getTask(taskId);
      setActiveTask(task);
      setCurrentTab("agent-run");
    } catch (err) {
      console.error("Failed to fetch selected task:", err);
    }
  };

  // Compute pending approvals count for badge
  const pendingApprovalsCount = allTasks.reduce((acc, t) => {
    const pending = t.approvals?.filter((a) => a.status === "pending").length || 0;
    return acc + pending;
  }, 0);

  const hasActiveTask = Boolean(
    activeTask &&
      (activeTask.status === "EXECUTING" ||
        activeTask.status === "WAITING_FOR_APPROVAL" ||
        activeTask.status === "VERIFYING" ||
        activeTask.status === "RECOVERING" ||
        activeTask.status === "PLANNING" ||
        activeTask.status === "UNDERSTANDING")
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar
        onResetEnv={handleResetEnvironment}
        isResetting={isResetting}
        activeTaskStatus={activeTask?.status}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingApprovalsCount={pendingApprovalsCount}
          hasActiveTask={hasActiveTask}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {currentTab === "new-task" && (
            <NewTaskView
              onStartTask={handleStartTask}
              isLoading={isStartingTask}
            />
          )}

          {currentTab === "agent-run" && (
            <AgentRunView
              task={activeTask}
              onApprove={handleApprove}
              onReject={handleReject}
              onRefresh={loadAllTasks}
              isProcessingAction={isProcessingAction}
            />
          )}

          {currentTab === "company-memory" && <CompanyMemoryView />}

          {currentTab === "tools" && <ToolsView />}

          {currentTab === "audit-log" && <AuditLogView />}

          {currentTab === "approvals" && (
            <ApprovalsView
              tasks={allTasks}
              onApprove={handleApprove}
              onReject={handleReject}
              onSelectTask={handleSelectTask}
              isProcessingAction={isProcessingAction}
            />
          )}

          {currentTab === "completed-tasks" && (
            <CompletedTasksView
              tasks={allTasks}
              onSelectTask={handleSelectTask}
            />
          )}

          {currentTab === "environment" && (
            <EnvironmentView
              onResetEnv={handleResetEnvironment}
              isResetting={isResetting}
            />
          )}
        </main>
      </div>
    </div>
  );
}

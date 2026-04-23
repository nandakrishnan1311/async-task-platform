import { useEffect, useState } from "react";
import api from "../api/axios";
import StatusBadge from "./StatusBadge";
import toast from "react-hot-toast";

export default function TaskCard({ task: initialTask, onDelete }) {
  const [task, setTask] = useState(initialTask);
  const [showLogs, setShowLogs] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Polling: auto-refresh until terminal state
  useEffect(() => {
    if (task.status === "success" || task.status === "failed") return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/tasks/${task._id}`);
        setTask(res.data.task);
        if (res.data.task.status === "success") {
          toast.success(`Task "${task.title}" completed!`);
        } else if (res.data.task.status === "failed") {
          toast.error(`Task "${task.title}" failed`);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [task.status, task._id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/tasks/${task._id}`);
      onDelete(task._id);
      toast.success("Task deleted");
    } catch (err) {
      toast.error("Failed to delete task");
      setDeleting(false);
    }
  };

  const opLabel = {
    uppercase: "🔠 Uppercase",
    lowercase: "🔡 Lowercase",
    reverse: "🔄 Reverse",
    word_count: "🔢 Word Count",
  };

  return (
    <div className="card animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{task.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {opLabel[task.operation]} · {new Date(task.createdAt).toLocaleTimeString()}
          </p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {/* Input */}
      <div className="bg-gray-800 rounded-lg px-3 py-2 mb-3">
        <p className="text-xs text-gray-500 mb-1">Input</p>
        <p className="text-sm text-gray-300 break-all">{task.inputText}</p>
      </div>

      {/* Result */}
      {task.status === "pending" && (
        <div className="flex items-center gap-2 text-yellow-400 text-sm py-2">
          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-yellow-400" />
          Waiting in queue...
        </div>
      )}

      {task.status === "running" && (
        <div className="flex items-center gap-2 text-blue-400 text-sm py-2">
          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-blue-400" />
          Processing...
        </div>
      )}

      {task.status === "success" && task.result !== null && (
        <div className="animate-fade-in bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-green-400 mb-1">Result</p>
          <p className="text-sm text-green-300 font-mono break-all">{task.result}</p>
        </div>
      )}

      {task.status === "failed" && (
        <div className="animate-fade-in bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-red-400 mb-1">Error</p>
          <p className="text-sm text-red-300">{task.errorMessage || "Unknown error"}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {showLogs ? "Hide" : "Show"} logs ({task.logs?.length || 0})
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {/* Logs */}
      {showLogs && task.logs?.length > 0 && (
        <div className="mt-3 bg-gray-800 rounded-lg p-3 animate-fade-in">
          <p className="text-xs text-gray-500 mb-2">Task Logs</p>
          <ul className="space-y-1">
            {task.logs.map((log, i) => (
              <li key={i} className="text-xs text-gray-400 font-mono">
                › {log}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

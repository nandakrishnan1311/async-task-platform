import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../api/axios";
import CreateTaskForm from "../components/CreateTaskForm";
import TaskCard from "../components/TaskCard";
import toast from "react-hot-toast";

const FILTERS = ["all", "pending", "running", "success", "failed"];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchTasks = async () => {
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const res = await api.get("/tasks", { params });
      setTasks(res.data.tasks);
    } catch (err) {
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const handleTaskCreated = (newTask) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleTaskDeleted = (taskId) => {
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    running: tasks.filter((t) => t.status === "running").length,
    success: tasks.filter((t) => t.status === "success").length,
    failed: tasks.filter((t) => t.status === "failed").length,
  };

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-bold text-white">TaskFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">👋 {user?.username}</span>
            <button onClick={logout} className="btn-secondary text-sm py-1.5 px-3">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total, color: "text-white" },
            { label: "Running", value: stats.running, color: "text-blue-400" },
            { label: "Success", value: stats.success, color: "text-green-400" },
            { label: "Failed", value: stats.failed, color: "text-red-400" },
          ].map((stat) => (
            <div key={stat.label} className="card py-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Task */}
          <div className="lg:col-span-1">
            <CreateTaskForm onTaskCreated={handleTaskCreated} />
          </div>

          {/* Task List */}
          <div className="lg:col-span-2">
            {/* Filter tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                    filter === f
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="card text-center py-16">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-gray-400">No tasks yet. Create one!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onDelete={handleTaskDeleted}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

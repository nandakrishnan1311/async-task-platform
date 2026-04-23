import { useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";

const OPERATIONS = [
  { value: "uppercase", label: "🔠 Uppercase", desc: "hello → HELLO" },
  { value: "lowercase", label: "🔡 Lowercase", desc: "HELLO → hello" },
  { value: "reverse", label: "🔄 Reverse", desc: "hello → olleh" },
  { value: "word_count", label: "🔢 Word Count", desc: "hello world → 2" },
];

export default function CreateTaskForm({ onTaskCreated }) {
  const [form, setForm] = useState({ title: "", inputText: "", operation: "uppercase" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.inputText.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/tasks", form);
      toast.success("Task queued successfully!");
      setForm({ title: "", inputText: "", operation: "uppercase" });
      onTaskCreated(res.data.task);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>⚡</span> New Task
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Task Title</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Convert my text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Input Text</label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Enter text to process..."
            value={form.inputText}
            onChange={(e) => setForm({ ...form, inputText: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Operation</label>
          <div className="grid grid-cols-2 gap-2">
            {OPERATIONS.map((op) => (
              <button
                key={op.value}
                type="button"
                onClick={() => setForm({ ...form, operation: op.value })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  form.operation === op.value
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                <div className="text-sm font-medium">{op.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{op.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
              Queuing Task...
            </span>
          ) : "Run Task →"}
        </button>
      </form>
    </div>
  );
}

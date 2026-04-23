export default function StatusBadge({ status }) {
  const config = {
    pending: {
      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      icon: "🟡",
      label: "Pending",
      animate: "animate-pulse",
    },
    running: {
      color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      icon: "🔵",
      label: "Running",
      animate: "animate-pulse",
    },
    success: {
      color: "bg-green-500/20 text-green-400 border-green-500/30",
      icon: "✅",
      label: "Success",
      animate: "",
    },
    failed: {
      color: "bg-red-500/20 text-red-400 border-red-500/30",
      icon: "❌",
      label: "Failed",
      animate: "",
    },
  };

  const s = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.color} ${s.animate}`}
    >
      <span>{s.icon}</span>
      {s.label}
    </span>
  );
}

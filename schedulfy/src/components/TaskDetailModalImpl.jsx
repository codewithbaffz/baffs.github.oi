// React import removed (automatic JSX runtime)

export default function TaskDetailModal({ task, onClose }) {
  if (!task) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2">{task.title}</h3>
        <p className="text-sm text-muted-foreground">{task.description}</p>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-3 py-1 rounded bg-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

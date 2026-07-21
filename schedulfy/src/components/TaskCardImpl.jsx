// React import removed (automatic JSX runtime)

export default function TaskCard({ task, compact, onUpdate: _onUpdate }) {
  return (
    <div className={`p-3 rounded-lg border bg-white/50 ${compact ? 'text-sm' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{task?.title || 'Untitled task'}</div>
          {task?.due_date && (
            <div className="text-xs text-muted-foreground">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{task?.status || ''}</div>
      </div>
    </div>
  );
}

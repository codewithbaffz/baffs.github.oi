import { useState } from 'react';

export default function NLPTaskInput({ onTaskCreated }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      // Fallback behavior: create a minimal task object
      const newTask = {
        id: `local-${Date.now()}`,
        title: text.trim(),
        status: 'todo',
        due_date: null,
        created_date: new Date().toISOString(),
      };
      onTaskCreated?.(newTask);
      setText('');
    } catch (e) {
      console.error('Failed to create task:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-start gap-3">
      <textarea
        className="flex-1 p-3 rounded-lg border border-border resize-none"
        placeholder="Describe a task in plain English..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />
      <div className="flex flex-col gap-2">
        <button
          className="px-4 py-2 rounded bg-primary text-white"
          onClick={submit}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  );
}

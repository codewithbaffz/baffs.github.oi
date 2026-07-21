import { useState } from 'react';
import { format } from 'date-fns'; // ✅ Added this import
import { Plus, Search, Sparkles, Loader2 } from 'lucide-react';
import TaskCard from '@/components/TaskCard';
import NLPTaskInput from '@/components/NLPTaskInput';
import TaskDetailModal from '@/components/TaskDetailModal';
import { useTasks } from '@/context/TaskContext';
import { useEvents } from '@/context/EventContext';

// ✅ Added SOURCE_COLOR for event styling
const SOURCE_COLOR = {
  manual: 'bg-primary/20 border-primary/40 text-primary',
  google: 'bg-green-400/20 border-green-400/40 text-green-400',
  zoom: 'bg-blue-400/20 border-blue-400/40 text-blue-400',
  schedulfy: 'bg-cyan/20 border-cyan/40 text-cyan',
  task: 'bg-orange-400/20 border-orange-400/40 text-orange-400',
};

const FILTERS = ['all', 'todo', 'in_progress', 'done', 'overdue', 'snoozed'];
const PRIORITIES = ['all', 'urgent', 'high', 'medium', 'low'];

export default function Tasks() {
  // Use the global task context instead of local state
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  
  // ✅ Moved this to the top with other hooks - CORRECT
  const { events } = useEvents(); // Use the global event context
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showNLP, setShowNLP] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Manual task form state
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const createManual = async () => {
    if (!form.title.trim()) return;

    setSaving(true);
    try {
      const created = await createTask({
        title: form.title,
        description: form.description,
        priority: form.priority,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        status: 'todo',
        source: 'manual',
      });

      if (created) {
        setForm({ title: '', description: '', priority: 'medium', due_date: '', tags: '' });
        setShowManual(false);
      }
    } catch (err) {
      setError(err.message || 'Unable to create task');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTask = async (updatedTask) => {
    try {
      const taskId = updatedTask.id || updatedTask._id || updatedTask.task_id;
      await updateTask(taskId, updatedTask);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await deleteTask(id);
      setSelectedTask(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.description || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const getTaskKey = (task, index) => {
    return task.id || task._id || task.task_id || `task-${index}`;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide">TASKS</h1>
          <p className="text-muted-foreground text-sm mt-1">{tasks.length} total · {tasks.filter(t => t.status === 'done').length} completed</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowNLP(!showNLP); setShowManual(false); }}
            className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-all"
          >
            <Sparkles className="w-4 h-4 text-cyan" /> AI Input
          </button>
          <button
            onClick={() => { setShowManual(!showManual); setShowNLP(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* NLP Input */}
      {showNLP && (
        <div className="glass rounded-xl p-4 animate-fade-in">
          <NLPTaskInput 
            onTaskCreated={async (task) => {
              try {
                const created = await createTask({
                  ...task,
                  status: task.status || 'todo',
                  source: task.source || 'manual',
                });
                if (created) {
                  setShowNLP(false);
                }
              } catch (err) {
                setError(err.message || 'Failed to create task');
              }
            }} 
          />
        </div>
      )}

      {/* Manual Form */}
      {showManual && (
        <div className="glass rounded-xl p-5 border border-border animate-fade-in space-y-4">
          <h3 className="font-heading text-base font-bold tracking-wide">NEW TASK</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <input
                placeholder="Task title *"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="md:col-span-2">
              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <select
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <input
                placeholder="Tags (comma-separated)"
                value={form.tags}
                onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={createManual} disabled={saving || !form.title.trim()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Creating...' : 'Create Task'}
            </button>
            <button onClick={() => setShowManual(false)} className="px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-secondary/60 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 w-56"
          />
        </div>
        <div className="flex items-center gap-1 bg-secondary/60 border border-border rounded-lg p-1">
          {['all', 'todo', 'in_progress', 'done', 'overdue'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
        >
          {PRIORITIES.map(p => (
            <option key={p} value={p}>
              {p === 'all' ? 'All Priorities' : p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground font-medium">No tasks found</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Create your first task to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task, index) => {
            const key = getTaskKey(task, index);
            return (
              <TaskCard
                key={key}
                task={task}
                onClick={setSelectedTask}
                onUpdate={handleUpdateTask}
              />
            );
          })}
        </div>
      )}

      {/* Events Section - This now works correctly */}
      {events && events.length > 0 && (
        <div className="mt-6">
          <h3 className="font-heading text-sm font-bold tracking-wider text-muted-foreground mb-3">
            EVENTS
          </h3>
          <div className="space-y-2">
            {events
              .filter(e => e.start_time && new Date(e.start_time) >= new Date())
              .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
              .slice(0, 5)
              .map(event => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/40 hover:bg-secondary/30 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.start_time), 'MMM d, h:mma')} –{' '}
                      {format(new Date(event.end_time), 'h:mma')}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_COLOR[event.source] || SOURCE_COLOR.manual}`}>
                    {event.source || 'manual'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={async (t) => {
            try {
              const taskId = t.id || t._id || t.task_id;
              await updateTask(taskId, t);
              setSelectedTask(t);
            } catch (err) {
              console.error('Failed to update task:', err);
            }
          }}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}
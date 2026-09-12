import { useState, useEffect } from 'react';
import { useTasks } from '@/context/TaskContext';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Sparkles, Plus, Loader2, Search } from 'lucide-react';

import TaskCard from '@/components/TaskCard';
import NLPTaskInput from '@/components/NLPTaskInput';

const FILTERS = ['all', 'todo', 'in_progress', 'done', 'overdue', 'snoozed'];
const PRIORITIES = ['all', 'urgent', 'high', 'medium', 'low'];

export default function Tasks() {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showNLP, setShowNLP] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);

  // Manual task form state
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '', tags: '', assignee_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadWorkspace = async () => {
      if (!currentWorkspace) {
        setWorkspace(null);
        setMembers([]);
        return;
      }
      const token = localStorage.getItem('authToken');
      const workspaceId = currentWorkspace.id || currentWorkspace._id;
      const detailsResponse = await fetch(`/api/workspace/${workspaceId}`, { headers: { Authorization: `Bearer ${token}` } });
      const details = detailsResponse.ok ? await detailsResponse.json() : currentWorkspace;
      setWorkspace(details);
      setMembers(details.members || []);
    };
    if (user) loadWorkspace().catch((error) => console.error('Failed to load workspace members:', error));
  }, [currentWorkspace, user]);

  const createManual = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const task = await createTask({
        title: form.title,
        description: form.description,
        priority: form.priority,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        status: 'todo',
        source: 'manual',
        workspace_id: workspace?._id || workspace?.id,
        assignee_id: form.assignee_id || null,
      });
      setForm({ title: '', description: '', priority: 'medium', due_date: '', tags: '', assignee_id: '' });
      setShowManual(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
    setSaving(false);
  };

  const handleDeleteTask = async (id) => {
    await deleteTask(id);
    setSelectedTask(null);
  };

  const workspaceId = workspace?._id || workspace?.id;
  const visibleTasks = tasks.filter((task) => !task.workspace_id || String(task.workspace_id) === String(workspaceId));
  const filtered = visibleTasks.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.description || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-foreground">TASKS</h1>
          <p className="text-muted-foreground text-sm mt-1">{visibleTasks.length} total · {visibleTasks.filter(t => t.status === 'done').length} completed</p>
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
          <NLPTaskInput onTaskCreated={(task) => { setShowNLP(false); }} />
        </div>
      )}

      {/* Manual Form */}
      {showManual && (
        <div className="glass rounded-xl p-5 border border-border animate-fade-in space-y-4">
          <h3 className="font-heading text-base font-bold tracking-wide text-foreground">NEW TASK</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <input
                placeholder="Task title *"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            {members.length > 0 && (
              <div className="md:col-span-2">
                <select
                  value={form.assignee_id}
                  onChange={e => setForm(p => ({ ...p, assignee_id: e.target.value }))}
                  className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="">Unassigned</option>
                  {members.map(member => <option key={member._id || member.id} value={member._id || member.id}>{member.name || member.full_name || member.email}</option>)}
                </select>
              </div>
            )}
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
            <div className="md:col-span-2">
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
          {FILTERS.map(s => (
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
          {PRIORITIES.map(p => <option key={p} value={p}>{p === 'all' ? 'All Priorities' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
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
          {filtered.map(task => (
            <TaskCard
              key={task.id || task._id}
              task={task}
              onClick={() => setSelectedTask(task)}
              onUpdate={updateTask}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
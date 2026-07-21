import { useState, useEffect } from 'react';
import { schedulfy } from '@/api/schedulfyClient';
import { X, Clock, Tag, Pencil, Trash2, Check, Loader2, MessageSquare, Send, Paperclip, Timer, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

const PRIORITY_COLOR = {
  low: 'text-green-400 bg-green-400/10 border-green-400/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  urgent: 'text-destructive bg-destructive/10 border-destructive/20',
};

const STATUS_LABEL = { todo: 'To Do', in_progress: 'In Progress', done: 'Done', overdue: 'Overdue', snoozed: 'Snoozed' };

export default function TaskDetailModal({ task: initialTask, onClose, onUpdate, onDelete }) {
  const [task, setTask] = useState(initialTask);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: task.title, description: task.description || '', priority: task.priority, status: task.status, due_date: task.due_date ? task.due_date.slice(0, 16) : '' });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadComments();
    schedulfy.auth.me().then(setUser);
  }, []);

  const loadComments = async () => {
    const data = await schedulfy.entities.Comment.filter({ task_id: task.id }, 'created_date', 50);
    setComments(data);
  };

  const saveEdit = async () => {
    setSaving(true);
    const updated = await schedulfy.entities.Task.update(task.id, {
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
    });
    setTask(updated);
    onUpdate?.(updated);
    setEditing(false);
    setSaving(false);
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    const comment = await schedulfy.entities.Comment.create({
      task_id: task.id,
      author_id: user?.id,
      author_name: user?.full_name || 'You',
      content: newComment,
      mentions: (newComment.match(/@\w+/g) || []),
    });
    setComments(prev => [...prev, comment]);
    setNewComment('');
    setSendingComment(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    setDeleting(true);
    await onDelete?.(task.id);
    setDeleting(false);
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-card border-l border-border flex flex-col overflow-hidden shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {task.is_ai_generated && <span className="text-xs text-cyan flex items-center gap-1"><Zap className="w-3 h-3" /> AI</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium}`}>
              {task.priority}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(!editing)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={handleDelete} disabled={deleting} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin text-destructive" /> : <Trash2 className="w-4 h-4 text-destructive" />}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
          {/* Title & Description */}
          {editing ? (
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-base font-semibold text-foreground focus:outline-none focus:border-primary/50" />
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3} placeholder="Description..."
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-primary/50" />
              <div className="grid grid-cols-3 gap-2">
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50">
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  className="bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50">
                  {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input type="datetime-local" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                </button>
                <button onClick={() => setEditing(false)} className="px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all">Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start gap-2">
                {task.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground mt-0.5 shrink-0" />}
                <h2 className={`text-xl font-semibold font-heading tracking-wide ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</h2>
              </div>
              {task.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{task.description}</p>}
            </div>
          )}

          {/* Meta */}
          {!editing && (
            <div className="space-y-2.5">
              {task.due_date && (
                <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-destructive' : isDueToday ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                  {isOverdue && <AlertTriangle className="w-4 h-4" />}
                  <Clock className="w-4 h-4" />
                  <span>{format(new Date(task.due_date), 'EEEE, MMMM d yyyy · h:mma')}</span>
                </div>
              )}
              {task.tags && task.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  {task.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full">{tag}</span>
                  ))}
                </div>
              )}
              {task.source && task.source !== 'manual' && (
                <div className="text-xs text-muted-foreground/60">Source: {task.source}</div>
              )}
            </div>
          )}

          {/* Comments */}
          <div>
            <h3 className="font-heading text-sm font-bold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> COMMENTS ({comments.length})
            </h3>
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs text-primary font-bold">{(c.author_name || 'U')[0]}</span>
                  </div>
                  <div className="flex-1 bg-secondary/40 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">{c.author_name}</span>
                      <span className="text-xs text-muted-foreground/60">{format(new Date(c.created_date), 'MMM d, h:mma')}</span>
                    </div>
                    <p className="text-sm text-foreground/80">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comment Input */}
        <div className="px-6 py-4 border-t border-border shrink-0">
          <div className="flex gap-2">
            <input
              placeholder="Add a comment... use @name to mention"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendComment()}
              className="flex-1 bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <button onClick={sendComment} disabled={sendingComment || !newComment.trim()}
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all">
              {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  X, Clock, Tag, Pencil, Trash2, Check, Loader2, 
  MessageSquare, Send, Paperclip, Timer, Zap, 
  AlertTriangle, CheckCircle2, Users, UserPlus,
  UserCheck, Crown, Mail, User
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

const PRIORITY_COLOR = {
  low: 'text-green-400 bg-green-400/10 border-green-400/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  urgent: 'text-destructive bg-destructive/10 border-destructive/20',
};

const STATUS_LABEL = { 
  todo: 'To Do', 
  in_progress: 'In Progress', 
  done: 'Done', 
  overdue: 'Overdue', 
  snoozed: 'Snoozed' 
};

export default function TaskDetailModal({ task: initialTask, onClose, onUpdate, onDelete }) {
  const [task, setTask] = useState(initialTask);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ 
    title: task.title, 
    description: task.description || '', 
    priority: task.priority, 
    status: task.status, 
    due_date: task.due_date ? task.due_date.slice(0, 16) : '',
    assignee_id: task.assignee_id || '',
  });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [user, setUser] = useState(null);
  
  // Team members state
  const [members, setMembers] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current user
      const u = await base44.auth.me();
      setUser(u);

      // Load comments
      await loadComments();

      // Load workspace and members
      await loadWorkspaceMembers(u);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const loadComments = async () => {
    try {
      const data = await base44.entities.Comment.filter({ task_id: task.id }, 'created_date', 50);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const loadWorkspaceMembers = async (user) => {
    setLoadingMembers(true);
    try {
      // Get workspace
      const workspaces = await base44.entities.Workspace.filter({ admin_id: user.id }, '-created_date', 1);
      let ws = workspaces[0];
      
      if (!ws) {
        const memberWs = await base44.entities.Workspace.list('-created_date', 1);
        ws = memberWs.find(w => w.member_ids && w.member_ids.includes(user.id));
      }

      if (ws) {
        setWorkspace(ws);
        // Get all users
        const allUsers = await base44.entities.User.list();
        const wsMembers = allUsers.filter(usr =>
          usr.id === ws.admin_id || (ws.member_ids && ws.member_ids.includes(usr.id))
        );
        setMembers(wsMembers);
      }
    } catch (err) {
      console.error('Failed to load workspace members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Task.update(task.id, {
        title: form.title,
        description: form.description,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        assignee_id: form.assignee_id || null,
      });
      setTask(updated);
      onUpdate?.(updated);
      setEditing(false);
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setSaving(false);
    }
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      const comment = await base44.entities.Comment.create({
        task_id: task.id,
        author_id: user?.id,
        author_name: user?.full_name || 'You',
        content: newComment,
        mentions: (newComment.match(/@\w+/g) || []),
      });
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to send comment:', err);
    } finally {
      setSendingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    setDeleting(true);
    await onDelete?.(task.id);
    setDeleting(false);
  };

  const assignMember = async (memberId) => {
    setAssigning(true);
    try {
      const updated = await base44.entities.Task.update(task.id, {
        assignee_id: memberId,
      });
      setTask(updated);
      setForm(prev => ({ ...prev, assignee_id: memberId }));
      onUpdate?.(updated);
      setShowAssign(false);
    } catch (err) {
      console.error('Failed to assign member:', err);
    } finally {
      setAssigning(false);
    }
  };

  const unassignMember = async () => {
    setAssigning(true);
    try {
      const updated = await base44.entities.Task.update(task.id, {
        assignee_id: null,
      });
      setTask(updated);
      setForm(prev => ({ ...prev, assignee_id: '' }));
      onUpdate?.(updated);
    } catch (err) {
      console.error('Failed to unassign member:', err);
    } finally {
      setAssigning(false);
    }
  };

  const getAssigneeName = (id) => {
    const member = members.find(m => m.id === id);
    return member?.full_name || member?.email || 'Unknown';
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  // Get current assignee
  const currentAssignee = task.assignee_id ? members.find(m => m.id === task.assignee_id) : null;

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
            {task.status === 'done' && (
              <span className="text-xs px-2 py-0.5 rounded-full border bg-green-400/10 border-green-400/20 text-green-400">
                Done
              </span>
            )}
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
              
              {/* Assignee dropdown in edit mode */}
              <div>
                <label className="text-xs text-muted-foreground font-medium">Assign to</label>
                <select 
                  value={form.assignee_id} 
                  onChange={e => setForm(p => ({ ...p, assignee_id: e.target.value }))}
                  className="w-full mt-1 bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="">Unassigned</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.email}
                      {member.id === workspace?.admin_id ? ' (Admin)' : ''}
                    </option>
                  ))}
                </select>
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

          {/* Assigned To - Non-edit mode */}
          {!editing && (
            <div className="glass rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned to</p>
                    {currentAssignee ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{currentAssignee.full_name || currentAssignee.email}</span>
                        {currentAssignee.id === workspace?.admin_id && (
                          <Crown className="w-3 h-3 text-yellow-400" />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Unassigned</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!showAssign && (
                    <button 
                      onClick={() => setShowAssign(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary/60 border border-border rounded-lg hover:bg-secondary transition-colors"
                    >
                      <UserPlus className="w-3 h-3" />
                      Assign
                    </button>
                  )}
                  {currentAssignee && (
                    <button 
                      onClick={unassignMember}
                      disabled={assigning}
                      className="text-xs text-destructive hover:underline"
                    >
                      {assigning ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Remove'}
                    </button>
                  )}
                </div>
              </div>

              {/* Assign dropdown */}
              {showAssign && (
                <div className="mt-3 animate-fade-in">
                  <div className="space-y-1">
                    {members.map(member => {
                      const isAssigned = task.assignee_id === member.id;
                      return (
                        <button
                          key={member.id}
                          onClick={() => assignMember(member.id)}
                          disabled={assigning}
                          className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-left
                            ${isAssigned ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary/60'}
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
                                {(member.full_name || member.email || '?')[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{member.full_name || member.email}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          {isAssigned && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => setShowAssign(false)}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              )}
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
              {comments.map(c => {
                // Check if comment has mentions
                const hasMentions = c.mentions && c.mentions.length > 0;
                return (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs text-primary font-bold">{(c.author_name || 'U')[0]}</span>
                    </div>
                    <div className="flex-1 bg-secondary/40 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{c.author_name}</span>
                        <span className="text-xs text-muted-foreground/60">{format(new Date(c.created_date), 'MMM d, h:mma')}</span>
                      </div>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                        {c.content}
                        {hasMentions && (
                          <span className="text-xs text-primary ml-2">
                            → {c.mentions.map(m => `@${m}`).join(' ')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
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
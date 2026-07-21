import { useState } from 'react';
import { Users, Plus, Crown, UserCheck, Mail, Loader2, Send, UserPlus, Briefcase, CheckSquare, Clock } from 'lucide-react';

// Demo data
const DEMO_WORKSPACE = {
  id: '1',
  name: 'Schedulfy Team',
  description: 'Main product development workspace',
  admin_id: 'user1',
  invite_code: 'SCHD42',
  member_ids: ['user1', 'user2', 'user3', 'user4'],
};

const DEMO_MEMBERS = [
  { id: 'user1', full_name: 'Alex Johnson', email: 'alex@schedulfy.com' },
  { id: 'user2', full_name: 'Sarah Chen', email: 'sarah@schedulfy.com' },
  { id: 'user3', full_name: 'Mike Rivera', email: 'mike@schedulfy.com' },
  { id: 'user4', full_name: 'Emma Williams', email: 'emma@schedulfy.com' },
];

const DEMO_TASKS = [
  { id: '1', title: 'Design system update', status: 'done', assignee_id: 'user1', created_by_id: 'user1' },
  { id: '2', title: 'API integration', status: 'in_progress', assignee_id: 'user2', created_by_id: 'user2' },
  { id: '3', title: 'User testing', status: 'done', assignee_id: 'user3', created_by_id: 'user1' },
  { id: '4', title: 'Documentation', status: 'done', assignee_id: 'user4', created_by_id: 'user4' },
  { id: '5', title: 'Bug fixes', status: 'todo', assignee_id: 'user2', created_by_id: 'user1' },
  { id: '6', title: 'Performance optimization', status: 'in_progress', assignee_id: 'user3', created_by_id: 'user3' },
  { id: '7', title: 'Mobile responsive', status: 'done', assignee_id: 'user1', created_by_id: 'user1' },
  { id: '8', title: 'Newsletter setup', status: 'todo', assignee_id: 'user4', created_by_id: 'user4' },
  { id: '9', title: 'Code review', status: 'done', assignee_id: 'user2', created_by_id: 'user1' },
  { id: '10', title: 'Deploy staging', status: 'in_progress', assignee_id: 'user3', created_by_id: 'user3' },
];

export default function Team() {
  const [workspace, setWorkspace] = useState(DEMO_WORKSPACE);
  const [members, setMembers] = useState(DEMO_MEMBERS);
  const [tasks, setTasks] = useState(DEMO_TASKS);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [wsForm, setWsForm] = useState({ name: '', description: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [user, setUser] = useState({ id: 'user1', full_name: 'Prince Baffs' });

  const createWorkspace = () => {
    if (!wsForm.name.trim()) return;
    setSaving(true);
    const newWs = {
      id: Date.now().toString(),
      name: wsForm.name,
      description: wsForm.description,
      admin_id: user.id,
      member_ids: [user.id],
      invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
    };
    setWorkspace(newWs);
    setShowCreate(false);
    setSaving(false);
  };

  const inviteMember = () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setTimeout(() => {
      const newMember = {
        id: Date.now().toString(),
        full_name: inviteEmail.split('@')[0],
        email: inviteEmail,
      };
      setMembers(prev => [...prev, newMember]);
      setInviteEmail('');
      setShowInvite(false);
      setInviting(false);
    }, 500);
  };

  const getMemberTaskCount = (userId) => tasks.filter(t => t.assignee_id === userId || t.created_by_id === userId).length;
  const getMemberCompletedCount = (userId) => tasks.filter(t => (t.assignee_id === userId || t.created_by_id === userId) && t.status === 'done').length;

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!workspace) return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10 text-primary" />
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-wide mb-2">CREATE YOUR WORKSPACE</h1>
        <p className="text-muted-foreground mb-8">Build a collaborative space for your team</p>
        {!showCreate ? (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all mx-auto">
            <Plus className="w-5 h-5" /> Create Workspace
          </button>
        ) : (
          <div className="glass rounded-xl p-6 text-left space-y-4 max-w-sm mx-auto">
            <input placeholder="Workspace name *" value={wsForm.name} onChange={e => setWsForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50" />
            <textarea placeholder="Description (optional)" value={wsForm.description} onChange={e => setWsForm(p => ({ ...p, description: e.target.value }))} rows={2}
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-primary/50" />
            <button onClick={createWorkspace} disabled={saving || !wsForm.name.trim()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all w-full justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Workspace Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-wide">{workspace.name}</h1>
              {workspace.description && <p className="text-muted-foreground text-sm">{workspace.description}</p>}
            </div>
          </div>
          {workspace.invite_code && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Invite code:</span>
              <code className="text-xs bg-secondary/60 border border-border rounded px-2 py-0.5 text-primary font-mono">{workspace.invite_code}</code>
            </div>
          )}
        </div>
        <button onClick={() => setShowInvite(!showInvite)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all">
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {showInvite && (
        <div className="glass rounded-xl p-4 border border-primary/20 animate-fade-in">
          <h3 className="font-heading text-sm font-bold tracking-wider mb-3">INVITE BY EMAIL</h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="colleague@email.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-secondary/60 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <button onClick={inviteMember} disabled={inviting || !inviteEmail.trim()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Members', value: members.length, icon: Users, color: 'text-primary' },
          { label: 'Total Tasks', value: tasks.length, icon: CheckSquare, color: 'text-cyan' },
          { label: 'Completed', value: tasks.filter(t => t.status === 'done').length, icon: UserCheck, color: 'text-green-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className={`text-2xl font-heading font-bold ${color}`}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Members Grid */}
      <div>
        <h2 className="font-heading text-lg font-bold tracking-wide mb-4">TEAM MEMBERS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(member => {
            const isAdmin = member.id === workspace.admin_id;
            const taskCount = getMemberTaskCount(member.id);
            const completed = getMemberCompletedCount(member.id);
            const rate = taskCount > 0 ? Math.round((completed / taskCount) * 100) : 0;
            return (
              <div key={member.id} className="glass rounded-xl p-5 border border-border hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{(member.full_name || member.email || '?')[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{member.full_name || 'Team Member'}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/20 rounded-full">
                      <Crown className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs text-yellow-400">Admin</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" /> {completed}/{taskCount} tasks</span>
                    <span>{rate}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-cyan rounded-full" style={{ width: `${rate}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
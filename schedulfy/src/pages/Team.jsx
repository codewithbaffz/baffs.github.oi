import { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  CheckSquare, 
  Briefcase,
  UserPlus,
  Crown,
  Plus,
  Mail,
  Send,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  MessageSquare,
  Video,
  ExternalLink,
  CalendarClock,
  Copy,
  Reply,
  ListChecks
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useTasks } from '@/context/TaskContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { API_BASE } from '@/lib/sdk';

// Demo data - fallback if no data
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

export default function Team() {
  const { user, isAuthenticated } = useAuth();
  const { currentWorkspace, fetchWorkspaces: refreshWorkspaceList, selectWorkspace } = useWorkspace();
  const [workspace, setWorkspace] = useState(DEMO_WORKSPACE);
  const [members, setMembers] = useState(DEMO_MEMBERS);
  const { tasks } = useTasks();
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [wsForm, setWsForm] = useState({ name: '', description: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [visibility, setVisibility] = useState({ tasks: true, projects: true, members: true });
  const [updatingMember, setUpdatingMember] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [meetingForm, setMeetingForm] = useState({ title: '', starts_at: '', duration_minutes: 30 });
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);

  // Fetch workspace on mount
  useEffect(() => {
    if (isAuthenticated && user && currentWorkspace) fetchWorkspaces();
  }, [currentWorkspace, isAuthenticated, user]);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE}/workspace`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const workspaceData = data.find((item) => String(item.id || item._id) === String(currentWorkspace?.id || currentWorkspace?._id));
          if (!workspaceData) return;
          const detailsResponse = await fetch(`${API_BASE}/workspace/${workspaceData.id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const details = detailsResponse.ok ? await detailsResponse.json() : workspaceData;
          setWorkspace(details);
          setVisibility({
            tasks: details.visibility?.tasks !== false,
            projects: details.visibility?.projects !== false,
            members: details.visibility?.members !== false,
          });
          if (details.members) {
            setMembers(details.members.map((member) => ({
              ...member,
              id: member._id || member.id,
              full_name: member.full_name || member.name,
            })));
          }
          const [messagesResponse, meetingsResponse] = await Promise.all([
            fetch(`${API_BASE}/workspace/${workspaceData.id}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_BASE}/workspace/${workspaceData.id}/meetings`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (messagesResponse.ok) setMessages(await messagesResponse.json());
          if (meetingsResponse.ok) setMeetings(await meetingsResponse.json());
        }
      }
    } catch (_error) {
      console.error('Error fetching workspaces:', _error);
    } finally {
      setLoading(false);
    }
  };

  const currentUserId = user?._id || user?.id;
  const isWorkspaceAdmin = workspace?.admin_id === currentUserId;
  const sharedTasks = tasks.filter((task) => String(task.workspace_id) === String(workspace?.id));

  const updateVisibility = async (key) => {
    if (!isWorkspaceAdmin) return;
    const nextValue = !visibility[key];
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/workspace/${workspace.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [key]: nextValue }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update workspace visibility');
      setVisibility((current) => ({ ...current, [key]: nextValue }));
    } catch (error) {
      setInviteMessage(error.message);
      setInviteSuccess(false);
    }
  };

  const removeMember = async (memberId) => {
    if (!isWorkspaceAdmin || !window.confirm('Remove this member from the workspace?')) return;
    setUpdatingMember(memberId);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/workspace/${workspace.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to remove member');
      setMembers((current) => current.filter((member) => member.id !== memberId));
    } catch (error) {
      setInviteMessage(error.message);
      setInviteSuccess(false);
    } finally {
      setUpdatingMember(null);
    }
  };

  const leaveWorkspace = async () => {
    if (isWorkspaceAdmin || !window.confirm('Leave this workspace?')) return;
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/workspace/${workspace.id}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to leave workspace');
      setWorkspace(null);
      setMembers([]);
    } catch (error) {
      setInviteMessage(error.message);
      setInviteSuccess(false);
    }
  };

  const createWorkspace = async () => {
    if (!wsForm.name.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE}/workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: wsForm.name,
          description: wsForm.description,
        }),
      });

      if (response.ok) {
        const newWs = await response.json();
        const newWorkspaceId = newWs.id || newWs._id;
        await refreshWorkspaceList();
        selectWorkspace(newWorkspaceId);
        setShowCreate(false);
        setWsForm({ name: '', description: '' });
      } else {
        throw new Error('Failed to create workspace');
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
      alert('Failed to create workspace. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !workspace?.id) return;
    setSendingMessage(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/workspace/${workspace.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: messageText, reply_to: replyingTo?.id || replyingTo?._id || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send message');
      setMessages((current) => [...current, data]);
      setMessageText('');
      setReplyingTo(null);
    } catch (error) {
      setInviteMessage(error.message);
      setInviteSuccess(false);
    } finally {
      setSendingMessage(false);
    }
  };

  const copyMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message.message);
      setInviteMessage('Message copied to clipboard.');
      setInviteSuccess(true);
    } catch (_error) {
      setInviteMessage('Unable to copy this message.');
      setInviteSuccess(false);
    }
  };

  const toggleMessageSelection = (messageId) => {
    setSelectedMessages((current) => current.includes(messageId)
      ? current.filter((id) => id !== messageId)
      : [...current, messageId]);
  };

  const deleteMessages = async (messageIds) => {
    if (!messageIds.length || !workspace?.id) return;
    try {
      const token = localStorage.getItem('authToken');
      const results = await Promise.all(messageIds.map(async (messageId) => {
        const response = await fetch(`${API_BASE}/workspace/${workspace.id}/messages/${messageId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to delete message');
        return messageId;
      }));
      setMessages((current) => current.filter((message) => !results.includes(message.id || message._id)));
      setSelectedMessages([]);
      setSelectionMode(false);
      setReplyingTo((current) => current && results.includes(current.id || current._id) ? null : current);
    } catch (error) {
      setInviteMessage(error.message);
      setInviteSuccess(false);
    }
  };

  const scheduleMeeting = async () => {
    if (!meetingForm.title.trim() || !meetingForm.starts_at || !workspace?.id) return;
    setSchedulingMeeting(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/workspace/${workspace.id}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(meetingForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to schedule meeting');
      setMeetings((current) => [...current, data].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)));
      setMeetingForm({ title: '', starts_at: '', duration_minutes: 30 });
      window.open(data.zoom_url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setInviteMessage(error.message);
      setInviteSuccess(false);
    } finally {
      setSchedulingMeeting(false);
    }
  };

  // Updated inviteMember function with direct fetch
  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setInviteMessage('Please enter a valid email address');
      setInviteSuccess(false);
      return;
    }

    setInviting(true);
    setInviteMessage('');
    setInviteSuccess(null);

    try {
      // Check if user is authenticated
      if (!isAuthenticated) {
        throw new Error('You must be logged in to invite members');
      }

      // Get token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      console.log(' Sending invitation to:', inviteEmail);
      console.log(' Workspace ID:', workspace.id);

      // Make API call to send invitation
      const response = await fetch(`${API_BASE}/workspace/${workspace.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          email: inviteEmail,
        }),
      });

      console.log(' Response status:', response.status);

      // Parse response
      let data;
      try {
        data = await response.json();
        console.log(' Response data:', data);
      } catch (parseError) {
        console.error(' Failed to parse response:', parseError);
        throw new Error('Server returned an invalid response. Please try again.');
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to send invitation');
      }

      // Success - add member to local state
      const newMember = {
        id: data.memberId || Date.now().toString(),
        full_name: inviteEmail.split('@')[0],
        email: inviteEmail,
        pending: true,
        invited_at: new Date().toISOString(),
      };
      
      setMembers(prev => [...prev, newMember]);
      setInviteEmail('');
      setInviteSuccess(true);
      setInviteMessage(` Invitation sent to ${inviteEmail}! They will receive an email with instructions.`);
      
      // Close invite modal after 3 seconds
      setTimeout(() => {
        setShowInvite(false);
        setInviteMessage('');
        setInviteSuccess(null);
      }, 3000);

    } catch (error) {
      console.error(' Error sending invitation:', error);
      setInviteSuccess(false);
      setInviteMessage(` ${error.message || 'Failed to send invitation. Please try again.'}`);
    } finally {
      setInviting(false);
    }
  };

  // Alternative: Copy invite link function
  const copyInviteLink = async () => {
    const inviteLink = `${window.location.origin}/accept-invite?code=${workspace.invite_code}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteMessage(' Invite link copied to clipboard!');
      setInviteSuccess(true);
      setTimeout(() => {
        setInviteMessage('');
        setInviteSuccess(null);
      }, 3000);
    } catch (error) {
      setInviteMessage('Failed to copy link. Please copy it manually.');
      setInviteSuccess(false);
    }
  };

  const getMemberTaskCount = (userId) => sharedTasks.filter(t => t.assignee_id === userId || String(t.user_id) === String(userId)).length;
  const getMemberCompletedCount = (userId) => sharedTasks.filter(t => (t.assignee_id === userId || String(t.user_id) === String(userId)) && t.status === 'done').length;

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
            <input 
              placeholder="Workspace name *" 
              value={wsForm.name} 
              onChange={e => setWsForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50" 
            />
            <textarea 
              placeholder="Description (optional)" 
              value={wsForm.description} 
              onChange={e => setWsForm(p => ({ ...p, description: e.target.value }))} 
              rows={2}
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-primary/50" 
            />
            <button 
              onClick={createWorkspace} 
              disabled={saving || !wsForm.name.trim()} 
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all w-full justify-center"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 
              {saving ? 'Creating...' : 'Create'}
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
              <button
                onClick={copyInviteLink}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Copy link
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={() => setShowChat(true)}
          className="relative flex items-center gap-2 px-3 py-2 border border-border text-foreground rounded-lg text-sm font-semibold hover:border-primary/50 hover:text-primary transition-all"
          aria-label="Open team chat"
        >
          <MessageSquare className="w-4 h-4" /> Team Chat
          {messages.length > 0 && (
            <span className="min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-primary/15 text-primary text-[11px]">
              {messages.length > 99 ? '99+' : messages.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowCreate((current) => !current)}
          className="flex items-center gap-2 px-3 py-2 border border-primary/40 text-primary rounded-lg text-sm font-semibold hover:bg-primary/10 transition-all"
        >
          <Plus className="w-4 h-4" /> New Workspace
        </button>
        {!isWorkspaceAdmin && (
          <button
            onClick={leaveWorkspace}
            className="flex items-center gap-2 px-3 py-2 border border-border text-muted-foreground rounded-lg text-sm font-semibold hover:text-red-400 hover:border-red-400/40 transition-all"
          >
            <LogOut className="w-4 h-4" /> Leave
          </button>
        )}
        <button 
          onClick={() => setShowInvite(!showInvite)} 
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"
          disabled={!isAuthenticated || !isWorkspaceAdmin}
        >
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
        </div>
      </div>

      {showCreate && (
        <div className="glass rounded-xl p-4 border border-primary/20 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-sm font-bold tracking-wide">CREATE WORKSPACE</h2>
            <button
              onClick={() => setShowCreate(false)}
              className="p-1 hover:bg-secondary/60 rounded-lg transition-colors"
              aria-label="Close create workspace form"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              placeholder="Workspace name *"
              value={wsForm.name}
              onChange={(event) => setWsForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <input
              placeholder="Description (optional)"
              value={wsForm.description}
              onChange={(event) => setWsForm((current) => ({ ...current, description: event.target.value }))}
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <button
              onClick={createWorkspace}
              disabled={saving || !wsForm.name.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {isWorkspaceAdmin && (
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-heading text-sm font-bold tracking-wide">MEMBER ACCESS</h2>
              <p className="text-xs text-muted-foreground mt-1">Control which shared areas members can access. Personal tasks remain private.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[['tasks', 'Shared tasks'], ['projects', 'Shared projects'], ['members', 'Member list']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => updateVisibility(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${visibility[key] ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-muted-foreground bg-secondary/30'}`}
              >
                {visibility[key] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {label}: {visibility[key] ? 'Visible' : 'Hidden'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="glass rounded-xl p-4 border border-primary/20 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-sm font-bold tracking-wider">INVITE BY EMAIL</h3>
            <button
              onClick={() => {
                setShowInvite(false);
                setInviteMessage('');
                setInviteSuccess(null);
                setInviteEmail('');
              }}
              className="p-1 hover:bg-secondary/60 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="colleague@email.com"
                value={inviteEmail}
                onChange={e => {
                  setInviteEmail(e.target.value);
                  setInviteMessage('');
                  setInviteSuccess(null);
                }}
                className="w-full pl-9 pr-4 py-2 bg-secondary/60 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                disabled={inviting}
              />
            </div>
            <button 
              onClick={inviteMember} 
              disabled={inviting || !inviteEmail.trim()} 
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all whitespace-nowrap"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>

          {/* Status Message */}
          {inviteMessage && (
            <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 text-sm ${
              inviteSuccess === true 
                ? 'bg-green-400/10 border border-green-400/20 text-green-400' 
                : inviteSuccess === false 
                ? 'bg-red-400/10 border border-red-400/20 text-red-400'
                : 'bg-primary/10 border border-primary/20 text-primary'
            }`}>
              {inviteSuccess === true ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : inviteSuccess === false ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <Mail className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{inviteMessage}</span>
            </div>
          )}
        </div>
      )}

      <div>
        <section className="glass rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-4 h-4 text-cyan" />
            <div>
              <h2 className="font-heading text-sm font-bold tracking-wide">ZOOM MEETINGS</h2>
              <p className="text-xs text-muted-foreground">Schedule through Zoom outside Schedulfy.</p>
            </div>
          </div>
          <div className="space-y-2">
            <input
              value={meetingForm.title}
              onChange={(event) => setMeetingForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Meeting title"
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <input
                type="datetime-local"
                value={meetingForm.starts_at}
                onChange={(event) => setMeetingForm((current) => ({ ...current, starts_at: event.target.value }))}
                className="min-w-0 bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
              <select
                value={meetingForm.duration_minutes}
                onChange={(event) => setMeetingForm((current) => ({ ...current, duration_minutes: Number(event.target.value) }))}
                className="bg-secondary/60 border border-border rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                {[15, 30, 45, 60, 90].map((duration) => <option key={duration} value={duration}>{duration} min</option>)}
              </select>
            </div>
            <button
              onClick={scheduleMeeting}
              disabled={schedulingMeeting || !meetingForm.title.trim() || !meetingForm.starts_at}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan text-background rounded-lg text-sm font-semibold hover:bg-cyan/90 disabled:opacity-50"
            >
              {schedulingMeeting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
              Schedule on Zoom
            </button>
          </div>
          <div className="mt-4 space-y-2 max-h-36 overflow-y-auto">
            {meetings.map((meeting) => (
              <div key={meeting.id || meeting._id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{meeting.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(meeting.starts_at).toLocaleString()}</p>
                </div>
                <a href={meeting.zoom_url} target="_blank" rel="noreferrer" className="shrink-0 text-primary hover:text-primary/80" aria-label="Open Zoom scheduling">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showChat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="team-chat-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowChat(false);
          }}
        >
          <section className="flex h-[min(680px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 id="team-chat-title" className="font-heading text-lg font-bold tracking-wide">TEAM CHAT</h2>
                  <p className="text-xs text-muted-foreground">{workspace.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setSelectionMode((current) => !current);
                    setSelectedMessages([]);
                  }}
                  className={`rounded-lg p-2 transition-colors ${selectionMode ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                  aria-label="Select messages"
                  title="Select messages"
                >
                  <ListChecks className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowChat(false)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Close team chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>
            {selectionMode && (
              <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-2 text-xs">
                <span className="text-muted-foreground">{selectedMessages.length} selected</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedMessages([])} className="text-muted-foreground hover:text-foreground">Clear selection</button>
                  <button
                    onClick={() => deleteMessages(selectedMessages)}
                    disabled={!selectedMessages.length}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete selected
                  </button>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-3 p-5">
              {messages.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
              ) : messages.map((message) => {
                const messageId = message.id || message._id;
                const repliedMessage = messages.find((item) => String(item.id || item._id) === String(message.reply_to));
                const canDelete = String(message.author_id) === String(currentUserId) || isWorkspaceAdmin;
                return (
                <div key={messageId} className={`rounded-xl border px-4 py-3 ${selectedMessages.includes(messageId) ? 'border-primary bg-primary/10' : 'border-border bg-secondary/40'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary">{message.author_name}</span>
                    <time className="text-[11px] text-muted-foreground">{new Date(message.created_at).toLocaleString()}</time>
                  </div>
                  {repliedMessage && (
                    <div className="mt-2 border-l-2 border-primary/50 pl-2 text-xs text-muted-foreground line-clamp-2">
                      Replying to {repliedMessage.author_name}: {repliedMessage.message}
                    </div>
                  )}
                  <p className="mt-1 break-words text-sm text-foreground">{message.message}</p>
                  <div className="mt-2 flex items-center gap-3">
                    {selectionMode && canDelete && (
                      <label className="flex items-center gap-1 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={selectedMessages.includes(messageId)}
                          onChange={() => toggleMessageSelection(messageId)}
                          className="accent-primary"
                        />
                        Select
                      </label>
                    )}
                    <button onClick={() => setReplyingTo(message)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary" title="Reply">
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </button>
                    <button onClick={() => copyMessage(message)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary" title="Copy message">
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    {canDelete && (
                      <button onClick={() => deleteMessages([messageId])} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400" title="Delete message">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
            <footer className="border-t border-border p-4">
              {replyingTo && (
                <div className="mb-2 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs">
                  <span className="min-w-0 truncate text-muted-foreground">Replying to {replyingTo.author_name}: {replyingTo.message}</span>
                  <button onClick={() => setReplyingTo(null)} className="ml-2 text-muted-foreground hover:text-foreground" aria-label="Cancel reply">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) sendMessage(); }}
                  placeholder="Write a message..."
                  maxLength={2000}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary/50 focus:outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage || !messageText.trim()}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Members', value: members.length, icon: Users, color: 'text-primary' },
          { label: 'Shared Tasks', value: sharedTasks.length, icon: CheckSquare, color: 'text-cyan' },
          { label: 'Completed', value: sharedTasks.filter(t => t.status === 'done').length, icon: UserCheck, color: 'text-green-400' },
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
            const isPending = member.pending;
            const taskCount = getMemberTaskCount(member.id);
            const completed = getMemberCompletedCount(member.id);
            const rate = taskCount > 0 ? Math.round((completed / taskCount) * 100) : 0;
            return (
              <div key={member.id} className={`glass rounded-xl p-5 border transition-all ${
                isPending 
                  ? 'border-yellow-400/30 bg-yellow-400/5' 
                  : 'border-border hover:border-primary/30'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isPending 
                        ? 'bg-yellow-400/20 border border-yellow-400/30' 
                        : 'bg-primary/20 border border-primary/30'
                    }`}>
                      <span className={`text-sm font-bold ${
                        isPending ? 'text-yellow-400' : 'text-primary'
                      }`}>
                        {(member.full_name || member.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {member.full_name || 'Team Member'}
                        {isPending && (
                          <span className="ml-2 text-xs text-yellow-400">(Pending)</span>
                        )}
                      </p>
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
                {!isPending && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" /> {completed}/{taskCount} tasks</span>
                      <span>{rate}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-cyan rounded-full" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                )}
                {isPending && (
                  <p className="text-xs text-yellow-400/70 mt-2"> Awaiting acceptance</p>
                )}
                {!isPending && isWorkspaceAdmin && !isAdmin && (
                  <button
                    onClick={() => removeMember(member.id)}
                    disabled={updatingMember === member.id}
                    className="mt-4 flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    {updatingMember === member.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Remove member
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
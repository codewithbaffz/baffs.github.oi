import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext.jsx';
import { schedulfy } from '@/api/schedulfyClient';
import {
  Bell, Calendar, Mail, Zap, Link as LinkIcon, CheckCircle2, Loader2, Copy,
  Camera, User, Shield, Clock, Settings as SettingsIcon
} from 'lucide-react';

const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Kolkata', 'Africa/Accra', 'Australia/Sydney'];

const ROLE_CONFIG = {
  admin: { label: 'Admin', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  member: { label: 'Member', color: 'text-primary bg-primary/10 border-primary/30' },
};

// Demo user data
const DEMO_USER = {
  id: 'user1',
  full_name: 'Alex Johnson',
  email: 'alex@schedulfy.com',
};

const DEMO_PROFILE = {
  id: 'prof1',
  display_name: 'Alex Johnson',
  bio: 'Product designer & productivity enthusiast',
  avatar_url: '',
  timezone: 'America/New_York',
  peak_hours_start: 9,
  peak_hours_end: 17,
  reminder_1day_enabled: true,
  reminder_1hour_enabled: true,
  google_calendar_connected: false,
  zoom_connected: true,
  email_to_task_address: 'tasks+a1b2c3d4@schedulfy.app',
  role: 'admin',
};

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(DEMO_PROFILE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [adminActionLoading, setAdminActionLoading] = useState(null);

  const [profileForm, setProfileForm] = useState({
    display_name: DEMO_PROFILE.display_name,
    bio: DEMO_PROFILE.bio,
    avatar_url: DEMO_PROFILE.avatar_url,
  });
  const [prefsForm, setPrefsForm] = useState({
    timezone: DEMO_PROFILE.timezone,
    peak_hours_start: DEMO_PROFILE.peak_hours_start,
    peak_hours_end: DEMO_PROFILE.peak_hours_end,
  });
  const [notifForm, setNotifForm] = useState({
    reminder_1day_enabled: DEMO_PROFILE.reminder_1day_enabled,
    reminder_1hour_enabled: DEMO_PROFILE.reminder_1hour_enabled,
  });
  const [integrationsForm, setIntegrationsForm] = useState({
    google_calendar_connected: DEMO_PROFILE.google_calendar_connected,
    zoom_connected: DEMO_PROFILE.zoom_connected,
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    setUsersError('');
    setUsersLoading(true);
    try {
      const data = await schedulfy.users.getAll();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setUsersError(err.message || 'Unable to load users');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const updateUserRole = async (userId, role) => {
    setAdminActionLoading(userId);
    try {
      const updated = await schedulfy.users.update(userId, { role });
      setUsers(prev => prev.map(u => (u.id === userId ? updated : u)));
    } catch (err) {
      setUsersError(err.message || 'Unable to update role');
    } finally {
      setAdminActionLoading(null);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Remove this user?')) return;
    setAdminActionLoading(userId);
    try {
      await schedulfy.users.delete(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      setUsersError(err.message || 'Unable to remove user');
    } finally {
      setAdminActionLoading(null);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    // Simulate upload
    setTimeout(() => {
      const fakeUrl = URL.createObjectURL(file);
      setProfileForm(p => ({ ...p, avatar_url: fakeUrl }));
      setProfile(prev => ({ ...prev, avatar_url: fakeUrl }));
      setUploadingAvatar(false);
    }, 800);
  };

  const saveAll = () => {
    setSaving(true);
    setTimeout(() => {
      const merged = { ...profileForm, ...prefsForm, ...notifForm, ...integrationsForm };
      setProfile(prev => ({ ...prev, ...merged }));
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 600);
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(profile?.email_to_task_address || '');
  };

  const displayName = profileForm.display_name || user?.full_name || user?.email || 'User';
  const initials = displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const role = profile?.role || 'member';
  const roleConf = ROLE_CONFIG[role] || ROLE_CONFIG.member;

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-wide">SETTINGS</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile, preferences, and integrations</p>
      </div>

      {/* PROFILE CARD */}
      <section className="glass rounded-2xl border border-border overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/30 via-primary/10 to-cyan/20" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-8 mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl border-4 border-card bg-primary/20 flex items-center justify-center overflow-hidden shadow-lg">
                {profileForm.avatar_url ? (
                  <img src={profileForm.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary">{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary border-2 border-card flex items-center justify-center hover:bg-primary/80 transition-colors"
              >
                {uploadingAvatar ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <Camera className="w-3 h-3 text-white" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${roleConf.color}`}>
              <Shield className="w-3 h-3 inline mr-1" />{roleConf.label}
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={profileForm.display_name}
                    onChange={e => setProfileForm(p => ({ ...p, display_name: e.target.value }))}
                    placeholder="Your name"
                    className="w-full pl-9 pr-3 py-2 bg-secondary/60 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Email</label>
                <input
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Bio</label>
              <textarea
                value={profileForm.bio}
                onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                placeholder="A short description about yourself…"
                rows={2}
                className="w-full px-3 py-2 bg-secondary/60 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTIVITY PREFERENCES */}
      <section className="glass rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-cyan" />
          </div>
          <h2 className="font-heading text-base font-bold tracking-wide">PRODUCTIVITY</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Timezone</label>
            <select value={prefsForm.timezone} onChange={e => setPrefsForm(p => ({ ...p, timezone: e.target.value }))}
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">
              <Clock className="w-3 h-3 inline mr-1" />Peak Start
            </label>
            <select value={prefsForm.peak_hours_start} onChange={e => setPrefsForm(p => ({ ...p, peak_hours_start: parseInt(e.target.value) }))}
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i - 12}pm`}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">
              <Clock className="w-3 h-3 inline mr-1" />Peak End
            </label>
            <select value={prefsForm.peak_hours_end} onChange={e => setPrefsForm(p => ({ ...p, peak_hours_end: parseInt(e.target.value) }))}
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i - 12}pm`}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* ADMIN PANEL */}
      {user?.role === 'admin' && (
        <section className="glass rounded-2xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-yellow-400" />
            </div>
            <h2 className="font-heading text-base font-bold tracking-wide">ADMIN USER MANAGEMENT</h2>
          </div>
          <p className="text-sm text-muted-foreground">Manage your workspace users, roles, and access. Only admins can see this section.</p>

          {usersError && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{usersError}</div>
          )}

          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {users.length === 0 ? (
                <div className="rounded-xl bg-secondary/30 border border-border p-4 text-sm text-muted-foreground">No users found.</div>
              ) : (
                <div className="grid gap-3">
                  {users.map((member) => {
                    const isSelf = member.id === user.id;
                    const nextRole = member.role === 'admin' ? 'member' : 'admin';
                    return (
                      <div key={member.id} className="glass rounded-2xl border border-border p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <p className="font-semibold text-sm text-foreground">{member.full_name || member.email}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-secondary border-border text-muted-foreground">Role: {member.role}</span>
                            <button
                              disabled={isSelf || adminActionLoading === member.id}
                              onClick={() => updateUserRole(member.id, nextRole)}
                              className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                            >
                              {member.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
                            </button>
                            <button
                              disabled={isSelf || adminActionLoading === member.id}
                              onClick={() => deleteUser(member.id)}
                              className="rounded-lg border border-destructive text-destructive px-3 py-1 text-xs font-semibold hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* NOTIFICATIONS */}
      <section className="glass rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <h2 className="font-heading text-base font-bold tracking-wide">DUE DATE GUARD</h2>
        </div>
        <div className="space-y-3">
          {[
            { key: 'reminder_1day_enabled', label: '24-hour reminder', desc: 'Notify me 1 day before a task is due' },
            { key: 'reminder_1hour_enabled', label: '1-hour reminder', desc: 'Notify me 1 hour before a task is due' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/50">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => setNotifForm(p => ({ ...p, [key]: !p[key] }))}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 ${notifForm[key] ? 'bg-primary' : 'bg-secondary border border-border'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${notifForm[key] ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* EMAIL-TO-TASK */}
      <section className="glass rounded-2xl border border-border p-6 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Mail className="w-3.5 h-3.5 text-primary" />
          </div>
          <h2 className="font-heading text-base font-bold tracking-wide">EMAIL-TO-TASK</h2>
        </div>
        <p className="text-sm text-muted-foreground">Forward emails to your unique Schedulfy address and AI will automatically create tasks from them.</p>
        {profile?.email_to_task_address && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/40 border border-border">
            <code className="text-sm text-cyan font-mono flex-1 truncate">{profile.email_to_task_address}</code>
            <button onClick={copyEmail} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Copy">
              <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        )}
      </section>

      {/* INTEGRATIONS */}
      <section className="glass rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-green-400/10 border border-green-400/20 flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-green-400" />
          </div>
          <h2 className="font-heading text-base font-bold tracking-wide">INTEGRATIONS</h2>
        </div>
        <div className="space-y-2">
          {[
            { key: 'google_calendar_connected', label: 'Google Calendar', desc: 'Two-way sync for conflict detection and time-blocking', icon: '📅' },
            { key: 'zoom_connected', label: 'Zoom', desc: 'Auto-create tasks from upcoming meetings', icon: '🎥' },
          ].map(({ key, label, desc, icon }) => (
            <div key={key} className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
              <button
                onClick={() => setIntegrationsForm(p => ({ ...p, [key]: !p[key] }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${integrationsForm[key] ? 'bg-green-400/10 border border-green-400/20 text-green-400' : 'bg-secondary border border-border text-muted-foreground hover:text-foreground'}`}
              >
                {integrationsForm[key] ? <><CheckCircle2 className="w-3 h-3" /> Connected</> : <><LinkIcon className="w-3 h-3" /> Connect</>}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* SAVE */}
      <div className="flex justify-end pb-6">
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 px-7 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all glow-indigo"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <SettingsIcon className="w-4 h-4" />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
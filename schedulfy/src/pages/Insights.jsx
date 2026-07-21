// src/pages/Insights.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { schedulfySDK } from '@/lib/sdk';
import { Target, Zap, Clock, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, getDay } from 'date-fns';
import InsightChat from '@/components/InsightChat';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['hsl(248 100% 70%)', 'hsl(191 100% 50%)', 'hsl(160 60% 45%)', 'hsl(43 74% 66%)', 'hsl(0 84% 60%)'];

export default function Insights() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [sessions, setFocusSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else if (!isLoadingAuth && !isAuthenticated) {
      setLoading(false);
      setError('Please log in to view insights.');
    }
  }, [isAuthenticated, isLoadingAuth]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const user = await schedulfySDK.auth.me();
      console.log('✅ User loaded:', user);
      
      // Fetch real tasks from backend
      let tasksData = [];
      try {
        tasksData = await schedulfySDK.tasks.getAll();
        console.log(`✅ Loaded ${tasksData.length} tasks from backend`);
      } catch (taskError) {
        console.error('❌ Failed to fetch tasks:', taskError);
        setError('Failed to load tasks. Please refresh.');
      }
      
      // Fetch real events/sessions from backend
      let sessionsData = [];
      try {
        sessionsData = await schedulfySDK.events.getAll();
        console.log(`✅ Loaded ${sessionsData.length} sessions from backend`);
      } catch (sessionError) {
        console.error('❌ Failed to fetch sessions:', sessionError);
        // Don't set error for sessions, just show empty
      }
      
      setTasks(tasksData || []);
      setFocusSessions(sessionsData || []);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setError('Failed to load data. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Chart data calculations
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dayTasks = tasks.filter(t => t.completed_at && isWithinInterval(new Date(t.completed_at), { start: startOfDay(d), end: endOfDay(d) }));
    return { date: format(d, 'EEE'), completed: dayTasks.length };
  });

  const byDayOfWeek = DAY_NAMES.map((day, idx) => ({
    day,
    tasks: tasks.filter(t => t.due_date && getDay(new Date(t.due_date)) === idx).length,
    done: tasks.filter(t => t.status === 'done' && t.completed_at && getDay(new Date(t.completed_at)) === idx).length,
  }));

  const statusDist = [
    { name: 'Done', value: tasks.filter(t => t.status === 'done').length },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length },
    { name: 'To Do', value: tasks.filter(t => t.status === 'todo').length },
    { name: 'Overdue', value: tasks.filter(t => t.status === 'overdue' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done')).length },
  ].filter(d => d.value > 0);

  const priorityDist = [
    { name: 'Urgent', value: tasks.filter(t => t.priority === 'urgent').length },
    { name: 'High', value: tasks.filter(t => t.priority === 'high').length },
    { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length },
    { name: 'Low', value: tasks.filter(t => t.priority === 'low').length },
  ].filter(d => d.value > 0);

  const completionRate = tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0;
  const totalFocusHours = sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + (s.duration_minutes || 25), 0) / 60 * 10) / 10 : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
        </div>
      );
    }
    return null;
  };

  if (isLoadingAuth || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 glass rounded-xl border border-border max-w-md">
          <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please log in to view your insights.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 glass rounded-xl border border-red-500/20 max-w-md">
          <h2 className="text-xl font-bold mb-2 text-red-500">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => loadData()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-wide">SCHEDULFY INSIGHTS</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {tasks.length > 0 ? `📊 ${tasks.length} tasks • ${sessions.length} focus sessions` : 'Start adding tasks to see insights!'}
        </p>
      </div>

      {/* AI Chatbot - Embedded */}
      <InsightChat tasks={tasks} sessions={sessions} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Completion Rate', value: `${completionRate}%`, icon: Target, color: 'text-primary', desc: `${tasks.filter(t => t.status === 'done').length} of ${tasks.length} tasks` },
          { label: 'Total Tasks', value: tasks.length, icon: BarChart2, color: 'text-cyan', desc: `${tasks.filter(t => t.is_ai_generated).length} AI-created` },
          { label: 'Focus Hours', value: `${totalFocusHours}h`, icon: Clock, color: 'text-green-400', desc: `${sessions.length} sessions` },
          { label: 'Streak Score', value: `${Math.min(completionRate, 99)}`, icon: Zap, color: 'text-yellow-400', desc: 'Productivity index' },
        ].map(({ label, value, icon: Icon, color, desc }) => (
          <div key={label} className="glass rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-3xl font-heading font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completions this week */}
        <div className="glass rounded-xl p-5 border border-border">
          <h3 className="font-heading text-sm font-bold tracking-wide text-muted-foreground mb-4">DAILY COMPLETIONS (LAST 7 DAYS)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last7Days}>
              <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="completed" fill="hsl(248 100% 70%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks by day of week */}
        <div className="glass rounded-xl p-5 border border-border">
          <h3 className="font-heading text-sm font-bold tracking-wide text-muted-foreground mb-4">TASKS BY DAY OF WEEK</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byDayOfWeek}>
              <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="tasks" name="Scheduled" fill="hsl(248 100% 70% / 0.4)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="done" name="Completed" fill="hsl(160 60% 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="glass rounded-xl p-5 border border-border">
          <h3 className="font-heading text-sm font-bold tracking-wide text-muted-foreground mb-4">TASK STATUS DISTRIBUTION</h3>
          <div className="flex items-center justify-between">
            <ResponsiveContainer width="55%" height={180}>
              <PieChart>
                <Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                  {statusDist.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {statusDist.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-muted-foreground flex-1">{entry.name}</span>
                  <span className="text-xs font-semibold text-foreground">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="glass rounded-xl p-5 border border-border">
          <h3 className="font-heading text-sm font-bold tracking-wide text-muted-foreground mb-4">PRIORITY BREAKDOWN</h3>
          <div className="space-y-3">
            {priorityDist.map((p, i) => (
              <div key={p.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{p.name}</span>
                  <span className="font-semibold text-foreground">{p.value}</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${tasks.length > 0 ? (p.value / tasks.length) * 100 : 0}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
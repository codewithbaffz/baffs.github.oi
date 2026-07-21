import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle, Zap, TrendingUp, Plus, ArrowRight, Target, Timer, Sparkles } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, startOfDay, endOfDay, addDays } from 'date-fns';
import TaskCard from '@/components/TaskCard';
import NLPTaskInput from '@/components/NLPTaskInput';
import { useTasks } from '@/context/TaskContext'; // ✅ Import the hook

export default function Dashboard() {
  // ✅ Use the global task context instead of local state
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  
  const [user, setUser] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [showNLP, setShowNLP] = useState(false);

  // Load user data when backend is available
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Dynamically import base44 if needed
      const { base44 } = await import('@/api/base44Client');
      const u = await base44.auth.me();
      setUser(u);
      
      // Load focus sessions if available
      try {
        const sessions = await base44.entities.FocusSession.filter({ user_id: u.id }, '-created_date', 5);
        setRecentSessions(sessions);
      } catch (err) {
        console.log('Focus sessions not available');
        setRecentSessions([]);
      }
    } catch (err) {
      console.log('Backend not available - using demo user');
      // Fallback to demo user
      setUser({ full_name: 'Kojo Baffs', id: 'demo' });
    }
  };

  // Demo data for testing when no tasks exist
  const demoTasks = [
    { id: 'demo-1', title: 'Complete project proposal', status: 'todo', due_date: new Date().toISOString(), priority: 'high' },
    { id: 'demo-2', title: 'Review team updates', status: 'in_progress', due_date: new Date().toISOString(), priority: 'medium' },
    { id: 'demo-3', title: 'Update documentation', status: 'done', due_date: new Date(Date.now() - 86400000).toISOString(), priority: 'low' },
    { id: 'demo-4', title: 'Prepare presentation', status: 'todo', due_date: new Date(Date.now() + 172800000).toISOString(), priority: 'high' },
    { id: 'demo-5', title: 'Fix navigation bug', status: 'todo', due_date: new Date(Date.now() - 172800000).toISOString(), priority: 'urgent' },
  ];

  // Use real tasks if available, otherwise use demo data
  const displayTasks = tasks.length > 0 ? tasks : demoTasks;

  // Calculate metrics from displayTasks
  const todayTasks = displayTasks.filter(t => t.due_date && isToday(new Date(t.due_date)) && t.status !== 'done');
  const overdueTasks = displayTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== 'done');
  const upcomingTasks = displayTasks.filter(t => t.due_date && new Date(t.due_date) > endOfDay(new Date()) && t.status !== 'done').slice(0, 5);
  const doneTasks = displayTasks.filter(t => t.status === 'done');
  const completionRate = displayTasks.length > 0 ? Math.round((doneTasks.length / displayTasks.length) * 100) : 0;

  // Handle task updates via context
  const handleTaskUpdate = async (updatedTask) => {
    try {
      const taskId = updatedTask.id || updatedTask._id || updatedTask.task_id;
      await updateTask(taskId, updatedTask);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleTaskCreate = async (taskData) => {
    try {
      const created = await createTask({
        ...taskData,
        status: taskData.status || 'todo',
        source: taskData.source || 'manual',
      });
      return created;
    } catch (err) {
      console.error('Failed to create task:', err);
      throw err;
    }
  };

  const stats = [
    { label: 'Due Today', value: todayTasks.length, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
    { label: 'Overdue', value: overdueTasks.length, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
    { label: 'Completed', value: doneTasks.length, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
    { label: 'Focus Sessions', value: recentSessions.length || 3, icon: Timer, color: 'text-cyan', bg: 'bg-cyan/10 border-cyan/20' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  
  // Get user's first name for greeting
  const firstName = user?.full_name?.split(' ')[0] || 'Kojo Baffs';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {format(new Date(), 'EEEE, MMMM do yyyy')} · {todayTasks.length} task{todayTasks.length !== 1 ? 's' : ''} due today
          </p>
        </div>
        <button
          onClick={() => setShowNLP(!showNLP)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all glow-indigo"
        >
          <Sparkles className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* NLP Input */}
      {showNLP && (
        <div className="glass rounded-xl p-4 animate-fade-in">
          <NLPTaskInput
            onTaskCreated={async (task) => {
              try {
                const created = await handleTaskCreate(task);
                if (created) {
                  setShowNLP(false);
                }
              } catch (err) {
                console.error('Failed to create task:', err);
              }
            }}
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`glass rounded-xl p-4 border ${bg} transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className={`text-3xl font-heading font-bold mt-1 ${color}`}>{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="glass rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Overall Completion Rate</span>
          </div>
          <span className="text-sm font-bold text-primary">{completionRate}%</span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-cyan rounded-full transition-all duration-700"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold tracking-wide">TODAY'S TASKS</h2>
            <Link to="/tasks" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {overdueTasks.length > 0 && (
            <div className="glass-cyan rounded-xl p-3 border border-destructive/30">
              <p className="text-xs text-destructive font-semibold mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {overdueTasks.length} OVERDUE TASK{overdueTasks.length > 1 ? 'S' : ''}
              </p>
              <div className="space-y-2">
                {overdueTasks.slice(0, 2).map(task => {
                  const key = task.id || task._id || task.task_id || `overdue-${task.title}`;
                  return (
                    <TaskCard 
                      key={key} 
                      task={task} 
                      compact 
                      onUpdate={handleTaskUpdate} 
                    />
                  );
                })}
              </div>
            </div>
          )}

          {todayTasks.length === 0 && overdueTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-xl text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400/40 mb-3" />
              <p className="text-muted-foreground font-medium">Nothing due today</p>
              <p className="text-muted-foreground/60 text-sm mt-1">Great job staying on top of things!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map(task => {
                const key = task.id || task._id || task.task_id || `today-${task.title}`;
                return (
                  <TaskCard 
                    key={key} 
                    task={task} 
                    onUpdate={handleTaskUpdate} 
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar panels */}
        <div className="space-y-4">
          {/* Upcoming */}
          <div className="glass rounded-xl p-4 border border-border">
            <h3 className="font-heading text-sm font-bold tracking-wider text-muted-foreground mb-3">UPCOMING</h3>
            {upcomingTasks.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-4">No upcoming tasks</p>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map(task => {
                  const key = task.id || task._id || task.task_id || `upcoming-${task.title}`;
                  return (
                    <TaskCard 
                      key={key} 
                      task={task} 
                      compact 
                      onUpdate={handleTaskUpdate} 
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Suggestion Card */}
          <div className="glass-indigo rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-cyan" />
              <span className="text-sm font-semibold text-cyan">AI INSIGHT</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {completionRate >= 70
                ? "🎯 You're crushing it! " + completionRate + "% completion rate. Consider taking on a stretch goal today."
                : completionRate >= 40
                ? "⚡ Good momentum. Focus on your " + overdueTasks.length + " overdue task" + (overdueTasks.length !== 1 ? 's' : '') + " first to clear the backlog."
                : "💡 Start small — pick your single most important task and work on it in a 25-minute Focus session."
              }
            </p>
            <Link to="/insights" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mt-3 transition-colors">
              View full insights <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Quick Focus */}
          <div className="glass rounded-xl p-4 border border-border">
            <h3 className="font-heading text-sm font-bold tracking-wider text-muted-foreground mb-3">QUICK FOCUS</h3>
            <Link
              to="/focus"
              className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Timer className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Start Pomodoro</p>
                <p className="text-xs text-muted-foreground">25 min deep work session</p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
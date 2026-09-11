import { useState, useEffect, useRef } from 'react';
import { 
  Timer, 
  Coffee, 
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { useTasks } from '@/context/TaskContext'; // Import your TaskContext

// Default values
const DEFAULT_WORK_MINS = 25;
const DEFAULT_BREAK_MINS = 5;
const DEFAULT_LONG_BREAK_MINS = 15;

// Demo data for sessions
const DEMO_SESSIONS = [
  { id: '1', task_title: 'Complete project proposal', completed: true, cycles_completed: 4, created_date: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', task_title: 'Code review', completed: true, cycles_completed: 2, created_date: new Date(Date.now() - 172800000).toISOString() },
  { id: '3', task_title: 'General focus', completed: false, cycles_completed: 1, created_date: new Date(Date.now() - 259200000).toISOString() },
];

export default function Focus() {
  // Get tasks from TaskContext
  const { tasks, loading: tasksLoading, fetchTasks } = useTasks();
  const [selectedTask, setSelectedTask] = useState(null);
  
  const [sessions, setSessions] = useState(DEMO_SESSIONS);
  
  // Timer configuration
  const [workMins, setWorkMins] = useState(DEFAULT_WORK_MINS);
  const [breakMins, setBreakMins] = useState(DEFAULT_BREAK_MINS);
  const [longBreakMins, setLongBreakMins] = useState(DEFAULT_LONG_BREAK_MINS);
  const [showSettings, setShowSettings] = useState(false);
  
  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(DEFAULT_WORK_MINS * 60);
  const [running, setRunning] = useState(false);
  const [cyclesDone, setCyclesDone] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Fetch tasks when component mounts
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Get current max time based on mode
  const getMaxTime = () => {
    if (mode === 'work') return workMins * 60;
    if (mode === 'break') return breakMins * 60;
    return longBreakMins * 60;
  };

  // Timer logic
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, workMins, breakMins, longBreakMins]);

  const handleTimerComplete = () => {
    setRunning(false);
    if (mode === 'work') {
      const newCycles = cyclesDone + 1;
      setCyclesDone(newCycles);
      
      if (sessionId) {
        setSessions(prev => prev.map(s => 
          s.id === sessionId 
            ? { ...s, completed: true, cycles_completed: newCycles, ended_at: new Date().toISOString() }
            : s
        ));
      }
      
      if (newCycles % 4 === 0) {
        setMode('longbreak');
        setTimeLeft(longBreakMins * 60);
      } else {
        setMode('break');
        setTimeLeft(breakMins * 60);
      }
    } else {
      setMode('work');
      setTimeLeft(workMins * 60);
    }
    
    // Play notification sound
    try {
      new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA').play().catch(() => {});
    } catch {
      console.log('Audio notification not available');
    }
  };

  const startTimer = () => {
    if (mode === 'work' && !sessionId) {
      // Get the task ID (handle both _id and id)
      const taskId = selectedTask?._id || selectedTask?.id || null;
      const taskTitle = selectedTask?.title || null;
      
      const newSession = {
        id: Date.now().toString(),
        task_id: taskId,
        task_title: taskTitle,
        session_type: 'pomodoro',
        started_at: new Date().toISOString(),
        cycles_completed: cyclesDone,
        completed: false,
        created_date: new Date().toISOString(),
      };
      setSessionId(newSession.id);
      setSessions(prev => [newSession, ...prev]);
    }
    startTimeRef.current = Date.now();
    setRunning(true);
  };

  const pauseTimer = () => setRunning(false);

  const resetTimer = () => {
    setRunning(false);
    setSessionId(null);
    setMode('work');
    setTimeLeft(workMins * 60);
    setCyclesDone(0);
  };

  // Update timer when settings change
  const updateTimerSettings = (newWorkMins, newBreakMins, newLongBreakMins) => {
    if (running) return; // Don't allow changes while running
    
    setWorkMins(newWorkMins);
    setBreakMins(newBreakMins);
    setLongBreakMins(newLongBreakMins);
    
    // Update current timer based on mode
    if (mode === 'work') {
      setTimeLeft(newWorkMins * 60);
    } else if (mode === 'break') {
      setTimeLeft(newBreakMins * 60);
    } else if (mode === 'longbreak') {
      setTimeLeft(newLongBreakMins * 60);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalSeconds = getMaxTime();
  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

  const MODE_CONFIG = {
    work: { label: 'DEEP WORK', color: 'text-primary', ring: '#6C63FF', bg: 'bg-primary/10' },
    break: { label: 'SHORT BREAK', color: 'text-green-400', ring: '#10B981', bg: 'bg-green-400/10' },
    longbreak: { label: 'LONG BREAK', color: 'text-cyan', ring: '#00D4FF', bg: 'bg-cyan/10' },
  };
  const mc = MODE_CONFIG[mode];

  const circumference = 2 * Math.PI * 88;
  const dashOffset = circumference - (progress / 100) * circumference;

  // Helper to get task ID for select value
  const getTaskSelectValue = (task) => {
    if (!task) return '';
    return task._id || task.id || '';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide">FOCUS MODE</h1>
          <p className="text-muted-foreground text-sm mt-1">Pomodoro timer · Deep work sessions · Track your productivity</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg bg-secondary/60 border border-border hover:bg-secondary/80 transition-all"
          disabled={running}
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="glass rounded-xl p-4 border border-border space-y-3">
          <h3 className="font-heading text-sm font-bold tracking-wider text-muted-foreground">TIMER SETTINGS</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Work Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={workMins}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  updateTimerSettings(val, breakMins, longBreakMins);
                }}
                disabled={running}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Short Break (minutes)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={breakMins}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  updateTimerSettings(workMins, val, longBreakMins);
                }}
                disabled={running}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Long Break (minutes)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={longBreakMins}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  updateTimerSettings(workMins, breakMins, val);
                }}
                disabled={running}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 disabled:opacity-60"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">⏱️ Settings apply when timer is not running</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Timer */}
        <div className="lg:col-span-3 flex flex-col items-center space-y-6">
          {/* Mode selector */}
          <div className="flex items-center gap-1 bg-secondary/60 border border-border rounded-xl p-1">
            {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => { 
                  if (!running) { 
                    setMode(key); 
                    setTimeLeft(
                      key === 'work' ? workMins * 60 : 
                      key === 'break' ? breakMins * 60 : 
                      longBreakMins * 60
                    ); 
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === key ? `${cfg.bg} ${cfg.color}` : 'text-muted-foreground hover:text-foreground'}`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* SVG Ring Timer */}
          <div className="relative flex items-center justify-center">
            <svg width="220" height="220" className="transform -rotate-90">
              <circle cx="110" cy="110" r="88" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
              <circle
                cx="110" cy="110" r="88" fill="none"
                stroke={mc.ring}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-display text-6xl font-bold tracking-tight ${mc.color}`}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className={`text-xs font-semibold tracking-widest mt-1 ${mc.color}`}>{mc.label}</span>
              {cyclesDone > 0 && <span className="text-xs text-muted-foreground mt-1">{cyclesDone} cycle{cyclesDone !== 1 ? 's' : ''} done</span>}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button onClick={resetTimer} className="p-3 rounded-full bg-secondary border border-border hover:bg-secondary/80 transition-all">
              <RotateCcw className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={running ? pauseTimer : startTimer}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all glow-indigo font-semibold
                ${running ? 'bg-secondary border border-border' : 'bg-primary hover:bg-primary/90'}`}
            >
              {running ? <Pause className="w-7 h-7 text-foreground" /> : <Play className="w-7 h-7 text-primary-foreground ml-1" />}
            </button>
            <div className="w-11 h-11" />
          </div>

          {/* Task Selector */}
          <div className="w-full">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Working on</p>
            {tasksLoading ? (
              <p className="text-xs text-muted-foreground py-2">Loading tasks...</p>
            ) : (
              <select
                value={getTaskSelectValue(selectedTask)}
                onChange={(e) => {
                  const taskId = e.target.value;
                  // Find task by _id or id
                  const task = tasks.find(t => {
                    const tId = t._id || t.id;
                    return String(tId) === String(taskId);
                  });
                  setSelectedTask(task || null);
                }}
                disabled={running}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 disabled:opacity-60"
              >
                <option value="">— Select a task (optional) —</option>
                {tasks.length === 0 ? (
                  <option value="" disabled>No tasks available</option>
                ) : (
                  tasks.map(t => {
                    const taskId = t._id || t.id;
                    return (
                      <option key={taskId} value={taskId}>
                        {t.title}
                      </option>
                    );
                  })
                )}
              </select>
            )}
          </div>

          {running && (
            <div className="glass-indigo rounded-xl px-5 py-3 text-center animate-pulse-glow">
              <p className="text-sm text-primary font-semibold"> Focus Mode Active — Stay focused!</p>
              {selectedTask && <p className="text-xs text-muted-foreground mt-0.5">Working on: {selectedTask.title}</p>}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pomodoro guide */}
          <div className="glass rounded-xl p-4 border border-border">
            <h3 className="font-heading text-sm font-bold tracking-wider text-muted-foreground mb-3">POMODORO TECHNIQUE</h3>
            <div className="space-y-2">
              {[
                { icon: Timer, color: 'text-primary', label: `${workMins} min`, desc: 'Deep work session' },
                { icon: Coffee, color: 'text-green-400', label: `${breakMins} min`, desc: 'Short break' },
                { icon: Zap, color: 'text-cyan', label: `${longBreakMins} min`, desc: 'Long break (every 4 cycles)' },
              ].map(({ icon: Icon, color, label, desc }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${color} shrink-0`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session History */}
          <div className="glass rounded-xl p-4 border border-border">
            <h3 className="font-heading text-sm font-bold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> RECENT SESSIONS
            </h3>
            {sessions.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-4">No sessions yet. Start your first Pomodoro!</p>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 6).map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                    <div className={`w-2 h-2 rounded-full ${s.completed ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{s.task_title || 'General focus'}</p>
                      <p className="text-xs text-muted-foreground">{s.cycles_completed || 0} cycles · {format(new Date(s.created_date), 'MMM d')}</p>
                    </div>
                    {s.completed && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
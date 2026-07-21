import { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, CheckCircle2, Coffee, Zap, Target, Clock } from 'lucide-react';
import { format } from 'date-fns';

const WORK_MINS = 25;
const BREAK_MINS = 5;
const LONG_BREAK_MINS = 15;

// Demo data
const DEMO_SESSIONS = [
  { id: '1', task_title: 'Complete project proposal', completed: true, cycles_completed: 4, created_date: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', task_title: 'Code review', completed: true, cycles_completed: 2, created_date: new Date(Date.now() - 172800000).toISOString() },
  { id: '3', task_title: 'General focus', completed: false, cycles_completed: 1, created_date: new Date(Date.now() - 259200000).toISOString() },
];

export default function Focus() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [sessions, setSessions] = useState(DEMO_SESSIONS);
  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(WORK_MINS * 60);
  const [running, setRunning] = useState(false);
  const [cyclesDone, setCyclesDone] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

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
  }, [running, mode]);

  const handleTimerComplete = () => {
    setRunning(false);
    if (mode === 'work') {
      const newCycles = cyclesDone + 1;
      setCyclesDone(newCycles);
      
      // Add completed session locally
      if (sessionId) {
        setSessions(prev => prev.map(s => 
          s.id === sessionId 
            ? { ...s, completed: true, cycles_completed: newCycles, ended_at: new Date().toISOString() }
            : s
        ));
      }
      
      if (newCycles % 4 === 0) {
        setMode('longbreak');
        setTimeLeft(LONG_BREAK_MINS * 60);
      } else {
        setMode('break');
        setTimeLeft(BREAK_MINS * 60);
      }
    } else {
      setMode('work');
      setTimeLeft(WORK_MINS * 60);
    }
    
    // Play notification sound
    try {
      new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA').play().catch(() => {});
    } catch (e) {}
  };

  const startTimer = () => {
    if (mode === 'work' && !sessionId) {
      const newSession = {
        id: Date.now().toString(),
        task_id: selectedTask?.id || null,
        task_title: selectedTask?.title || null,
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
    setTimeLeft(WORK_MINS * 60);
    setCyclesDone(0);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalSeconds = mode === 'work' ? WORK_MINS * 60 : mode === 'break' ? BREAK_MINS * 60 : LONG_BREAK_MINS * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  const MODE_CONFIG = {
    work: { label: 'DEEP WORK', color: 'text-primary', ring: '#6C63FF', bg: 'bg-primary/10' },
    break: { label: 'SHORT BREAK', color: 'text-green-400', ring: '#10B981', bg: 'bg-green-400/10' },
    longbreak: { label: 'LONG BREAK', color: 'text-cyan', ring: '#00D4FF', bg: 'bg-cyan/10' },
  };
  const mc = MODE_CONFIG[mode];

  const circumference = 2 * Math.PI * 88;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-wide">FOCUS MODE</h1>
        <p className="text-muted-foreground text-sm mt-1">Pomodoro timer · Deep work sessions · Track your productivity</p>
      </div>

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
                    setTimeLeft(key === 'work' ? WORK_MINS * 60 : key === 'break' ? BREAK_MINS * 60 : LONG_BREAK_MINS * 60); 
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
                stroke={mc.ring} strokeWidth="8"
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
            <select
              value={selectedTask?.id || ''}
              onChange={e => setSelectedTask(tasks.find(t => t.id === e.target.value) || null)}
              disabled={running}
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 disabled:opacity-60"
            >
              <option value="">— Select a task (optional) —</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          {running && (
            <div className="glass-indigo rounded-xl px-5 py-3 text-center animate-pulse-glow">
              <p className="text-sm text-primary font-semibold">🔇 Focus Mode Active — Stay focused!</p>
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
                { icon: Timer, color: 'text-primary', label: '25 min', desc: 'Deep work session' },
                { icon: Coffee, color: 'text-green-400', label: '5 min', desc: 'Short break' },
                { icon: Zap, color: 'text-cyan', label: '15 min', desc: 'Long break (every 4 cycles)' },
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
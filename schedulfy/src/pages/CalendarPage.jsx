// CalendarPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar,
  Clock,
  X,
  AlertCircle,
  Sparkles,
  Loader2,
  Check,
  PlusCircle,
  ListTodo,
  Calendar as CalendarIcon,
  Flag
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks
} from 'date-fns';
import { useEvents } from '@/context/EventContext';
import { useTasks } from '@/context/TaskContext';

const SOURCE_COLOR = {
  manual: 'bg-primary/20 border-primary/40 text-primary',
  google: 'bg-green-400/20 border-green-400/40 text-green-400',
  zoom: 'bg-blue-400/20 border-blue-400/40 text-blue-400',
  schedulfy: 'bg-cyan/20 border-cyan/40 text-cyan',
  task: 'bg-orange-400/20 border-orange-400/40 text-orange-400',
};

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-green-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-500' },
];

export default function CalendarPage() {
  const { events, loading: eventsLoading, createEvent, updateEvent, deleteEvent } = useEvents();
  const { tasks, loading: tasksLoading, createTask } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [form, setForm] = useState({ 
    title: '', 
    start_time: '', 
    end_time: '', 
    color: '#6C63FF' 
  });
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    tags: ''
  });
  const [saving, setSaving] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  const loading = eventsLoading || tasksLoading;

  // Month view calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // Week view calculations
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ 
    start: weekStart, 
    end: endOfWeek(currentDate, { weekStartsOn: 1 }) 
  });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDay = (day) => events.filter(e => isSameDay(new Date(e.start_time || e.start), day));
  const getTasksForDay = (day) => tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), day));

  const handlePrev = () => {
    view === 'month' 
      ? setCurrentDate(subMonths(currentDate, 1)) 
      : setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNext = () => {
    view === 'month' 
      ? setCurrentDate(addMonths(currentDate, 1)) 
      : setCurrentDate(addWeeks(currentDate, 1));
  };

  const handleAddEvent = async () => {
    if (!form.title || !form.start_time || !form.end_time) return;
    setSaving(true);
    try {
      const eventData = {
        title: form.title,
        start: new Date(form.start_time).toISOString(),
        end: new Date(form.end_time).toISOString(),
        source: 'manual',
        color: form.color,
      };
      const result = await createEvent(eventData);
      if (result.success) {
        setForm({ title: '', start_time: '', end_time: '', color: '#6C63FF' });
        setShowAddEvent(false);
      }
    } catch (error) {
      console.error('Failed to create event:', error);
    }
    setSaving(false);
  };

  // ✅ NEW: Handle task creation from calendar
  const handleAddTask = async () => {
    if (!taskForm.title.trim()) return;
    setSavingTask(true);
    try {
      const taskData = {
        title: taskForm.title,
        description: taskForm.description || '',
        priority: taskForm.priority || 'medium',
        due_date: taskForm.due_date || new Date().toISOString(),
        tags: taskForm.tags ? taskForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        status: 'todo',
        source: 'calendar',
      };
      const result = await createTask(taskData);
      if (result.success) {
        setTaskForm({ title: '', description: '', priority: 'medium', due_date: '', tags: '' });
        setShowAddTask(false);
        setSelectedDay(null);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
    setSavingTask(false);
  };

  // ✅ NEW: Open task modal for a specific day
  const openTaskModal = (day) => {
    setSelectedDay(day);
    setTaskForm({
      ...taskForm,
      due_date: format(day, "yyyy-MM-dd'T'HH:mm")
    });
    setShowAddTask(true);
  };

  // ✅ NEW: Open event modal for a specific day
  const openEventModal = (day) => {
    setSelectedDay(day);
    setForm({
      title: '',
      start_time: format(day, "yyyy-MM-dd'T'HH:mm"),
      end_time: format(new Date(day.getTime() + 3600000), "yyyy-MM-dd'T'HH:mm"),
      color: '#6C63FF'
    });
    setShowAddEvent(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrev} 
            className="p-2 glass rounded-lg border border-border hover:bg-secondary/20 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <h2 className="font-heading text-xl font-bold tracking-wide min-w-48 text-center text-foreground">
            {view === 'month' 
              ? format(currentDate, 'MMMM yyyy') 
              : `${format(weekStart, 'MMM d')} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`}
          </h2>
          <button 
            onClick={handleNext} 
            className="p-2 glass rounded-lg border border-border hover:bg-secondary/20 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())} 
            className="px-3 py-1 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-all"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary/60 border border-border rounded-lg p-1">
            {['month', 'week'].map(v => (
              <button 
                key={v} 
                onClick={() => setView(v)} 
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                  view === v 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowAddEvent(!showAddEvent)} 
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>
      </div>

      {/* Add Event Form */}
      {showAddEvent && (
        <div className="px-6 py-4 border-b border-border bg-card/50 animate-fade-in">
          <div className="flex items-end gap-3 flex-wrap">
            <input 
              placeholder="Event title" 
              value={form.title} 
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 flex-1 min-w-48"
            />
            <input 
              type="datetime-local" 
              value={form.start_time} 
              onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
              className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
            <input 
              type="datetime-local" 
              value={form.end_time} 
              onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
              className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
            <button 
              onClick={handleAddEvent} 
              disabled={saving} 
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
            </button>
            <button 
              onClick={() => setShowAddEvent(false)} 
              className="p-2 rounded-lg hover:bg-secondary/20 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {view === 'month' ? (
        <div className="flex-1 overflow-auto p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
                {d}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              const dayTasks = getTasksForDay(day);
              const total = dayEvents.length + dayTasks.length;
              const isCurrentMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSameDay(selectedDay, day) ? null : day)}
                  className={`min-h-24 p-2 rounded-lg border cursor-pointer transition-all hover:border-primary/30 group
                    ${today ? 'border-primary/50 bg-primary/5' : 'border-border'}
                    ${!isCurrentMonth ? 'opacity-40' : ''}
                    ${selectedDay && isSameDay(selectedDay, day) ? 'bg-secondary/60 border-primary/50' : 'bg-card/40 hover:bg-secondary/30'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className={`text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full
                      ${today ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                      {format(day, 'd')}
                    </div>
                    {/* ✅ NEW: Quick add task button on day hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openTaskModal(day);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-primary/20"
                      title="Add task for this day"
                    >
                      <PlusCircle className="w-4 h-4 text-primary" />
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(e => (
                      <div key={e.id} className={`text-xs px-1.5 py-0.5 rounded border truncate ${SOURCE_COLOR[e.source] || SOURCE_COLOR.manual}`}>
                        {e.title}
                      </div>
                    ))}
                    {dayTasks.slice(0, 1).map(t => (
                      <div key={t.id} className="text-xs px-1.5 py-0.5 rounded border truncate bg-orange-400/10 border-orange-400/30 text-orange-400">
                        📌 {t.title}
                      </div>
                    ))}
                    {total > 3 && <div className="text-xs text-muted-foreground">+{total - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Day Detail */}
          {selectedDay && (
            <div className="mt-4 glass rounded-xl p-4 border border-border animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-base font-bold tracking-wide text-foreground">
                  {format(selectedDay, 'EEEE, MMMM d')}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => openTaskModal(selectedDay)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                  >
                    <ListTodo className="w-3 h-3" />
                    Add Task
                  </button>
                  <button
                    onClick={() => openEventModal(selectedDay)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-cyan/20 text-cyan rounded-lg hover:bg-cyan/30 transition-colors"
                  >
                    <CalendarIcon className="w-3 h-3" />
                    Add Event
                  </button>
                </div>
              </div>
              {getEventsForDay(selectedDay).length === 0 && getTasksForDay(selectedDay).length === 0 ? (
                <p className="text-muted-foreground text-sm">Nothing scheduled for this day.</p>
              ) : (
                <div className="space-y-2">
                  {getEventsForDay(selectedDay).map(e => (
                    <div key={e.id} className={`flex items-start gap-3 p-3 rounded-lg border ${SOURCE_COLOR[e.source] || SOURCE_COLOR.manual}`}>
                      <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{e.title}</p>
                        <p className="text-xs opacity-70">
                          {format(new Date(e.start_time || e.start), 'h:mma')} – {format(new Date(e.end_time || e.end), 'h:mma')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {getTasksForDay(selectedDay).map(t => (
                    <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border bg-orange-400/10 border-orange-400/30 text-orange-400">
                      <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-xs opacity-70">Due {format(new Date(t.due_date), 'h:mma')} · {t.priority}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Week View */
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-8 border-b border-border sticky top-0 bg-card z-10">
            <div className="p-2 border-r border-border" />
            {weekDays.map(day => (
              <div key={day.toISOString()} className={`p-3 text-center border-r border-border ${isToday(day) ? 'bg-primary/5' : ''}`}>
                <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
                <p className={`text-lg font-heading font-bold ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </p>
                {/* ✅ NEW: Quick add task button in week view */}
                <button
                  onClick={() => openTaskModal(day)}
                  className="mt-1 text-xs text-primary/60 hover:text-primary transition-colors"
                >
                  + Add task
                </button>
              </div>
            ))}
          </div>
          <div>
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b border-border/30 min-h-14">
                <div className="p-2 border-r border-border text-xs text-muted-foreground text-right pr-3 pt-1">
                  {hour === 0 ? '' : `${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}`}
                </div>
                {weekDays.map(day => {
                  const hourEvents = events.filter(e => {
                    const eventDate = new Date(e.start_time || e.start);
                    return isSameDay(eventDate, day) && eventDate.getHours() === hour;
                  });
                  return (
                    <div key={day.toISOString()} className={`border-r border-border/30 p-0.5 ${isToday(day) ? 'bg-primary/3' : ''}`}>
                      {hourEvents.map(e => (
                        <div key={e.id} className={`text-xs px-1.5 py-1 rounded border truncate mb-0.5 ${SOURCE_COLOR[e.source] || SOURCE_COLOR.manual}`}>
                          {e.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ NEW: Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass rounded-xl max-w-md w-full p-6 border border-border animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-primary" />
                Create Task for {selectedDay ? format(selectedDay, 'MMM d, yyyy') : ''}
              </h2>
              <button
                onClick={() => {
                  setShowAddTask(false);
                  setTaskForm({ title: '', description: '', priority: 'medium', due_date: '', tags: '' });
                }}
                className="p-1 hover:bg-secondary/60 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleAddTask(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Task Title *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Enter task title..."
                  className="w-full px-3 py-2 bg-secondary/60 border border-border rounded-lg focus:outline-none focus:border-primary/50 text-foreground placeholder-muted-foreground"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Add description (optional)"
                  rows={2}
                  className="w-full px-3 py-2 bg-secondary/60 border border-border rounded-lg focus:outline-none focus:border-primary/50 text-foreground placeholder-muted-foreground resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary/60 border border-border rounded-lg focus:outline-none focus:border-primary/50 text-foreground"
                  >
                    {PRIORITY_OPTIONS.map(p => (
                      <option key={p.value} value={p.value} className={p.color}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary/60 border border-border rounded-lg focus:outline-none focus:border-primary/50 text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={taskForm.tags}
                  onChange={(e) => setTaskForm({ ...taskForm, tags: e.target.value })}
                  placeholder="e.g. work, personal, urgent"
                  className="w-full px-3 py-2 bg-secondary/60 border border-border rounded-lg focus:outline-none focus:border-primary/50 text-foreground placeholder-muted-foreground"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingTask || !taskForm.title.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {savingTask ? 'Creating...' : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTask(false);
                    setTaskForm({ title: '', description: '', priority: 'medium', due_date: '', tags: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-secondary/60 text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
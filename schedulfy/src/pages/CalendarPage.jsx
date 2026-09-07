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
  Flag,
  Trash2,
  Edit2
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
  subWeeks,
  parseISO
} from 'date-fns';
import { useEvents } from '@/context/EventContext';
import { useTasks } from '@/context/TaskContext';

// Color mapping for different event sources
const SOURCE_COLOR = {
  manual: 'bg-primary/20 border-primary/40 text-primary',
  google: 'bg-green-400/20 border-green-400/40 text-green-400',
  zoom: 'bg-blue-400/20 border-blue-400/40 text-blue-400',
  schedulfy: 'bg-cyan/20 border-cyan/40 text-cyan',
  task: 'bg-orange-400/20 border-orange-400/40 text-orange-400',
};

// Priority options for tasks
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-green-400', icon: '' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400', icon: '' },
  { value: 'high', label: 'High', color: 'text-orange-400', icon: '' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-500', icon: '' },
];

// Color options for events
const COLOR_OPTIONS = [
  '#6C63FF', // Purple
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Orange
  '#98D8C8', // Mint
  '#DDA0DD', // Plum
  '#F0E68C', // Khaki
];

export default function CalendarPage() {
  const { events, loading: eventsLoading, createEvent, updateEvent, deleteEvent } = useEvents();
  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask } = useTasks();
  
  // State variables
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(null);
  const [showTaskDetails, setShowTaskDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form states
  const [form, setForm] = useState({ 
    title: '', 
    start_time: '', 
    end_time: '', 
    color: '#6C63FF',
    description: '',
    source: 'manual'
  });
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    tags: ''
  });
  
  // Loading states
  const [saving, setSaving] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loading = eventsLoading || tasksLoading;

  // Calendar calculations
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

  // Helper functions
  const getEventsForDay = (day) => 
    events.filter(e => isSameDay(new Date(e.start_time || e.start), day));
  
  const getTasksForDay = (day) => 
    tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), day));

  // Navigation handlers
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

  // Event CRUD operations
  const handleAddEvent = async () => {
    if (!form.title || !form.start_time || !form.end_time) return;
    setSaving(true);
    try {
      const eventData = {
        title: form.title,
        start: new Date(form.start_time).toISOString(),
        end: new Date(form.end_time).toISOString(),
        source: form.source || 'manual',
        color: form.color,
        description: form.description || '',
      };
      
      const result = isEditing && editingId 
        ? await updateEvent(editingId, eventData)
        : await createEvent(eventData);
        
      if (result.success) {
        resetEventForm();
        setShowAddEvent(false);
        setIsEditing(false);
        setEditingId(null);
      }
    } catch (error) {
      console.error('Failed to save event:', error);
    }
    setSaving(false);
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    setDeleting(true);
    try {
      await deleteEvent(id);
      setShowEventDetails(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
    setDeleting(false);
  };

  const resetEventForm = () => {
    setForm({ 
      title: '', 
      start_time: '', 
      end_time: '', 
      color: '#6C63FF',
      description: '',
      source: 'manual'
    });
  };

  // Task CRUD operations
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
      
      const result = isEditing && editingId
        ? await updateTask(editingId, taskData)
        : await createTask(taskData);
        
      if (result.success) {
        resetTaskForm();
        setShowAddTask(false);
        setIsEditing(false);
        setEditingId(null);
        setSelectedDay(null);
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    }
    setSavingTask(false);
  };

  const handleDeleteTask = async (id) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    setDeleting(true);
    try {
      await deleteTask(id);
      setShowTaskDetails(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
    setDeleting(false);
  };

  const resetTaskForm = () => {
    setTaskForm({ 
      title: '', 
      description: '', 
      priority: 'medium', 
      due_date: '', 
      tags: '' 
    });
  };

  // Modal open functions
  const openTaskModal = (day, task = null) => {
    setSelectedDay(day);
    if (task) {
      // Edit mode
      setIsEditing(true);
      setEditingId(task.id || task._id);
      setTaskForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority || 'medium',
        due_date: task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd'T'HH:mm") : '',
        tags: task.tags ? task.tags.join(', ') : ''
      });
    } else {
      // Create mode
      setIsEditing(false);
      setEditingId(null);
      setTaskForm({
        ...taskForm,
        due_date: format(day, "yyyy-MM-dd'T'HH:mm")
      });
    }
    setShowAddTask(true);
  };

  const openEventModal = (day, event = null) => {
    setSelectedDay(day);
    if (event) {
      // Edit mode
      setIsEditing(true);
      setEditingId(event.id || event._id);
      setForm({
        title: event.title,
        start_time: format(new Date(event.start_time || event.start), "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(event.end_time || event.end), "yyyy-MM-dd'T'HH:mm"),
        color: event.color || '#6C63FF',
        description: event.description || '',
        source: event.source || 'manual'
      });
    } else {
      // Create mode
      setIsEditing(false);
      setEditingId(null);
      setForm({
        title: '',
        start_time: format(day, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(day.getTime() + 3600000), "yyyy-MM-dd'T'HH:mm"),
        color: '#6C63FF',
        description: '',
        source: 'manual'
      });
    }
    setShowAddEvent(true);
  };

  // Loading state
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 shrink-0 flex-wrap gap-2">
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
            onClick={() => {
              setIsEditing(false);
              setEditingId(null);
              resetEventForm();
              setShowAddEvent(true);
            }} 
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
            <input 
              type="text"
              placeholder="Description (optional)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 flex-1 min-w-32"
            />
            <div className="flex gap-1">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color}
                  onClick={() => setForm(p => ({ ...p, color }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    form.color === color ? 'border-primary scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button 
              onClick={handleAddEvent} 
              disabled={saving} 
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} 
              {isEditing ? 'Update' : 'Save'}
            </button>
            <button 
              onClick={() => {
                setShowAddEvent(false);
                setIsEditing(false);
                setEditingId(null);
                resetEventForm();
              }} 
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
                      <div 
                        key={e.id || e._id} 
                        onClick={(ev) => { ev.stopPropagation(); setShowEventDetails(e); }}
                        className={`text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 ${SOURCE_COLOR[e.source] || SOURCE_COLOR.manual}`}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayTasks.slice(0, 1).map(t => (
                      <div 
                        key={t.id || t._id} 
                        onClick={(ev) => { ev.stopPropagation(); setShowTaskDetails(t); }}
                        className="text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 bg-orange-400/10 border-orange-400/30 text-orange-400"
                      >
                        {PRIORITY_OPTIONS.find(p => p.value === t.priority)?.icon || ''} {t.title}
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
                    <div 
                      key={e.id || e._id} 
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:opacity-80 ${SOURCE_COLOR[e.source] || SOURCE_COLOR.manual}`}
                      onClick={() => setShowEventDetails(e)}
                    >
                      <div className="w-1 h-full min-h-12 rounded-full" style={{ backgroundColor: e.color || '#6C63FF' }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{e.title}</p>
                        <p className="text-xs opacity-70">
                          {format(new Date(e.start_time || e.start), 'h:mma')} – {format(new Date(e.end_time || e.end), 'h:mma')}
                        </p>
                        {e.description && <p className="text-xs opacity-60 mt-1">{e.description}</p>}
                      </div>
                    </div>
                  ))}
                  {getTasksForDay(selectedDay).map(t => (
                    <div 
                      key={t.id || t._id} 
                      className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:opacity-80 bg-orange-400/10 border-orange-400/30 text-orange-400"
                      onClick={() => setShowTaskDetails(t)}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-xs opacity-70">
                          Due {format(new Date(t.due_date), 'h:mma')} · {t.priority}
                        </p>
                        {t.description && <p className="text-xs opacity-60 mt-1">{t.description}</p>}
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
                        <div 
                          key={e.id || e._id} 
                          className={`text-xs px-1.5 py-1 rounded border truncate mb-0.5 cursor-pointer hover:opacity-80 ${SOURCE_COLOR[e.source] || SOURCE_COLOR.manual}`}
                          onClick={() => setShowEventDetails(e)}
                        >
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

      {/* Event Details Modal */}
      {showEventDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass rounded-xl max-w-md w-full p-6 border border-border animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Event Details
              </h2>
              <button
                onClick={() => setShowEventDetails(null)}
                className="p-1 hover:bg-secondary/60 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: showEventDetails.color || '#6C63FF' }} />
                <h3 className="text-lg font-semibold">{showEventDetails.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                <Clock className="w-4 h-4 inline mr-2" />
                {format(new Date(showEventDetails.start_time || showEventDetails.start), 'PPP p')} – {format(new Date(showEventDetails.end_time || showEventDetails.end), 'p')}
              </p>
              {showEventDetails.description && (
                <p className="text-sm">{showEventDetails.description}</p>
              )}
              <p className="text-xs text-muted-foreground">Source: {showEventDetails.source || 'manual'}</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEventDetails(null);
                  openEventModal(new Date(showEventDetails.start_time || showEventDetails.start), showEventDetails);
                }}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => handleDeleteEvent(showEventDetails.id || showEventDetails._id)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {showTaskDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass rounded-xl max-w-md w-full p-6 border border-border animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-primary" />
                Task Details
              </h2>
              <button
                onClick={() => setShowTaskDetails(null)}
                className="p-1 hover:bg-secondary/60 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{showTaskDetails.title}</h3>
              <p className="text-sm text-muted-foreground">
                <Flag className="w-4 h-4 inline mr-2" />
                Priority: {showTaskDetails.priority} {PRIORITY_OPTIONS.find(p => p.value === showTaskDetails.priority)?.icon}
              </p>
              {showTaskDetails.due_date && (
                <p className="text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Due: {format(new Date(showTaskDetails.due_date), 'PPP p')}
                </p>
              )}
              {showTaskDetails.description && (
                <p className="text-sm">{showTaskDetails.description}</p>
              )}
              {showTaskDetails.tags && showTaskDetails.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {showTaskDetails.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-secondary/60 rounded-full text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTaskDetails(null);
                  openTaskModal(new Date(showTaskDetails.due_date), showTaskDetails);
                }}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => handleDeleteTask(showTaskDetails.id || showTaskDetails._id)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass rounded-xl max-w-md w-full p-6 border border-border animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-primary" />
                {isEditing ? 'Edit Task' : 'Create Task'} for {selectedDay ? format(selectedDay, 'MMM d, yyyy') : ''}
              </h2>
              <button
                onClick={() => {
                  setShowAddTask(false);
                  setIsEditing(false);
                  setEditingId(null);
                  resetTaskForm();
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
                      <option key={p.value} value={p.value}>
                        {p.icon} {p.label}
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
                  {savingTask ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Task' : 'Create Task')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTask(false);
                    setIsEditing(false);
                    setEditingId(null);
                    resetTaskForm();
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
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Check,
  X,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useTasks } from '@/context/TaskContext';
import { useEvents } from '@/context/EventContext'; // ✅ NEW

const SOURCE_COLOR = {
  manual: 'bg-primary/20 border-primary/40 text-primary',
  google: 'bg-green-400/20 border-green-400/40 text-green-400',
  zoom: 'bg-blue-400/20 border-blue-400/40 text-blue-400',
  schedulfy: 'bg-cyan/20 border-cyan/40 text-cyan',
  task: 'bg-orange-400/20 border-orange-400/40 text-orange-400',
};

export default function CalendarPage() {
  const { tasks, loading: tasksLoading } = useTasks();
  const { events, loading: eventsLoading, createEvent, deleteEvent } = useEvents(); // ✅ Use events from context
  const navigate = useNavigate();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [form, setForm] = useState({ title: '', start_time: '', end_time: '', color: '#6C63FF' });
  const [saving, setSaving] = useState(false);

  // ✅ Use the context's createEvent instead of local state
  const handleAddEvent = async () => {
    if (!form.title || !form.start_time || !form.end_time) return;
    setSaving(true);
    
    try {
      await createEvent({
        title: form.title,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        source: 'manual',
        color: form.color,
      });
    } catch (err) {
      console.error('Failed to create event:', err);
    }
    
    setForm({ title: '', start_time: '', end_time: '', color: '#6C63FF' });
    setShowAddEvent(false);
    setSaving(false);
  };

  // ✅ Navigate to task with the specific task ID
  const handleTaskClick = (taskId) => {
    navigate(`/tasks?task=${taskId}`);
  };

  // ✅ Navigate to tasks page filtered by date
  const handleDayClick = (day) => {
    setSelectedDay(selectedDay && isSameDay(selectedDay, day) ? null : day);
  };

  // ✅ Navigate to tasks page with date filter
  const handleViewAllTasks = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    navigate(`/tasks?date=${dateStr}`);
  };

  const getTaskKey = (task, index) => {
    return task.id || task._id || task.task_id || `task-${index}`;
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDay = (day) => events.filter((e) => isSameDay(new Date(e.start_time), day));
  const getTasksForDay = (day) =>
    tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), day));

  const prev = () =>
    view === 'month'
      ? setCurrentDate(subMonths(currentDate, 1))
      : setCurrentDate(subWeeks(currentDate, 1));
  const next = () =>
    view === 'month'
      ? setCurrentDate(addMonths(currentDate, 1))
      : setCurrentDate(addWeeks(currentDate, 1));

  const isLoading = tasksLoading || eventsLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar - same as before */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={prev} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-heading text-xl font-bold tracking-wide min-w-48 text-center">
            {view === 'month'
              ? format(currentDate, 'MMMM yyyy')
              : `${format(weekStart, 'MMM d')} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`}
          </h2>
          <button onClick={next} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary/60 border border-border rounded-lg p-1">
            {['month', 'week'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddEvent(true)}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>
      </div>

      {/* Add Event Form - Updated to use handleAddEvent */}
      {showAddEvent && (
        <div className="px-6 py-4 border-b border-border bg-card/50 shrink-0">
          <div className="flex items-end gap-3 flex-wrap">
            <input
              placeholder="Event title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 flex-1 min-w-48"
            />
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
              className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
            <input
              type="datetime-local"
              value={form.end_time}
              onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
              className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
            <button
              onClick={handleAddEvent}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}{' '}
              Save
            </button>
            <button
              onClick={() => setShowAddEvent(false)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Calendar Content - same as before but using events from context */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'month' ? (
        /* Month View - same as before */
        <div className="flex-1 p-4 overflow-auto">
          <div className="grid grid-cols-7 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const dayTasks = getTasksForDay(day);
              const total = dayEvents.length + dayTasks.length;
              const isCurrentMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              const isSelected = selectedDay && isSameDay(selectedDay, day);
              
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[80px] p-2 rounded-lg border cursor-pointer transition-all hover:border-primary/30
                    ${today ? 'border-primary/50 bg-primary/5' : 'border-border'}
                    ${!isCurrentMonth ? 'opacity-40' : ''}
                    ${isSelected ? 'bg-secondary/60 border-primary/50 ring-1 ring-primary/30' : 'bg-card/40 hover:bg-secondary/30'}`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full
                      ${today ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}
                    >
                      {format(day, 'd')}
                    </div>
                    {dayTasks.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewAllTasks(day);
                        }}
                        className="text-[10px] text-primary hover:underline"
                      >
                        {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className={`text-xs px-1.5 py-0.5 rounded border truncate ${SOURCE_COLOR[e.source] || SOURCE_COLOR.manual}`}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayTasks.slice(0, 1).map((t) => {
                      const key = getTaskKey(t);
                      return (
                        <div
                          key={key}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskClick(t.id);
                          }}
                          className={`text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity
                            bg-orange-400/10 border-orange-400/30 text-orange-400 group flex items-center justify-between`}
                        >
                          <span>📌 {t.title}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      );
                    })}
                    {total > 3 && (
                      <div className="text-xs text-muted-foreground">+{total - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedDay && (
            <div className="mt-4 glass rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-base font-bold tracking-wide">
                  {format(selectedDay, 'EEEE, MMMM d')}
                </h3>
                <button
                  onClick={() => handleViewAllTasks(selectedDay)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View all tasks <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {getEventsForDay(selectedDay).length === 0 &&
              getTasksForDay(selectedDay).length === 0 ? (
                <p className="text-muted-foreground text-sm">Nothing scheduled for this day.</p>
              ) : (
                <div className="space-y-2">
                  {getEventsForDay(selectedDay).map((e) => (
                    <div
                      key={e.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${SOURCE_COLOR[e.source] || SOURCE_COLOR.manual}`}
                    >
                      <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{e.title}</p>
                        <p className="text-xs opacity-70">
                          {format(new Date(e.start_time), 'h:mma')} –{' '}
                          {format(new Date(e.end_time), 'h:mma')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {getTasksForDay(selectedDay).map((t) => {
                    const key = getTaskKey(t);
                    return (
                      <div
                        key={key}
                        onClick={() => handleTaskClick(t.id)}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-orange-400/10 border-orange-400/30 text-orange-400 cursor-pointer hover:bg-orange-400/20 transition-all group"
                      >
                        <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{t.title}</p>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-xs opacity-70">
                            Due {format(new Date(t.due_date), 'h:mma')} · {t.priority || 'Medium'}
                          </p>
                          {t.status === 'done' && (
                            <span className="text-xs text-green-400">✅ Completed</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Week View - same as before */
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-8 border-b border-border sticky top-0 bg-card z-10">
            <div className="p-2 border-r border-border" />
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`p-3 text-center border-r border-border ${isToday(day) ? 'bg-primary/5' : ''}`}
              >
                <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
                <p
                  className={`text-lg font-heading font-bold ${isToday(day) ? 'text-primary' : 'text-foreground'}`}
                >
                  {format(day, 'd')}
                </p>
              </div>
            ))}
          </div>
          <div>
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-border/30 min-h-14">
                <div className="p-2 border-r border-border text-xs text-muted-foreground text-right pr-3 pt-1">
                  {hour === 0 ? '' : `${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}`}
                </div>
                {weekDays.map((day) => {
                  const hourEvents = events.filter(
                    (e) =>
                      isSameDay(new Date(e.start_time), day) &&
                      new Date(e.start_time).getHours() === hour
                  );
                  const hourTasks = tasks.filter(
                    (t) =>
                      t.due_date &&
                      isSameDay(new Date(t.due_date), day) &&
                      new Date(t.due_date).getHours() === hour
                  );
                  const allItems = [...hourEvents, ...hourTasks];
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`border-r border-border/30 p-0.5 ${isToday(day) ? 'bg-primary/3' : ''}`}
                    >
                      {allItems.slice(0, 3).map((item) => {
                        const isTask = item.status !== undefined;
                        const key = isTask ? getTaskKey(item) : item.id;
                        
                        if (isTask) {
                          return (
                            <div
                              key={key}
                              onClick={() => handleTaskClick(item.id)}
                              className="text-xs px-1.5 py-1 rounded border truncate mb-0.5 
                                bg-orange-400/10 border-orange-400/30 text-orange-400 
                                cursor-pointer hover:bg-orange-400/20 transition-colors group
                                flex items-center justify-between"
                            >
                              <span>📌 {item.title}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          );
                        }
                        
                        return (
                          <div
                            key={key}
                            className={`text-xs px-1.5 py-1 rounded border truncate mb-0.5 ${SOURCE_COLOR[item.source] || SOURCE_COLOR.manual}`}
                          >
                            {item.title}
                          </div>
                        );
                      })}
                      {allItems.length > 3 && (
                        <div className="text-[10px] text-muted-foreground text-center">
                          +{allItems.length - 3} more
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
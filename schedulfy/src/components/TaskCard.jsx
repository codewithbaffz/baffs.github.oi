import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle, Clock, Tag, Paperclip, MessageSquare, AlertTriangle, Zap, ChevronDown } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
  urgent: { label: 'Urgent', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
};

const STATUS_CONFIG = {
  todo: { label: 'To Do', color: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', color: 'text-primary' },
  done: { label: 'Done', color: 'text-green-400' },
  overdue: { label: 'Overdue', color: 'text-destructive' },
  snoozed: { label: 'Snoozed', color: 'text-yellow-400' },
};

export default function TaskCard({ task, onUpdate, onDelete, onClick, compact = false }) {
  const [completing, setCompleting] = useState(false);
  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;

  const isDone = task.status === 'done';
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isDone;
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const toggleDone = async (e) => {
    e.stopPropagation();
    if (completing) return;
    const newStatus = isDone ? 'todo' : 'done';
    
    // Preserve all task properties including the ID field
    const updated = { 
      ...task,  // Spread all existing properties
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    };
    
    onUpdate?.(updated);
  };

  if (compact) {
    return (
      <div
        onClick={() => onClick?.(task)}
        className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-primary/30 hover:bg-secondary/50
          ${isDone ? 'opacity-50 border-border' : isOverdue ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'}`}
      >
        <button onClick={toggleDone} className="mt-0.5 shrink-0 transition-transform hover:scale-110">
          {completing ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : isDone ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {task.title}
          </p>
          {task.due_date && (
            <p className={`text-xs mt-0.5 flex items-center gap-1
              ${isOverdue ? 'text-destructive' : isDueToday ? 'text-yellow-400' : 'text-muted-foreground'}`}>
              <Clock className="w-3 h-3" />
              {isOverdue ? 'Overdue · ' : isDueToday ? 'Today · ' : ''}
              {format(new Date(task.due_date), 'MMM d, h:mma')}
            </p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${pc.bg} ${pc.color} shrink-0`}>
          {pc.label}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick?.(task)}
      className={`group p-4 rounded-xl border transition-all cursor-pointer hover:shadow-lg hover:border-primary/40
        ${isDone ? 'opacity-60 border-border' : isOverdue ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card hover:bg-card/80'}`}
    >
      <div className="flex items-start gap-3">
        <button onClick={toggleDone} className="mt-0.5 shrink-0 transition-transform hover:scale-110">
          {completing ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : isDone ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-medium text-sm leading-snug ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {task.title}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${pc.bg} ${pc.color}`}>
              {pc.label}
            </span>
          </div>

          {task.description && !isDone && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {task.due_date && (
              <span className={`text-xs flex items-center gap-1
                ${isOverdue ? 'text-destructive' : isDueToday ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                {isOverdue && <AlertTriangle className="w-3 h-3" />}
                <Clock className="w-3 h-3" />
                {format(new Date(task.due_date), 'MMM d, h:mma')}
              </span>
            )}
            {task.tags && task.tags.length > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {task.tags.slice(0, 2).join(', ')}
              </span>
            )}
            {task.attachments && task.attachments.length > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> {task.attachments.length}
              </span>
            )}
            {task.is_ai_generated && (
              <span className="text-xs text-cyan flex items-center gap-1">
                <Zap className="w-3 h-3" /> AI
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
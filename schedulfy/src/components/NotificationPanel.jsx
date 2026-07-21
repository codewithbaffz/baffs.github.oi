/* eslint-disable unused-imports/no-unused-imports, unused-imports/no-unused-vars */
import { useEffect, useState } from 'react';
import { schedulfy } from '@/api/schedulfyClient';
import { Bell, Zap, AlertTriangle, MessageSquare, UserPlus, CheckSquare, X } from 'lucide-react';

/** @type {any} */
const _sched = schedulfy;
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
  reminder_1day: { icon: Bell, color: 'text-primary', bg: 'bg-primary/10' },
  reminder_1hour: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  overdue: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  conflict: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  mention: { icon: MessageSquare, color: 'text-cyan', bg: 'bg-cyan/10' },
  assignment: { icon: UserPlus, color: 'text-primary', bg: 'bg-primary/10' },
  team_update: { icon: UserPlus, color: 'text-green-400', bg: 'bg-green-400/10' },
  ai_suggestion: { icon: Zap, color: 'text-cyan', bg: 'bg-cyan/10' },
};

export default function NotificationPanel({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    // placeholder: schedulfy may not be wired yet
    try {
    const user = await _sched.auth.me();
    const data = await _sched.entities.Notification.filter(
        { user_id: user.id },
        '-created_date',
        30
      );
      setNotifications(data);
    } catch {
      setNotifications([]);
    }
    setLoading(false);
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    try {
      await Promise.all(
        unread.map((n) => _sched.entities.Notification.update(n.id, { is_read: true }))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const markRead = async (id) => {
    try {
      await _sched.entities.Notification.update(id, { is_read: true });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-96 bg-card border-l border-border flex flex-col animate-slide-in shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-heading text-lg font-bold tracking-wide">NOTIFICATIONS</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <CheckSquare className="w-3 h-3" /> Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Bell className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {notifications.map((notif) => {
                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.reminder_1day;
                const Icon = config.icon;
                return (
                  <div
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    className={`flex gap-3 p-3 rounded-lg cursor-pointer transition-all ${notif.is_read ? 'opacity-60' : 'bg-secondary/50'} hover:bg-secondary`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}
                    >
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

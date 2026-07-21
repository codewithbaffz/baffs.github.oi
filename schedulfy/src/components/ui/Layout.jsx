import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { schedulfy } from '@/api/schedulfyClient';
import {
  LayoutDashboard, CheckSquare, Calendar, FolderOpen, Users, Zap,
  FileText, Settings as SettingsIcon, Bell, LogOut, Menu, X, Sparkles, Timer, ChevronRight
} from 'lucide-react';
import NotificationPanel from './NotificationPanel';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: FolderOpen, label: 'Projects', path: '/projects' },
  { icon: Users, label: 'Team', path: '/team' },
  { icon: Zap, label: 'Insights', path: '/insights' },
  { icon: FileText, label: 'Templates', path: '/templates' },
  { icon: Timer, label: 'Focus', path: '/focus' },
  { icon: SettingsIcon, label: 'Settings', path: '/settings' },
];

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = () => schedulfy.auth.logout('/');

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col transition-all duration-300 ease-in-out border-r border-sidebar-border
          ${sidebarOpen ? 'w-56' : 'w-16'}
          bg-sidebar shrink-0 z-30`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 glow-indigo">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-display text-xl font-bold tracking-wider text-white">
              SCHEDULFY
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-all duration-200 group
                  ${active
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
                  }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : ''}`} />
                {sidebarOpen && (
                  <span className={`text-sm font-medium truncate ${active ? 'text-primary' : ''}`}>
                    {label}
                  </span>
                )}
                {sidebarOpen && active && (
                  <ChevronRight className="w-3 h-3 ml-auto text-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-white transition-all w-full"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            {sidebarOpen && <span className="text-sm font-medium">Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse-glow" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>

      {/* Notification Panel */}
      {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
    </div>
  );
}
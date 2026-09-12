import { useState } from 'react';
import { useLocation, Link, Outlet } from 'react-router-dom';
import NotificationPanel from './NotificationPanel';
import { base44 } from '@/api/base44Client';
import { useNotifications } from '@/hooks/useNotifications';

import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  FolderOpen,
  Users,
  Zap,
  FileText,
  Settings as SettingsIcon,
  Timer,
  Sparkles,
  ChevronRight,
  X,
  Menu,
  LogOut,
  Bell,
  ChevronsUpDown,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { hasUnread } = useNotifications();
  const { workspaces, currentWorkspace, selectWorkspace } = useWorkspace();

  const handleLogout = () => base44.auth.logout('/');

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out border-r border-sidebar-border bg-sidebar shrink-0 w-64
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
          ${sidebarOpen ? 'md:w-56' : 'md:w-16'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 glow-indigo">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-xl font-bold tracking-wider text-white md:hidden">
            SCHEDULFY
          </span>
          {sidebarOpen && (
            <span className="hidden md:inline font-display text-xl font-bold tracking-wider text-white">
              SCHEDULFY
            </span>
          )}
          <button
            onClick={closeMobileMenu}
            className="ml-auto p-1 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-white transition-all md:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-all duration-200 group
                  ${
                    active
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
                  }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : ''}`} />
                <span className={`text-sm font-medium truncate md:hidden ${active ? 'text-primary' : ''}`}>
                  {label}
                </span>
                {sidebarOpen && (
                  <span className={`hidden md:inline text-sm font-medium truncate ${active ? 'text-primary' : ''}`}>
                    {label}
                  </span>
                )}
                {active && <ChevronRight className="w-3 h-3 ml-auto text-primary md:hidden" />}
                {sidebarOpen && active && <ChevronRight className="hidden md:inline w-3 h-3 ml-auto text-primary" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-white transition-all w-full"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            {sidebarOpen && <span className="text-sm font-medium">Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="flex items-center justify-between gap-2 px-4 md:px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <ChevronsUpDown className="hidden sm:block w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={currentWorkspace ? String(currentWorkspace.id || currentWorkspace._id) : ''}
              onChange={(event) => selectWorkspace(event.target.value)}
              className="workspace-selector max-w-40 sm:max-w-64 rounded-lg border border-border bg-card px-2 sm:px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none cursor-pointer"
              aria-label="Select workspace"
            >
              {workspaces.length === 0 && <option value="">No workspaces</option>}
              {workspaces.map((workspace) => {
                const id = String(workspace.id || workspace._id);
                return <option key={id} value={id}>{workspace.name}</option>;
              })}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <Bell className="w-5 h-5" />
              {hasUnread && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse-glow" />
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet/>
        </main>
      </div>

      {/* Notification Panel */}
      {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
    </div>
  );
}
import { Link, Outlet } from 'react-router-dom';
// React import removed (automatic JSX runtime)

export default function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-4 border-b bg-white/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-heading font-bold">
            Schedulfy
          </Link>
          <nav>
            <Link to="/tasks" className="mr-4">
              Tasks
            </Link>
            <Link to="/calendar">Calendar</Link>
          </nav>
        </div>
      </header>
      <main className="p-6 max-w-7xl mx-auto">
        <Outlet />
      </main>
      <footer className="p-4 text-center text-sm text-muted-foreground">© Schedulfy</footer>
    </div>
  );
}

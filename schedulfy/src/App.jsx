

export default function App() {
  return (
    <WorkspaceProvider>
      <TaskProvider>
        <EventProvider>
        <Routes>
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />  
          <Route path="/reset-password" element={<ResetPassword />} />    
          <Route path="/accept-invite" element={<AcceptInvitation />} />
          
          {/* Protected routes - require authentication */}
          <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/focus" element={<Focus />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/team" element={<Team />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/templates" element={<Templates />} />
            </Route>
          </Route>
          
          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </EventProvider>
      </TaskProvider>
    </WorkspaceProvider>
  );
}
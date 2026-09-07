import { Routes, Route, Navigate } from "react-router-dom";
import { TaskProvider } from "./context/TaskContext";
import { EventProvider } from "./context/EventContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import CalendarPage from "./pages/CalendarPage";
import Focus from "./pages/Focus";
import Insights from "./pages/Insights";
import Projects from "./pages/Projects";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import Templates from "./pages/Templates";
import { useAuth } from "./lib/AuthContext";
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvitation from './pages/AcceptInvitation';


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
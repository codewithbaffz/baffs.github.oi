import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { API_BASE } from '@/lib/sdk';

const WorkspaceContext = createContext(null);
const SELECTED_WORKSPACE_KEY = 'selectedWorkspaceId';

export function WorkspaceProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(
    () => localStorage.getItem(SELECTED_WORKSPACE_KEY)
  );
  const [loading, setLoading] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setWorkspaces([]);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/workspace`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load workspaces');

      const data = await response.json();
      const nextWorkspaces = Array.isArray(data) ? data : [];
      setWorkspaces(nextWorkspaces);

      const storedWorkspaceExists = nextWorkspaces.some(
        (workspace) => String(workspace.id || workspace._id) === String(currentWorkspaceId)
      );
      if (!storedWorkspaceExists && nextWorkspaces[0]) {
        setCurrentWorkspaceId(String(nextWorkspaces[0].id || nextWorkspaces[0]._id));
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, isAuthenticated, user]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (currentWorkspaceId) {
      localStorage.setItem(SELECTED_WORKSPACE_KEY, currentWorkspaceId);
    } else {
      localStorage.removeItem(SELECTED_WORKSPACE_KEY);
    }
  }, [currentWorkspaceId]);

  const selectWorkspace = useCallback((workspaceId) => {
    setCurrentWorkspaceId(String(workspaceId));
  }, []);

  const currentWorkspace = workspaces.find(
    (workspace) => String(workspace.id || workspace._id) === String(currentWorkspaceId)
  ) || null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        currentWorkspaceId,
        selectWorkspace,
        fetchWorkspaces,
        loading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return context;
}
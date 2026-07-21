import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { schedulfy } from '@/api/schedulfyClient';

const TaskContext = createContext();

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Load initial tasks
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await schedulfy.tasks.getAll();
      setTasks(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // CRUD operations with automatic state updates
  const createTask = useCallback(async (taskData) => {
    try {
      const created = await schedulfy.tasks.create(taskData);
      setTasks(prev => [created, ...prev]);
      return created;
    } catch (err) {
      setError(err.message || 'Failed to create task');
      throw err;
    }
  }, []);

  const updateTask = useCallback(async (id, updates) => {
    try {
      const updated = await schedulfy.tasks.update(id, updates);
      setTasks(prev => prev.map(task => {
        const taskId = task.id || task._id || task.task_id;
        const updateId = updated.id || updated._id || updated.task_id;
        return taskId === updateId ? updated : task;
      }));
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to update task');
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (id) => {
    try {
      await schedulfy.tasks.delete(id);
      setTasks(prev => prev.filter(task => {
        const taskId = task.id || task._id || task.task_id;
        return taskId !== id;
      }));
    } catch (err) {
      setError(err.message || 'Failed to delete task');
      throw err;
    }
  }, []);

  // Polling subscription (fallback if WebSocket not available)
  const subscribe = useCallback(() => {
    if (isSubscribed) return;

    const interval = setInterval(() => {
      loadTasks();
    }, 30000); // Poll every 30 seconds

    setIsSubscribed(true);
    return () => {
      clearInterval(interval);
      setIsSubscribed(false);
    };
  }, [isSubscribed, loadTasks]);

  // Auto-load and subscribe on mount
  useEffect(() => {
    loadTasks();
    const unsubscribe = subscribe();
    return () => unsubscribe?.();
  }, []); // Empty deps - run once on mount

  const value = {
    tasks,
    loading,
    error,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    subscribe,
    isSubscribed,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

// Custom hook for using the task context
export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
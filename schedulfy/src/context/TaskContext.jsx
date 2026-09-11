// TaskContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import schedulfySDK from '@/lib/sdk';

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to get task ID (handles both _id and id)
  const getTaskId = (task) => {
    if (!task) return null;
    // Return _id if it exists (MongoDB), otherwise fallback to id
    return task._id || task.id || null;
  };

  // Normalize task to have both _id and id for compatibility
  const normalizeTask = (task) => {
    if (!task) return task;
    return {
      ...task,
      id: task._id || task.id, // Ensure id is always set
      _id: task._id || task.id, // Ensure _id is always set
    };
  };

  // Normalize an array of tasks
  const normalizeTasks = (tasksArray) => {
    if (!Array.isArray(tasksArray)) return [];
    return tasksArray.map(normalizeTask);
  };

  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setTasks([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await schedulfySDK.tasks.getAll();
      console.log(' Fetched tasks from API:', data);
      
      // Normalize all tasks to have both _id and id
      const normalizedTasks = normalizeTasks(data);
      setTasks(normalizedTasks);
      console.log(' Normalized tasks:', normalizedTasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err.message || 'Failed to load tasks');
      
      if (err.status === 401) {
        localStorage.removeItem('authToken');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const createTask = useCallback(async (taskData) => {
    try {
      setLoading(true);
      const newTask = await schedulfySDK.tasks.create(taskData);
      console.log(' Created task:', newTask);
      
      // Normalize the new task
      const normalizedTask = normalizeTask(newTask);
      setTasks(prev => [normalizedTask, ...prev]);
      
      return { success: true, data: normalizedTask };
    } catch (err) {
      console.error('Error creating task:', err);
      setError(err.message || 'Failed to create task');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (taskId, updates) => {
    try {
      setLoading(true);
      
      console.log(' updateTask - ID received:', taskId);
      console.log(' updateTask - Updates:', updates);
      
      if (!taskId) {
        console.error(' No task ID provided');
        return { success: false, error: 'No task ID provided' };
      }
      
      // Find the task in local state
      const existingTask = tasks.find(t => 
        String(t._id) === String(taskId) || 
        String(t.id) === String(taskId)
      );
      
      if (!existingTask) {
        console.error(' Task not found in local state:', taskId);
        console.log('Available tasks:', tasks.map(t => ({ _id: t._id, id: t.id, title: t.title })));
        return { success: false, error: 'Task not found' };
      }
      
      // Use the _id for the API call (MongoDB)
      const idToUse = existingTask._id || taskId;
      console.log(' Using _id for update:', idToUse);
      
      const updatedTask = await schedulfySDK.tasks.update(idToUse, updates);
      console.log(' Updated task received:', updatedTask);
      
      // Normalize the updated task
      const normalizedTask = normalizeTask(updatedTask);
      
      // Update state
      setTasks(prev => {
        const newTasks = prev.map(task => {
          // Check both _id and id
          if (String(task._id) === String(taskId) || String(task.id) === String(taskId)) {
            console.log(' Updating task in state:', taskId);
            return normalizedTask;
          }
          return task;
        });
        console.log(' Updated tasks count:', newTasks.length);
        return newTasks;
      });
      
      return { success: true, data: normalizedTask };
    } catch (err) {
      console.error(' Error updating task:', err);
      setError(err.message || 'Failed to update task');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [tasks]);

  const deleteTask = useCallback(async (taskId) => {
    try {
      setLoading(true);
      
      if (!taskId) {
        console.error(' No task ID provided for deletion');
        return { success: false, error: 'No task ID provided' };
      }
      
      // Find the task in local state
      const existingTask = tasks.find(t => 
        String(t._id) === String(taskId) || 
        String(t.id) === String(taskId)
      );
      
      if (!existingTask) {
        console.error(' Task not found for deletion:', taskId);
        return { success: false, error: 'Task not found' };
      }
      
      // Use the _id for the API call
      const idToUse = existingTask._id || taskId;
      console.log(' Deleting task with _id:', idToUse);
      
      await schedulfySDK.tasks.delete(idToUse);
      
      setTasks(prev => {
        const newTasks = prev.filter(task => {
          const match = String(task._id) !== String(taskId) && String(task.id) !== String(taskId);
          if (!match) {
            console.log(' Removed task:', taskId);
          }
          return match;
        });
        console.log(' Remaining tasks:', newTasks.length);
        return newTasks;
      });
      
      return { success: true };
    } catch (err) {
      console.error(' Error deleting task:', err);
      setError(err.message || 'Failed to delete task');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [tasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        error,
        fetchTasks,
        createTask,
        updateTask,
        deleteTask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
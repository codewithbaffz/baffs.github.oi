// TaskContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import schedulfySDK from '@/lib/sdk';

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to get task ID
  const getTaskId = (task) => {
    return task?.id || task?._id || task?.task_id || null;
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
      console.log('📋 Fetched tasks:', data);
      setTasks(data || []);
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
      console.log('✅ Created task:', newTask);
      setTasks(prev => [...prev, newTask]);
      return { success: true, data: newTask };
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
      
      console.log('📤 updateTask - ID received:', taskId);
      console.log('📤 updateTask - Updates:', updates);
      
      if (!taskId) {
        console.error('❌ No task ID provided');
        return { success: false, error: 'No task ID provided' };
      }
      
      const updatedTask = await schedulfySDK.tasks.update(taskId, updates);
      console.log('✅ Updated task received:', updatedTask);
      
      // ✅ FIX: Check BOTH id AND _id fields
      setTasks(prev => {
        const newTasks = prev.map(task => {
          const currentId = getTaskId(task);
          if (String(currentId) === String(taskId)) {
            console.log('✅ Updating task in state:', taskId);
            return updatedTask;
          }
          return task;
        });
        console.log('📊 Updated tasks count:', newTasks.length);
        return newTasks;
      });
      
      return { success: true, data: updatedTask };
    } catch (err) {
      console.error('❌ Error updating task:', err);
      setError(err.message || 'Failed to update task');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    try {
      setLoading(true);
      
      if (!taskId) {
        console.error('❌ No task ID provided for deletion');
        return { success: false, error: 'No task ID provided' };
      }
      
      await schedulfySDK.tasks.delete(taskId);
      
      setTasks(prev => {
        const newTasks = prev.filter(task => {
          const currentId = getTaskId(task);
          return String(currentId) !== String(taskId);
        });
        console.log('🗑️ Deleted task, remaining:', newTasks.length);
        return newTasks;
      });
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err.message || 'Failed to delete task');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

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
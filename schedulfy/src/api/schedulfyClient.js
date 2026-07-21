// src/api/schedulfyClient.js
import schedulfySDK from '../lib/sdk';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...opts.headers,
  };
  
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers,
    });
    
    // For 204 No Content responses
    if (res.status === 204) {
      return null;
    }
    
    const data = await res.json();
    
    if (!res.ok) {
      throw {
        status: res.status,
        message: data.message || data.error || `${res.status} ${res.statusText}`,
        data: data,
      };
    }
    
    return data;
  } catch (error) {
    // If it's a network error or our custom error
    if (error.status === 401) {
      localStorage.removeItem('authToken');
    }
    throw error;
  }
}

// Export the SDK instance directly
export const schedulfy = schedulfySDK;

// Also export individual methods for convenience
export const { auth, tasks, events, calendar, reminders, categories, dragAndDrop, recurring, search, preferences, stats } = schedulfySDK;

export default { apiFetch, schedulfy };
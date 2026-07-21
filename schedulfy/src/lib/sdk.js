// src/lib/sdk.js

// Base API configuration
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.statusText}`);
  }
  return response.json();
}

// Create axios client (for compatibility)
export function createAxiosClient(config) {
  // This returns a fetch-based client that mimics axios
  return {
    get: async (url) => {
      const response = await fetch(`${config.baseURL || ''}${url}`, {
        headers: {
          ...config.headers,
          ...(config.token && { Authorization: `Bearer ${config.token}` }),
        },
      });
      if (!response.ok) {
        let error = {};
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            error = await response.json();
          } else {
            error = { message: response.statusText };
          }
        } catch {
          error = { message: response.statusText };
        }
        throw { status: response.status, data: error, message: error.message || response.statusText };
      }
      return response.json();
    },
    post: async (url, data) => {
      const response = await fetch(`${config.baseURL || ''}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
          ...(config.token && { Authorization: `Bearer ${config.token}` }),
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let error = {};
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            error = await response.json();
          } else {
            error = { message: response.statusText };
          }
        } catch {
          error = { message: response.statusText };
        }
        throw { status: response.status, data: error, message: error.message || response.statusText };
      }
      return response.json();
    },
    // Add other methods as needed
  };
}

// Auth methods with redirect support
const auth = {
  login: (email, password) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (userData) =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  logout: (redirectUrl) => {
    localStorage.removeItem('authToken');
    if (redirectUrl) {
      window.location.href = '/login';
    }
  },

  getCurrentUser: () => apiCall('/auth/me'),

  // Alias for getCurrentUser
  me: () => apiCall('/auth/me'),

  redirectToLogin: (returnUrl) => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('demo_user');
    window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl || window.location.href)}`;
  },
};

export const schedulfySDK = {
  auth,
  tasks: {
    getAll: () => apiCall('/tasks'),

    create: (taskData) =>
      apiCall('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      }),

    update: (id, taskData) =>
      apiCall(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(taskData),
      }),

    delete: (id) =>
      apiCall(`/tasks/${id}`, {
        method: 'DELETE',
      }),
  },
  // ============ EVENTS / TASKS ============
  events: {
    getAll: (filters = {}) => apiCall(`/events?${new URLSearchParams(filters)}`),

    getById: (id) => apiCall(`/events/${id}`),

    getByDate: (date) => apiCall(`/events/date/${date}`),

    getByDateRange: (startDate, endDate) =>
      apiCall(`/events/range?start=${startDate}&end=${endDate}`),

    create: (eventData) =>
      apiCall('/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      }),

    update: (id, eventData) =>
      apiCall(`/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(eventData),
      }),

    delete: (id) =>
      apiCall(`/events/${id}`, {
        method: 'DELETE',
      }),
  },

  // ============ CALENDAR VIEWS ============
  calendar: {
    getMonthlyView: (year, month) => apiCall(`/calendar/${year}/${month}`),

    getWeeklyView: (year, week) => apiCall(`/calendar/week/${year}/${week}`),

    syncCalendar: (calendarData) =>
      apiCall('/calendar/sync', {
        method: 'POST',
        body: JSON.stringify(calendarData),
      }),
  },

  // ============ REMINDERS / NOTIFICATIONS ============
  reminders: {
    getAll: () => apiCall('/reminders'),

    create: (reminderData) =>
      apiCall('/reminders', {
        method: 'POST',
        body: JSON.stringify(reminderData),
      }),

    update: (id, reminderData) =>
      apiCall(`/reminders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(reminderData),
      }),

    delete: (id) =>
      apiCall(`/reminders/${id}`, {
        method: 'DELETE',
      }),
  },

  // ============ CATEGORIES / TAGS ============
  categories: {
    getAll: () => apiCall('/categories'),

    create: (categoryData) =>
      apiCall('/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
      }),

    delete: (id) =>
      apiCall(`/categories/${id}`, {
        method: 'DELETE',
      }),
  },

  // ============ DRAG & DROP SUPPORT ============
  dragAndDrop: {
    moveEvent: (eventId, newDate, newTime) =>
      apiCall(`/events/${eventId}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ date: newDate, time: newTime }),
      }),

    resizeEvent: (eventId, newDuration) =>
      apiCall(`/events/${eventId}/resize`, {
        method: 'PATCH',
        body: JSON.stringify({ duration: newDuration }),
      }),
  },

  // ============ RECURRING EVENTS ============
  recurring: {
    createRecurring: (eventData, recurrencePattern) =>
      apiCall('/events/recurring', {
        method: 'POST',
        body: JSON.stringify({ ...eventData, recurrence: recurrencePattern }),
      }),

    updateRecurring: (seriesId, eventData) =>
      apiCall(`/events/recurring/${seriesId}`, {
        method: 'PUT',
        body: JSON.stringify(eventData),
      }),

    deleteRecurring: (seriesId) =>
      apiCall(`/events/recurring/${seriesId}`, {
        method: 'DELETE',
      }),
  },

  // ============ SEARCH ============
  search: {
    query: (searchTerm, filters = {}) =>
      apiCall(`/search?q=${encodeURIComponent(searchTerm)}&${new URLSearchParams(filters)}`),
  },

  // ============ USER PREFERENCES ============
  preferences: {
    get: () => apiCall('/preferences'),

    update: (preferences) =>
      apiCall('/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences),
      }),
  },

  // ============ PRODUCTIVITY STATISTICS ============
  stats: {
    getDaily: (date) => apiCall(`/stats/daily/${date}`),

    getWeekly: (startDate) => apiCall(`/stats/weekly/${startDate}`),

    getMonthly: (year, month) => apiCall(`/stats/monthly/${year}/${month}`),

    getProductivityScore: (dateRange) =>
      apiCall('/stats/productivity-score', {
        method: 'POST',
        body: JSON.stringify(dateRange),
      }),
  },
};

// Export both the SDK and individual utilities
export default schedulfySDK;

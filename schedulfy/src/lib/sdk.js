// src/lib/sdk.js

// Base API configuration
const API_BASE = import.meta.env.VITE_API_URL || '/api';
console.log('API_BASE=', API_BASE);

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

// Helper function to extract ID from various formats
function extractId(id) {
  if (!id) return null;
  if (typeof id === 'string') return id;
  if (typeof id === 'object') {
    if (id.id) return String(id.id);
    if (id._id) return String(id._id);
    if (id.task && (id.task.id || id.task._id)) {
      return String(id.task.id || id.task._id);
    }
    console.warn('ExtractId received object without id/_id:', id);
    return null;
  }
  return String(id);
}

// Create axios client (for compatibility)
export function createAxiosClient(config) {
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

  me: () => apiCall('/auth/me'),

  redirectToLogin: (returnUrl) => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('demo_user');
    window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl || window.location.href)}`;
  },

  // ✅ ADDED: Forgot Password
  forgotPassword: (email) =>
    apiCall('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // ✅ ADDED: Reset Password
  resetPassword: (data) =>
    apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ✅ ADDED: Verify OTP (if needed)
  verifyOtp: (data) =>
    apiCall('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ✅ ADDED: Resend OTP (if needed)
  resendOtp: (email) =>
    apiCall('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
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

    update: (id, taskData) => {
      const taskId = extractId(id);
      if (!taskId) {
        console.error('Invalid task ID:', id);
        throw new Error('Invalid task ID: ' + JSON.stringify(id));
      }
      console.log('SDK Update - ID:', taskId);
      return apiCall(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(taskData),
      });
    },

    delete: (id) => {
      const taskId = extractId(id);
      if (!taskId) {
        console.error('Invalid task ID:', id);
        throw new Error('Invalid task ID: ' + JSON.stringify(id));
      }
      console.log('SDK Delete - ID:', taskId);
      return apiCall(`/tasks/${taskId}`, {
        method: 'DELETE',
      });
    },
  },

  // ============ EVENTS ============
  events: {
    getAll: (filters = {}) => apiCall(`/events?${new URLSearchParams(filters)}`),

    getById: (id) => {
      const eventId = extractId(id);
      return apiCall(`/events/${eventId}`);
    },

    getByDate: (date) => apiCall(`/events/date/${date}`),

    getByDateRange: (startDate, endDate) =>
      apiCall(`/events/range?start=${startDate}&end=${endDate}`),

    create: (eventData) =>
      apiCall('/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      }),

    update: (id, eventData) => {
      const eventId = extractId(id);
      return apiCall(`/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(eventData),
      });
    },

    delete: (id) => {
      const eventId = extractId(id);
      return apiCall(`/events/${eventId}`, {
        method: 'DELETE',
      });
    },
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

    update: (id, reminderData) => {
      const reminderId = extractId(id);
      return apiCall(`/reminders/${reminderId}`, {
        method: 'PUT',
        body: JSON.stringify(reminderData),
      });
    },

    delete: (id) => {
      const reminderId = extractId(id);
      return apiCall(`/reminders/${reminderId}`, {
        method: 'DELETE',
      });
    },
  },

  // ============ CATEGORIES / TAGS ============
  categories: {
    getAll: () => apiCall('/categories'),

    create: (categoryData) =>
      apiCall('/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
      }),

    delete: (id) => {
      const categoryId = extractId(id);
      return apiCall(`/categories/${categoryId}`, {
        method: 'DELETE',
      });
    },
  },

  // ============ DRAG & DROP SUPPORT ============
  dragAndDrop: {
    moveEvent: (eventId, newDate, newTime) => {
      const id = extractId(eventId);
      return apiCall(`/events/${id}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ date: newDate, time: newTime }),
      });
    },

    resizeEvent: (eventId, newDuration) => {
      const id = extractId(eventId);
      return apiCall(`/events/${id}/resize`, {
        method: 'PATCH',
        body: JSON.stringify({ duration: newDuration }),
      });
    },
  },

  // ============ RECURRING EVENTS ============
  recurring: {
    createRecurring: (eventData, recurrencePattern) =>
      apiCall('/events/recurring', {
        method: 'POST',
        body: JSON.stringify({ ...eventData, recurrence: recurrencePattern }),
      }),

    updateRecurring: (seriesId, eventData) => {
      const id = extractId(seriesId);
      return apiCall(`/events/recurring/${id}`, {
        method: 'PUT',
        body: JSON.stringify(eventData),
      });
    },

    deleteRecurring: (seriesId) => {
      const id = extractId(seriesId);
      return apiCall(`/events/recurring/${id}`, {
        method: 'DELETE',
      });
    },
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
export { apiCall };
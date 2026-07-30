// EventContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import { apiCall } from '../lib/sdk';

// Demo events for when backend is unavailable
const DEMO_EVENTS = [
  { 
    id: '1', 
    title: 'Team Meeting', 
    start: new Date().toISOString(), 
    end: new Date(Date.now() + 3600000).toISOString(), 
    status: 'upcoming',
    description: 'Weekly team sync'
  },
  { 
    id: '2', 
    title: 'Project Review', 
    start: new Date(Date.now() + 86400000).toISOString(), 
    end: new Date(Date.now() + 90000000).toISOString(), 
    status: 'upcoming',
    description: 'Review project progress'
  },
  { 
    id: '3', 
    title: 'Client Call', 
    start: new Date(Date.now() - 3600000).toISOString(), 
    end: new Date().toISOString(), 
    status: 'completed',
    description: 'Client presentation'
  },
];

export const EventContext = createContext();

export const EventProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useDemoData, setUseDemoData] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch from backend
      const response = await apiCall('/events');
      setEvents(response || []);
      setUseDemoData(false);
    } catch (err) {
      console.warn('Backend not available, using demo events:', err.message);
      
      // Use demo data if backend fails
      setEvents(DEMO_EVENTS);
      setUseDemoData(true);
      setError(null); // Don't show error for demo data
      
      // Only show error if it's not a "not found" error
      if (err.message && !err.message.includes('not found')) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const createEvent = useCallback(async (eventData) => {
    try {
      setLoading(true);
      
      // If using demo data, just add to local state
      if (useDemoData) {
        const newEvent = { 
          ...eventData, 
          id: Date.now().toString(),
          created_at: new Date().toISOString()
        };
        setEvents(prev => [...prev, newEvent]);
        return { success: true, data: newEvent };
      }
      
      // Try to create on backend
      const newEvent = await apiCall('/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
      setEvents(prev => [...prev, newEvent]);
      return { success: true, data: newEvent };
    } catch (err) {
      console.error('Error creating event:', err);
      setError(err.message || 'Failed to create event');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [useDemoData]);

  const updateEvent = useCallback(async (eventId, updates) => {
    try {
      setLoading(true);
      
      // If using demo data, update locally
      if (useDemoData) {
        setEvents(prev => prev.map(event => 
          event.id === eventId ? { ...event, ...updates } : event
        ));
        return { success: true };
      }
      
      const updatedEvent = await apiCall(`/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setEvents(prev => prev.map(event => event.id === eventId ? updatedEvent : event));
      return { success: true, data: updatedEvent };
    } catch (err) {
      console.error('Error updating event:', err);
      setError(err.message || 'Failed to update event');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [useDemoData]);

  const deleteEvent = useCallback(async (eventId) => {
    try {
      setLoading(true);
      
      // If using demo data, delete locally
      if (useDemoData) {
        setEvents(prev => prev.filter(event => event.id !== eventId));
        return { success: true };
      }
      
      await apiCall(`/events/${eventId}`, {
        method: 'DELETE',
      });
      setEvents(prev => prev.filter(event => event.id !== eventId));
      return { success: true };
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err.message || 'Failed to delete event');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [useDemoData]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <EventContext.Provider
      value={{
        events,
        loading,
        error,
        useDemoData,
        fetchEvents,
        createEvent,
        updateEvent,
        deleteEvent,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};
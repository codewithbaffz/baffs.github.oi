import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const EventContext = createContext();

export function EventProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Load initial events
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const data = await base44.entities.Event.filter({ user_id: user.id }, '-created_date', 100);
      setEvents(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      // If backend not available, use demo events
      console.log('Events backend not available - using demo data');
      setEvents([
        {
          id: 'demo-1',
          title: 'Team Sync',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          source: 'manual',
          color: '#6C63FF',
          user_id: 'demo',
        },
        {
          id: 'demo-2',
          title: 'Project Review',
          start_time: new Date(Date.now() + 86400000).toISOString(),
          end_time: new Date(Date.now() + 86400000 + 3600000).toISOString(),
          source: 'google',
          color: '#34A853',
          user_id: 'demo',
        },
      ]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // CRUD operations with automatic state updates
  const createEvent = useCallback(async (eventData) => {
    try {
      const user = await base44.auth.me();
      const created = await base44.entities.Event.create({
        ...eventData,
        user_id: user.id,
      });
      setEvents(prev => [created, ...prev]);
      return created;
    } catch (err) {
      // Fallback: save locally
      const newEvent = {
        id: Date.now().toString(),
        ...eventData,
        source: eventData.source || 'manual',
      };
      setEvents(prev => [newEvent, ...prev]);
      return newEvent;
    }
  }, []);

  const updateEvent = useCallback(async (id, updates) => {
    try {
      const updated = await base44.entities.Event.update(id, updates);
      setEvents(prev => prev.map(event => {
        const eventId = event.id || event._id || event.event_id;
        const updateId = updated.id || updated._id || updated.event_id;
        return eventId === updateId ? updated : event;
      }));
      return updated;
    } catch (err) {
      // Fallback: update locally
      setEvents(prev => prev.map(event => {
        const eventId = event.id || event._id || event.event_id;
        return eventId === id ? { ...event, ...updates } : event;
      }));
      return { ...events.find(e => e.id === id), ...updates };
    }
  }, []);

  const deleteEvent = useCallback(async (id) => {
    try {
      await base44.entities.Event.delete(id);
      setEvents(prev => prev.filter(event => {
        const eventId = event.id || event._id || event.event_id;
        return eventId !== id;
      }));
    } catch (err) {
      // Fallback: delete locally
      setEvents(prev => prev.filter(event => {
        const eventId = event.id || event._id || event.event_id;
        return eventId !== id;
      }));
    }
  }, []);

  // Polling subscription (fallback if WebSocket not available)
  const subscribe = useCallback(() => {
    if (isSubscribed) return;

    const interval = setInterval(() => {
      loadEvents();
    }, 30000); // Poll every 30 seconds

    setIsSubscribed(true);
    return () => {
      clearInterval(interval);
      setIsSubscribed(false);
    };
  }, [isSubscribed, loadEvents]);

  // Auto-load and subscribe on mount
  useEffect(() => {
    loadEvents();
    const unsubscribe = subscribe();
    return () => unsubscribe?.();
  }, []); // Empty deps - run once on mount

  const value = {
    events,
    loading,
    error,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    subscribe,
    isSubscribed,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

// Custom hook for using the event context
export function useEvents() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}
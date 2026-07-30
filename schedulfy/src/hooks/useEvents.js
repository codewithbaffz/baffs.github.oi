// src/hooks/useEvents.js
import { useContext } from 'react';
import  EventContext  from '@/context/EventContext';

export  function useEvents() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}
// src/services/aiService.js
//  Updated to use backend API - NO GROQ API KEY NEEDED

import { schedulfySDK } from '@/lib/sdk';

const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:5000/ai';

class AIService {
  constructor() {
    this.isProcessing = false;
  }

  async processCommand(command, context = {}) {
    try {
      this.isProcessing = true;

      // Get auth token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Send to backend
      const response = await fetch(`${AI_API_URL}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          command,
          context: {
            tasks: context.tasks || [],
            user: context.user || null,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'AI service error');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('AI command error:', error);
      return {
        type: 'error',
        message: ` ${error.message || 'I had trouble processing that. Please try again.'}`,
        data: null,
        confidence: 0,
        requiresConfirmation: false,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  async executeAction(action) {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${AI_API_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Action execution failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Action execution error:', error);
      return {
        success: false,
        error: error.message,
        message: ' Failed to execute action. Please try again.',
      };
    }
  }
}

export default new AIService();
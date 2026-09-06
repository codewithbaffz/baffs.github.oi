// src/components/InsightChat.jsx
import React, { useState } from 'react';
import { Bot, Send, X, MessageCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/AuthContext';

const InsightChat = ({ tasks, sessions, onClose }) => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: 'ai', 
      text: isAuthenticated 
        ? '👋 Hello! I can help you analyze your productivity data. What would you like to know?' 
        : '👋 Please login to use the AI assistant. Once logged in, I can help you manage your tasks!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const getTaskStats = () => {
    const total = tasks?.length || 0;
    const completed = tasks?.filter(t => t.status === 'done').length || 0;
    const inProgress = tasks?.filter(t => t.status === 'in_progress').length || 0;
    const todo = tasks?.filter(t => t.status === 'todo').length || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const sessionCount = sessions?.length || 0;
    
    return { total, completed, inProgress, todo, completionRate, sessionCount };
  };

  const sendToAI = async (userMessage) => {
    try {
      // ✅ FIXED: Use 'authToken' (matches your AuthContext)
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Please login to use the AI assistant.');
      }

      const stats = getTaskStats();
      
      const context = {
        tasks: tasks || [],
        user: user,
        stats: stats,
      };

      const response = await fetch(`${API_URL}/ai/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          command: userMessage,
          context: context,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('AI API Error Details:', errorData);
        
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          throw new Error('Session expired. Please login again.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
        } else {
          throw new Error(errorData.message || `Server Error: ${response.status}`);
        }
      }

      const action = await response.json();

      if (action.type === 'error') {
        throw new Error(action.message || 'I had trouble processing that.');
      }

      if (action.type === 'query') {
        let resultMessage = action.message || 'Query completed';
        if (action.data?.tasks?.length > 0) {
          const taskList = action.data.tasks.map((t, i) => 
            `${i + 1}. ${t.title} (${t.status || 'todo'})`
          ).join('\n');
          resultMessage += `\n\n${taskList}`;
        }
        return resultMessage;
      }

      if (action.type === 'create' || action.type === 'update') {
        const executeResponse = await fetch(`${API_URL}/ai/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ action }),
        });

        if (!executeResponse.ok) {
          const errorData = await executeResponse.json();
          throw new Error(errorData.message || 'Failed to execute action');
        }

        const result = await executeResponse.json();
        
        if (result.success) {
          return `✅ ${result.message || 'Action completed successfully!'}`;
        } else {
          throw new Error(result.message || 'Failed to execute action');
        }
      }

      if (action.requiresConfirmation) {
        return `⚠️ ${action.message}\n\nPlease type "confirm" to proceed with this action.`;
      }

      return action.message || 'Action processed successfully!';

    } catch (error) {
      console.error('AI Error:', error);
      throw error;
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    const userMessageObj = { id: Date.now(), sender: 'user', text: userMessage };
    setMessages(prev => [...prev, userMessageObj]);
    setInput('');
    setIsLoading(true);
    setApiError(null);

    try {
      const aiResponse = await sendToAI(userMessage);
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: aiResponse }]);
    } catch (error) {
      console.error('Error sending to AI:', error);
      setApiError(error.message);
      
      let fallbackText = '';
      if (error.message.includes('login') || error.message.includes('Session expired')) {
        fallbackText = '🔒 Please login again to use the AI assistant.';
      } else if (error.message.includes('Rate limit')) {
        fallbackText = '⏳ Too many requests. Please wait a moment before trying again.';
      } else if (error.message.includes('confirm')) {
        fallbackText = error.message;
      } else {
        fallbackText = `I couldn't reach the AI service right now. ${error.message || 'Please try again in a moment.'}`;
      }
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        sender: 'ai', 
        text: fallbackText
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-8 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="glass rounded-xl border border-primary/20 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-heading text-sm font-bold">AI Insights Assistant</h3>
          {!isAuthenticated && (
            <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
              Login Required
            </span>
          )}
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-secondary/60 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${
              msg.sender === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary/60 text-foreground border border-border'
            }`}>
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary/60 px-4 py-2 rounded-xl text-sm border border-border">
              <div className="flex gap-1">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce delay-100">●</span>
                <span className="animate-bounce delay-200">●</span>
              </div>
            </div>
          </div>
        )}
        {apiError && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20">
              <AlertCircle className="w-3 h-3" />
              <ReactMarkdown>{apiError}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isAuthenticated ? "Ask about your productivity..." : "Login to use the AI assistant"}
            disabled={!isAuthenticated}
            className="flex-1 px-3 py-2 bg-secondary/60 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !isAuthenticated}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Please <a href="/login" className="text-primary hover:underline">login</a> to use the AI assistant
          </p>
        )}
      </div>
    </div>
  );
};

export default InsightChat;
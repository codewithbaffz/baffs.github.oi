// src/components/InsightChat.jsx
import React, { useState } from 'react';
import { Bot, Send, X, MessageCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const InsightChat = ({ tasks, sessions, onClose }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: 'ai', 
      text: '👋 Hello! I can help you analyze your productivity data. What would you like to know?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const getTaskStats = () => {
    const total = tasks?.length || 0;
    const completed = tasks?.filter(t => t.status === 'done').length || 0;
    const inProgress = tasks?.filter(t => t.status === 'in_progress').length || 0;
    const todo = tasks?.filter(t => t.status === 'todo').length || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const sessionCount = sessions?.length || 0;
    
    return { total, completed, inProgress, todo, completionRate, sessionCount };
  };

  const sendToGroq = async (userMessage) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    
    // Check if API key exists
    if (!apiKey) {
      throw new Error('Sorry Server is done.Issue will be resolved soon');
    }

    // Check if API key is valid format
    if (!apiKey.startsWith('gsk_')) {
      throw new Error('Invalid Groq API key format. It should start with "gsk_"');
    }

    const stats = getTaskStats();
    
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content: `You are a friendly productivity assistant analyzing a user's task data.
                        Current stats:
                        - Total tasks: ${stats.total}
                        - Completed: ${stats.completed}
                        - In Progress: ${stats.inProgress}
                        - To Do: ${stats.todo}
                        - Completion Rate: ${stats.completionRate}%
                        - Focus Sessions: ${stats.sessionCount}
                        
                        Give concise, encouraging, and actionable insights. Keep responses under 100 words.
                        Be supportive and practical.`
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: 1,
          max_tokens: 300,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Groq API Error Details:', errorData);
        
        if (response.status === 401) {
          throw new Error('Invalid Groq API key. Please check your VITE_GROQ_API_KEY in .env file.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
        } else if (response.status === 403) {
          throw new Error('API key does not have permission. Please check your Groq account.');
        } else {
          throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'I couldn\'t process that request. Please try again.';
    } catch (error) {
      console.error('Groq API Error:', error);
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
      const aiResponse = await sendToGroq(userMessage);
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: aiResponse }]);
    } catch (error) {
      console.error('Error sending to Groq:', error);
      setApiError(error.message);
      
      // Fallback responses based on the error
      let fallbackText = '';
      if (error.message.includes('API key')) {
        fallbackText = ' API key issue. Please check your Groq API key in the .env file.';
      } else if (error.message.includes('Rate limit')) {
        fallbackText = ' Too many requests. Please wait a moment before trying again.';
      } else {
        fallbackText = ` Based on your data: You have ${getTaskStats().total} tasks with a ${getTaskStats().completionRate}% completion rate. Keep up the great work!`;
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
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your productivity..."
            className="flex-1 px-3 py-2 bg-secondary/60 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsightChat;
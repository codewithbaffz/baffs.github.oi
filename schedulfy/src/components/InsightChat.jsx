// src/components/InsightChat.jsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Send, Loader2, Sparkles, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Get Groq API key from environment variables
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export default function InsightChat({ tasks = [], sessions = [] }) {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initial greeting with context
  useEffect(() => {
    if (messages.length === 0) {
      const taskCount = tasks?.length || 0;
      const completedCount = tasks?.filter(t => t.status === 'done').length || 0;
      const sessionCount = sessions?.length || 0;
      
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: ` Hello! I'm your AI productivity assistant.

   Current Stats:
• ${taskCount} total tasks
• ${completedCount} completed (${taskCount > 0 ? Math.round((completedCount/taskCount)*100) : 0}% completion rate)
• ${sessionCount} focus sessions logged

How can I help you today? I can assist with:
• Task prioritization
• Time management tips
• Productivity strategies
• Breaking down complex tasks`
        }
      ]);
    }
  }, [tasks, sessions]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Build context for AI
  const buildContext = () => {
    const done = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
    const rate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
    const focusMins = sessions.reduce((a, s) => a + (s.duration_minutes || 25), 0);
    const topTags = tasks.flatMap(t => t.tags || []).reduce((acc, tag) => { acc[tag] = (acc[tag] || 0) + 1; return acc; }, {});
    const topTagStr = Object.entries(topTags).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}(${v})`).join(', ');

    return `User's current productivity data:
- Total tasks: ${tasks.length} | Completed: ${done} | Overdue: ${overdue} | Completion rate: ${rate}%
- In progress: ${tasks.filter(t => t.status === 'in_progress').length} | Snoozed: ${tasks.filter(t => t.status === 'snoozed').length}
- Focus sessions: ${sessions.length} | Total focus time: ${Math.round(focusMins / 60 * 10) / 10}h
- AI-created tasks: ${tasks.filter(t => t.is_ai_generated).length}
- Top task categories: ${topTagStr || 'none'}
- Urgent tasks: ${tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length}
Today's date: ${new Date().toDateString()}`;
  };

  // Fallback responses
  const getFallbackResponse = (userMessage, context) => {
    const msg = userMessage.toLowerCase();
    const total = context.tasks?.length || 0;
    const done = context.tasks?.filter(t => t.status === 'done').length || 0;
    const inProgress = context.tasks?.filter(t => t.status === 'in_progress').length || 0;
    const overdue = context.tasks?.filter(t => t.status === 'overdue' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done')).length || 0;
    const urgent = context.tasks?.filter(t => t.priority === 'urgent' && t.status !== 'done').length || 0;
    const totalSessions = context.sessions?.length || 0;
    const totalMinutes = context.sessions?.reduce((a, s) => a + (s.duration_minutes || 25), 0) || 0;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    // Task-related queries
    if (msg.includes('task') || msg.includes('todo') || msg.includes('to do')) {
      return `Here's your task breakdown:
• Total: ${total} tasks
• Completed: ${done} 
• In Progress: ${inProgress} 
• Overdue: ${overdue} 

${overdue > 0 ? ` You have ${overdue} overdue tasks. Would you like me to help you prioritize them?` : 'Great job staying on top of your tasks! '}`;
    }
    
    // Focus/Productivity queries
    if (msg.includes('focus') || msg.includes('productive') || msg.includes('session')) {
      return ` Focus Session Report:
• ${totalSessions} sessions completed
• ${hours}h ${mins}m total focused time
• Average session: ${totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0} minutes

${totalSessions > 5 ? ' You\'re building great focus habits! Keep it up!' : ' Every session counts. Try to be consistent!'}`;
    }
    
    // Priority queries
    if (msg.includes('priority') || msg.includes('urgent') || msg.includes('important')) {
      return ` Priority Breakdown (Pending):
•   Urgent: ${urgent}
•   High: ${context.tasks?.filter(t => t.priority === 'high' && t.status !== 'done').length || 0}
•   Medium: ${context.tasks?.filter(t => t.priority === 'medium' && t.status !== 'done').length || 0}
•   Low: ${context.tasks?.filter(t => t.priority === 'low' && t.status !== 'done').length || 0}

${urgent > 0 ? ` You have ${urgent} urgent tasks. Focus on these first!` : ' No urgent tasks. Great job staying ahead!'}`;
    }
    
    // General responses
    const responses = [
      "That's a great question! Here's what I think might help...",
      "I can definitely help with that. Let me analyze your current situation.",
      "Great observation! Based on your data, here's my recommendation...",
      "I understand. Here are a few strategies that could work for you...",
      "That's something I can help with. Let me break it down for you..."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Send to Groq (Free & Fast)
  const sendToGroq = async (chatMessages, context) => {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are Schedulfy AI Coach — a friendly, concise productivity coach. Use the user's data to give specific, data-driven answers. Keep responses brief (2-4 sentences or a short bullet list). Use markdown for formatting.

Here is the user's current productivity data:
${context}

Important rules:
- Always be helpful and encouraging
- Use the user's actual data in your responses
- Keep responses concise
- Use markdown formatting (bold, bullet points, etc.)
- Never make up data that isn't in the context`
            },
            ...chatMessages
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Groq API Error:', errorData);
        throw new Error(errorData.error?.message || 'Groq API error');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Groq request failed:', error);
      throw error;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const context = {
        tasks: tasks || [],
        sessions: sessions || [],
        user: user
      };

      let response;

      // Try Groq if API key is available
      if (GROQ_API_KEY) {
        try {
          const apiMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
              role: m.role,
              content: m.content
            }));
          
          apiMessages.push({ role: 'user', content: userMessage.content });
          
          const contextStr = buildContext();
          response = await sendToGroq(apiMessages, contextStr);
          console.log('✅ Groq response received');
        } catch (groqError) {
          console.warn('⚠️ Groq failed, using fallback:', groqError.message);
          response = getFallbackResponse(userMessage.content, context);
        }
      } else {
        response = getFallbackResponse(userMessage.content, context);
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm having trouble processing that right now. Please try again in a moment."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="glass-indigo rounded-xl border border-primary/20 flex flex-col h-[480px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/20">
        <div className="w-7 h-7 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-cyan" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">AI Insight Coach</p>
          <p className="text-xs text-muted-foreground">
            {GROQ_API_KEY ? '🤖 AI Powered' : '📋 Offline Mode'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${GROQ_API_KEY ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
          <span className="text-xs text-muted-foreground">
            {GROQ_API_KEY ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
              ${m.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-secondary/60 border border-border text-foreground rounded-tl-sm'}`}>
              {m.role === 'assistant' && GROQ_API_KEY ? (
                <ReactMarkdown className="prose prose-sm prose-invert max-w-none text-sm">{m.content}</ReactMarkdown>
              ) : (
                m.content
              )}
            </div>
            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs text-muted-foreground">You</span>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
            <div className="bg-secondary/60 border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
          {[
            'What are my biggest productivity blockers?',
            'When am I most productive?',
            'How can I improve my completion rate?',
            'Give me a plan for this week'
          ].map((s) => (
            <button
              key={s}
              onClick={() => {
                setInput(s);
                setTimeout(() => sendMessage(), 100);
              }}
              className="text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-primary/20">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI coach anything…"
            disabled={isLoading}
            className="flex-1 bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        {!GROQ_API_KEY && (
          <p className="text-[10px] text-yellow-400/70 mt-1 text-center">
            ⚠️ No Groq API key found. Using offline responses.
          </p>
        )}
        {GROQ_API_KEY && (
          <p className="text-[10px] text-green-400/70 mt-1 text-center">
            ✅ Powered by Groq AI • Free & Fast
          </p>
        )}
      </div>
    </div>
  );
}
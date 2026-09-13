// src/components/InsightChat.jsx
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { MessageCircle, Bot, X, AlertCircle, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const InsightChat = ({ tasks, sessions, onClose }) => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: isAuthenticated
        ? ' Hello! I can help you analyze your productivity data. What would you like to know?'
        : ' Please login to use the AI assistant. Once logged in, I can help you manage your tasks!',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const getTaskStats = () => {
    const total = tasks?.length || 0;
    const completed = tasks?.filter((t) => t.status === 'done').length || 0;
    const inProgress = tasks?.filter((t) => t.status === 'in_progress').length || 0;
    const todo = tasks?.filter((t) => t.status === 'todo').length || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const sessionCount = sessions?.length || 0;

    return { total, completed, inProgress, todo, completionRate, sessionCount };
  };

  const AFFIRMATIVE = [
    'confirm',
    'yes',
    'y',
    'yeah',
    'yep',
    'ok',
    'okay',
    'sure',
    'do it',
    'proceed',
    'go ahead',
    'please do',
  ];
  const NEGATIVE = [
    'cancel',
    'no',
    'n',
    'nope',
    'abort',
    'stop',
    'nevermind',
    'never mind',
    'forget it',
    "don't",
    'dont',
  ];

  const isAffirmative = (text) =>
    AFFIRMATIVE.includes(text.toLowerCase().trim());
  const isNegative = (text) =>
    NEGATIVE.includes(text.toLowerCase().trim());

  const executeAction = async (action) => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Please login to use the AI assistant.');

    const executeResponse = await fetch(`${API_URL}/ai/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action }),
    });

    if (!executeResponse.ok) {
      const errorData = await executeResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to execute action');
    }

    const result = await executeResponse.json();

    if (result.success) {
      return ` ${result.message || 'Action completed successfully!'}`;
    }

    if (result.needsMoreInfo) {
      return result.message || 'Could you give me a bit more detail?';
    }

    throw new Error(result.message || 'Failed to execute action');
  };

  const sendToAI = async (userMessage) => {
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
        Authorization: `Bearer ${token}`,
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
        const taskList = action.data.tasks
          .map((t, i) => `${i + 1}. ${t.title} (${t.status || 'todo'})`)
          .join('\n');
        resultMessage += `\n\n${taskList}`;
      }
      return resultMessage;
    }

    if (action.requiresConfirmation) {
      setPendingAction(action);
      return `${action.message || 'Are you sure?'}\n\nType **confirm** to proceed, or **cancel** to abort.`;
    }

    if (
      action.type === 'create' ||
      action.type === 'update' ||
      action.type === 'delete'
    ) {
      return await executeAction(action);
    }

    return action.message || 'Action processed successfully!';
  };

  const handlePendingReply = async (userMessage) => {
    const action = pendingAction;
    setPendingAction(null);

    if (isAffirmative(userMessage)) {
      try {
        const result = await executeAction(action);
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 2, sender: 'ai', text: result },
        ]);
      } catch (error) {
        console.error('Confirm error:', error);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 3,
            sender: 'ai',
            text: ` ${error.message || 'Something went wrong.'}`,
          },
        ]);
      }
      return;
    }

    if (isNegative(userMessage)) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          sender: 'ai',
          text: 'Okay, cancelled. Nothing was changed.',
        },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 2,
        sender: 'ai',
        text: 'Okay, I dropped that. What would you like to do instead?',
      },
    ]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    const userMessageObj = { id: Date.now(), sender: 'user', text: userMessage };
    setMessages((prev) => [...prev, userMessageObj]);
    setInput('');
    setIsLoading(true);
    setApiError(null);

    try {
      if (pendingAction) {
        await handlePendingReply(userMessage);
        return;
      }

      const aiResponse = await sendToAI(userMessage);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', text: aiResponse },
      ]);
    } catch (error) {
      console.error('Error sending to AI:', error);
      setApiError(error.message);

      let fallbackText = '';
      if (error.message.includes('login') || error.message.includes('Session expired')) {
        fallbackText = ' Please login again to use the AI assistant.';
      } else if (error.message.includes('Rate limit')) {
        fallbackText = '⏳ Too many requests. Please wait a moment before trying again.';
      } else {
        fallbackText = `I couldn't reach the AI service right now. ${
          error.message || 'Please try again in a moment.'
        }`;
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', text: fallbackText },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (typeof onClose === 'function') onClose();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-8 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all z-50"
        aria-label="Open AI assistant"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="bg-card/90 border border-primary/20 rounded-xl shadow-xl overflow-hidden">
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
          onClick={handleClose}
          className="p-1 hover:bg-secondary/60 rounded-lg transition-colors"
          aria-label="Close assistant"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${
                msg.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/60 text-foreground border border-border'
              }`}
            >
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

      {/* Pending confirmation hint bar */}
      {pendingAction && (
        <div className="px-3 py-2 border-t border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-500 flex items-center gap-2">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>
            Waiting for confirmation — type <strong>confirm</strong> or <strong>cancel</strong>
          </span>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              !isAuthenticated
                ? 'Login to use the AI assistant'
                : pendingAction
                ? 'Type "confirm" or "cancel"...'
                : 'Ask about your productivity...'
            }
            disabled={!isAuthenticated}
            className="flex-1 px-3 py-2 bg-secondary/60 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !isAuthenticated}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Please{' '}
            <a href="/login" className="text-primary hover:underline">
              login
            </a>{' '}
            to use the AI assistant
          </p>
        )}
      </div>
    </div>
  );
};

export default InsightChat;
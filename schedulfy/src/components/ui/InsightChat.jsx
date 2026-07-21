import { useState, useRef, useEffect } from 'react';
import { schedulfy } from '@/api/schedulfyClient';
import { Brain, Send, Loader2, Sparkles, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SUGGESTED = [
  'What are my biggest productivity blockers?',
  'When am I most productive during the week?',
  'How can I improve my completion rate?',
  'Give me a plan for this week',
];

export default function InsightChat({ tasks, sessions }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! I'm your Schedulfy AI Coach 👋 Ask me anything about your productivity, tasks, or how to improve your workflow.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    const history = newMessages.map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`).join('\n');

    const reply = await schedulfy.integrations.Core.InvokeLLM({
      prompt: `You are Schedulfy AI Coach — a friendly, concise productivity coach. Use the user's data to give specific, data-driven answers. Keep responses brief (2-4 sentences or a short bullet list). Use markdown for formatting when helpful.

${buildContext()}

Conversation:
${history}

Coach:`,
    });

    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  return (
    <div className="glass-indigo rounded-xl border border-primary/20 flex flex-col h-[480px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/20">
        <div className="w-7 h-7 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center">
          <Brain className="w-4 h-4 text-cyan" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">AI Insight Coach</p>
          <p className="text-xs text-muted-foreground">Powered by your productivity data</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">Live</span>
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
              {m.role === 'assistant'
                ? <ReactMarkdown className="prose prose-sm prose-invert max-w-none text-sm">{m.content}</ReactMarkdown>
                : m.content}
            </div>
            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
            <div className="bg-secondary/60 border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
          {SUGGESTED.map(s => (
            <button key={s} onClick={() => send(s)}
              className="text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-primary/20">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask your AI coach anything…"
            disabled={loading}
            className="flex-1 bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
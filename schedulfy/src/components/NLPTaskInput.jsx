import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, Check, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

export default function NLPTaskInput({ onTaskCreated, projectId, workspaceId }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a task parsing AI for Schedulfy. Extract structured task data from this natural language input.
        
Input: "${input}"

Today's date: ${new Date().toISOString()}

Extract:
- title: concise task title
- description: optional extra detail
- due_date: ISO date-time string if mentioned (null if not)
- priority: "low" | "medium" | "high" | "urgent" (infer from context)
- tags: array of relevant topic tags (max 3)
- assignee_name: name of collaborator if mentioned (null if not)

Return ONLY valid JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            due_date: { type: 'string' },
            priority: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            assignee_name: { type: 'string' }
          }
        }
      });
      setParsed(result);
    } catch (e) {
      setError('Could not parse input. Please try again.');
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    setSaving(true);
    const user = await base44.auth.me();
    const task = await base44.entities.Task.create({
      title: parsed.title,
      description: parsed.description || '',
      due_date: parsed.due_date || null,
      priority: parsed.priority || 'medium',
      tags: parsed.tags || [],
      status: 'todo',
      is_ai_generated: true,
      original_nlp_input: input,
      source: 'nlp',
      project_id: projectId || null,
      workspace_id: workspaceId || null,
    });
    setSaving(false);
    setParsed(null);
    setInput('');
    onTaskCreated?.(task);
  };

  const handleDiscard = () => {
    setParsed(null);
    setInput('');
  };

  return (
    <div className="space-y-3">
      {/* Input */}
      <div className="relative">
        <div className="absolute left-3 top-3 text-cyan">
          <Sparkles className="w-4 h-4" />
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse();
          }}
          placeholder='Try: "Review the project proposal with David on Friday at 2pm — high priority"'
          className="w-full pl-9 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-primary/50 focus:bg-secondary transition-all"
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between">
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="ml-auto">
          <button
            onClick={handleParse}
            disabled={!input.trim() || loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/40 text-primary rounded-lg text-sm font-medium hover:bg-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Parse with AI</>
            )}
          </button>
        </div>
      </div>

      {/* Parsed Preview */}
      {parsed && (
        <div className="glass-indigo rounded-xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">AI Parsed — Review & Confirm</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Title</label>
              <input
                value={parsed.title}
                onChange={e => setParsed(p => ({ ...p, title: e.target.value }))}
                className="mt-1 w-full bg-secondary/60 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Priority</label>
              <select
                value={parsed.priority || 'medium'}
                onChange={e => setParsed(p => ({ ...p, priority: e.target.value }))}
                className="mt-1 w-full bg-secondary/60 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            {parsed.due_date && (
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Due Date</label>
                <p className="mt-1 text-sm text-cyan">{format(new Date(parsed.due_date), 'MMM d, yyyy h:mma')}</p>
              </div>
            )}
            {parsed.tags && parsed.tags.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Tags</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {parsed.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {parsed.assignee_name && (
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Collaborator</label>
                <p className="mt-1 text-sm text-foreground">{parsed.assignee_name}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Creating...' : 'Create Task'}
            </button>
            <button
              onClick={handleDiscard}
              className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border text-muted-foreground rounded-lg text-sm hover:text-foreground transition-all"
            >
              <X className="w-4 h-4" /> Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
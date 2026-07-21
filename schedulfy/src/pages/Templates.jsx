// src/pages/Templates.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { schedulfySDK } from '@/lib/sdk';
import { FileText, Plus, Play, Loader2, ChevronDown, ChevronUp, Sparkles, Clock } from 'lucide-react';
import { addDays } from 'date-fns';

const DEFAULT_TEMPLATES = [
  {
    name: 'Exam Prep Routine',
    description: 'Structured preparation for an exam or major test',
    category: 'Academic',
    subtasks: [
      { title: 'Gather all study materials and notes', priority: 'high', offset_days: 0, tags: ['study'] },
      { title: 'Create a topic outline and study schedule', priority: 'high', offset_days: 1, tags: ['planning'] },
      { title: 'Review core concepts and key definitions', priority: 'high', offset_days: 2, tags: ['study'] },
      { title: 'Complete practice questions (set 1)', priority: 'medium', offset_days: 4, tags: ['practice'] },
      { title: 'Complete practice questions (set 2)', priority: 'medium', offset_days: 6, tags: ['practice'] },
      { title: 'Identify weak areas and focus review', priority: 'urgent', offset_days: 8, tags: ['study', 'review'] },
      { title: 'Full mock exam under timed conditions', priority: 'urgent', offset_days: 10, tags: ['practice'] },
      { title: 'Final light review and rest', priority: 'low', offset_days: 13, tags: ['review'] },
    ],
  },
  {
    name: 'Project Launch Blueprint',
    description: 'End-to-end template for launching a new project',
    category: 'Work',
    subtasks: [
      { title: 'Define project scope and objectives', priority: 'urgent', offset_days: 0, tags: ['planning'] },
      { title: 'Identify stakeholders and assign roles', priority: 'high', offset_days: 1, tags: ['team'] },
      { title: 'Create project timeline and milestones', priority: 'high', offset_days: 2, tags: ['planning'] },
      { title: 'Set up collaboration tools and workspace', priority: 'medium', offset_days: 3, tags: ['setup'] },
      { title: 'Complete design phase', priority: 'high', offset_days: 7, tags: ['design'] },
      { title: 'Development sprint 1', priority: 'high', offset_days: 14, tags: ['development'] },
      { title: 'Internal testing and QA', priority: 'high', offset_days: 21, tags: ['qa'] },
      { title: 'Stakeholder review and feedback', priority: 'medium', offset_days: 25, tags: ['review'] },
      { title: 'Final launch preparation', priority: 'urgent', offset_days: 28, tags: ['launch'] },
    ],
  },
  {
    name: 'Weekly Review Routine',
    description: 'Personal weekly planning and reflection ritual',
    category: 'Personal',
    subtasks: [
      { title: 'Review completed tasks from last week', priority: 'medium', offset_days: 0, tags: ['review'] },
      { title: 'Check inbox and archive processed items', priority: 'low', offset_days: 0, tags: ['inbox'] },
      { title: 'Set top 3 priorities for this week', priority: 'high', offset_days: 0, tags: ['planning'] },
      { title: 'Schedule key work blocks on calendar', priority: 'medium', offset_days: 0, tags: ['calendar'] },
      { title: 'Review ongoing projects for blockers', priority: 'medium', offset_days: 1, tags: ['projects'] },
    ],
  },
];

export default function Templates() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [deployingId, setDeployingId] = useState(null);
  const [deployDate, setDeployDate] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Work',
    subtasks: [{ title: '', priority: 'medium', offset_days: 0, tags: '' }]
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadTemplates();
    } else if (!isLoadingAuth && !isAuthenticated) {
      setLoading(false);
      setError('Please log in to view templates.');
    }
  }, [isAuthenticated, user, isLoadingAuth]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch templates from backend
      let data = [];
      try {
        // If you have a templates endpoint, use it
        // For now, we'll use localStorage as a fallback
        const stored = localStorage.getItem('templates');
        if (stored) {
          data = JSON.parse(stored);
        } else {
          // Create default templates
          const created = DEFAULT_TEMPLATES.map((t, index) => ({
            ...t,
            id: `template-${index + 1}`,
            creator_id: user?.id || 'unknown',
            use_count: 0,
            created_at: new Date().toISOString(),
          }));
          localStorage.setItem('templates', JSON.stringify(created));
          data = created;
        }
        console.log(`✅ Loaded ${data.length} templates`);
      } catch (err) {
        console.error('Error loading templates:', err);
        data = [];
      }
      
      setTemplates(data);
    } catch (err) {
      console.error('Error in loadTemplates:', err);
      setError('Failed to load templates. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const deployTemplate = async (template) => {
    try {
      setError(null);
      const startDate = deployDate ? new Date(deployDate) : new Date();
      setDeployingId(template.id);

      // Create tasks from template subtasks
      const tasks = template.subtasks.map((st) => ({
        title: st.title,
        description: st.description || '',
        priority: st.priority || 'medium',
        tags: st.tags || [],
        due_date: addDays(startDate, st.offset_days || 0).toISOString(),
        status: 'todo',
        source: 'template',
        template_id: template.id,
        user_id: user?.id || 'unknown'
      }));

      // Send to backend
      const createdTasks = [];
      for (const task of tasks) {
        try {
          const created = await schedulfySDK.tasks.create(task);
          createdTasks.push(created);
        } catch (err) {
          console.error('Error creating task:', err);
        }
      }

      // Update template use count
      const updatedTemplates = templates.map(t =>
        t.id === template.id ? { ...t, use_count: (t.use_count || 0) + 1 } : t
      );
      localStorage.setItem('templates', JSON.stringify(updatedTemplates));
      setTemplates(updatedTemplates);

      setDeployingId(null);
      setDeployDate('');
      alert(`✅ ${createdTasks.length} tasks created from "${template.name}"!`);
    } catch (err) {
      console.error('Error deploying template:', err);
      setError('Failed to deploy template. Please try again.');
      setDeployingId(null);
    }
  };

  const saveTemplate = async () => {
    if (!form.name.trim()) {
      setError('Template name is required');
      return;
    }

    try {
      setError(null);
      setSaving(true);

      const subtasks = form.subtasks
        .filter(s => s.title.trim())
        .map(s => ({
          title: s.title.trim(),
          priority: s.priority,
          offset_days: parseInt(s.offset_days) || 0,
          tags: s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        }));

      if (subtasks.length === 0) {
        setError('Please add at least one subtask');
        setSaving(false);
        return;
      }

      const newTemplate = {
        id: `template-${Date.now()}`,
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        subtasks,
        creator_id: user?.id || 'unknown',
        use_count: 0,
        is_public: true,
        created_at: new Date().toISOString(),
      };

      const updatedTemplates = [newTemplate, ...templates];
      localStorage.setItem('templates', JSON.stringify(updatedTemplates));
      setTemplates(updatedTemplates);

      setForm({
        name: '',
        description: '',
        category: 'Work',
        subtasks: [{ title: '', priority: 'medium', offset_days: 0, tags: '' }]
      });
      setShowCreate(false);
      setSaving(false);
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template.');
      setSaving(false);
    }
  };

  const addSubtask = () => {
    setForm(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, { title: '', priority: 'medium', offset_days: 0, tags: '' }]
    }));
  };

  const removeSubtask = (idx) => {
    if (form.subtasks.length <= 1) {
      setError('Cannot remove the last subtask');
      return;
    }
    setForm(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== idx)
    }));
  };

  const updateSubtask = (idx, field, val) => {
    setForm(prev => ({
      ...prev,
      subtasks: prev.subtasks.map((s, i) => i === idx ? { ...s, [field]: val } : s)
    }));
  };

  const CATEGORY_COLOR = {
    Work: 'text-primary bg-primary/10 border-primary/20',
    Academic: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    Personal: 'text-green-400 bg-green-400/10 border-green-400/20'
  };

  if (isLoadingAuth || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 glass rounded-xl border border-border max-w-md">
          <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please log in to view and manage templates.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide">TEMPLATES</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {templates.length > 0 ? `📋 ${templates.length} templates available` : 'Create your first template!'}
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(!showCreate);
            setError(null);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" /> New Blueprint
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="glass rounded-xl p-5 border border-border animate-fade-in space-y-4">
          <h3 className="font-heading text-base font-bold tracking-wide">CREATE BLUEPRINT</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Blueprint name *"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <select
              value={form.category}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
              className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            >
              <option>Work</option>
              <option>Academic</option>
              <option>Personal</option>
            </select>
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="col-span-2 bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Sub-tasks</p>
            <div className="space-y-2">
              {form.subtasks.map((st, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    placeholder="Task title"
                    value={st.title}
                    onChange={e => updateSubtask(idx, 'title', e.target.value)}
                    className="flex-1 bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  <select
                    value={st.priority}
                    onChange={e => updateSubtask(idx, 'priority', e.target.value)}
                    className="bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none w-24"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Med</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Day+"
                    value={st.offset_days}
                    onChange={e => updateSubtask(idx, 'offset_days', e.target.value)}
                    className="w-16 bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none"
                  />
                  <button
                    onClick={() => removeSubtask(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addSubtask}
              className="mt-2 text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add sub-task
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveTemplate}
              disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Save Blueprint
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setError(null);
              }}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {templates.length === 0 && !error ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No templates found. Create your first blueprint!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tmpl => (
            <div key={tmpl.id || tmpl._id || Math.random()} className="glass rounded-xl border border-border hover:border-primary/30 transition-all overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{tmpl.name}</p>
                      {tmpl.category && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${CATEGORY_COLOR[tmpl.category] || CATEGORY_COLOR.Work}`}>
                          {tmpl.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {tmpl.description && <p className="text-xs text-muted-foreground mb-3">{tmpl.description}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {(tmpl.subtasks || []).length} tasks</span>
                  {(tmpl.use_count || 0) > 0 && <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-cyan-400" /> {tmpl.use_count} deploys</span>}
                </div>

                <button
                  onClick={() => setExpandedId(expandedId === tmpl.id ? null : tmpl.id)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors mb-3"
                >
                  {expandedId === tmpl.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expandedId === tmpl.id ? 'Hide' : 'Preview'} tasks
                </button>

                {expandedId === tmpl.id && (
                  <div className="space-y-1 mb-3 animate-fade-in">
                    {(tmpl.subtasks || []).map((st, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                        <span className="flex-1 truncate">{st.title}</span>
                        {st.offset_days > 0 && <span className="flex items-center gap-0.5 shrink-0"><Clock className="w-2.5 h-2.5" />+{st.offset_days}d</span>}
                      </div>
                    ))}
                  </div>
                )}

                {deployingId === tmpl.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={deployDate}
                      onChange={e => setDeployDate(e.target.value)}
                      className="flex-1 bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={() => deployTemplate(tmpl)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all"
                    >
                      <Play className="w-3 h-3" /> Deploy
                    </button>
                    <button
                      onClick={() => {
                        setDeployingId(null);
                        setDeployDate('');
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setDeployingId(tmpl.id);
                      setError(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-all"
                  >
                    <Play className="w-3 h-3" /> Deploy Blueprint
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
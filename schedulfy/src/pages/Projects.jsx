import { useState, useEffect } from 'react';
import { Plus, FolderOpen, Users, CheckSquare, Loader2, X, ChevronRight, Trash2, Circle, CheckCircle2, Calendar, Clock, Filter } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import TaskCard from '@/components/TaskCard';
import NLPTaskInput from '@/components/NLPTaskInput';
import { useTasks } from '@/context/TaskContext';

const STATUS_COLOR = {
  active: 'text-green-400 bg-green-400/10 border-green-400/20',
  completed: 'text-primary bg-primary/10 border-primary/20',
  archived: 'text-muted-foreground bg-muted border-border',
  on_hold: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
};

const PROJECT_COLORS = ['#6C63FF', '#00D4FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Demo data for when backend is not available
const DEMO_PROJECTS = [
  { id: '1', name: 'Website Redesign', description: 'Complete overhaul of the company website', color: '#6C63FF', status: 'active', due_date: new Date(Date.now() + 1209600000).toISOString(), created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: '2', name: 'Mobile App v2', description: 'Version 2 of the mobile application', color: '#00D4FF', status: 'active', due_date: new Date(Date.now() + 2592000000).toISOString(), created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: '3', name: 'API Integration', description: 'Third-party API integration project', color: '#10B981', status: 'completed', due_date: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 86400000 * 14).toISOString() },
  { id: '4', name: 'Marketing Campaign', description: 'Q3 marketing campaign launch', color: '#F59E0B', status: 'on_hold', due_date: new Date(Date.now() + 604800000).toISOString(), created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
];

// View options for tasks
const VIEW_OPTIONS = ['All', 'Todo', 'In Progress', 'Done', 'Overdue'];
const SORT_OPTIONS = ['Due Date', 'Priority', 'Created Date'];

export default function Projects() {
  // Use the global task context
  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask } = useTasks();
  
  const [projects, setProjects] = useState(DEMO_PROJECTS);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#6C63FF', due_date: '' });
  const [saving, setSaving] = useState(false);
  
  // Advanced features: Filtering, Sorting, Search
  const [taskView, setTaskView] = useState('All');
  const [sortBy, setSortBy] = useState('Due Date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Load projects from backend if available
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { base44 } = await import('@/api/base44Client');
      const user = await base44.auth.me();
      const data = await base44.entities.Project.filter({ user_id: user.id }, '-created_date', 50);
      if (data && data.length > 0) {
        setProjects(data);
      }
    } catch (err) {
      console.log('Projects backend not available - using demo data');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    
    try {
      const { base44 } = await import('@/api/base44Client');
      const user = await base44.auth.me();
      const newProject = {
        name: form.name,
        description: form.description,
        color: form.color,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        status: 'active',
        user_id: user.id,
      };
      const created = await base44.entities.Project.create(newProject);
      setProjects(prev => [created, ...prev]);
      setSelectedProject(created);
    } catch (err) {
      // Fallback: save locally
      const newProject = {
        id: Date.now().toString(),
        name: form.name,
        description: form.description,
        color: form.color,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        status: 'active',
        created_at: new Date().toISOString(),
      };
      setProjects(prev => [newProject, ...prev]);
      setSelectedProject(newProject);
    }
    
    setForm({ name: '', description: '', color: '#6C63FF', due_date: '' });
    setShowCreate(false);
    setSaving(false);
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    
    try {
      const { base44 } = await import('@/api/base44Client');
      await base44.entities.Project.delete(id);
    } catch (err) {
      console.log('Failed to delete project from backend');
    }
    
    setProjects(prev => prev.filter(p => p.id !== id));
    // Remove tasks associated with this project
    const tasksToRemove = tasks.filter(t => t.project_id === id);
    for (const task of tasksToRemove) {
      await deleteTask(task.id);
    }
    if (selectedProject?.id === id) setSelectedProject(null);
  };

  const updateProjectStatus = async (projectId, newStatus) => {
    try {
      const { base44 } = await import('@/api/base44Client');
      await base44.entities.Project.update(projectId, { status: newStatus });
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      // Fallback: update locally
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => ({ ...prev, status: newStatus }));
      }
    }
  };

  // Get tasks for a specific project from the global task context
  const getProjectTasks = (projectId) => {
    return tasks.filter(t => t.project_id === projectId);
  };

  // Filter and sort tasks
  const getFilteredAndSortedTasks = (projectId) => {
    let filtered = getProjectTasks(projectId);
    
    // Filter by view
    if (taskView !== 'All') {
      const statusMap = {
        'Todo': 'todo',
        'In Progress': 'in_progress',
        'Done': 'done',
        'Overdue': 'overdue'
      };
      const status = statusMap[taskView];
      if (status === 'overdue') {
        filtered = filtered.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'done');
      } else {
        filtered = filtered.filter(t => t.status === status);
      }
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) || 
        (t.description || '').toLowerCase().includes(query) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Sort
    if (sortBy === 'Due Date') {
      filtered.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });
    } else if (sortBy === 'Priority') {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      filtered.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));
    } else if (sortBy === 'Created Date') {
      filtered.sort((a, b) => {
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }
    
    return filtered;
  };

  const getProgress = (projectId) => {
    const pts = getProjectTasks(projectId);
    if (pts.length === 0) return 0;
    return Math.round((pts.filter(t => t.status === 'done').length / pts.length) * 100);
  };

  const getTaskStats = (projectId) => {
    const pts = getProjectTasks(projectId);
    return {
      total: pts.length,
      todo: pts.filter(t => t.status === 'todo').length,
      inProgress: pts.filter(t => t.status === 'in_progress').length,
      done: pts.filter(t => t.status === 'done').length,
      overdue: pts.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'done').length,
    };
  };

  // Handle task updates using the context
  const handleTaskUpdate = async (updatedTask) => {
    try {
      const taskId = updatedTask.id || updatedTask._id || updatedTask.task_id;
      await updateTask(taskId, updatedTask);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // ✅ FIXED: Handle task creation with project association
  const handleTaskCreated = async (task) => {
    if (!selectedProject) {
      console.error('No project selected');
      return;
    }

    try {
      // ✅ Strip out any client-generated IDs (MongoDB can't accept string IDs)
      const { _id, id, task_id, __v, ...cleanTask } = task;
      
      const taskData = {
        ...cleanTask,
        project_id: selectedProject.id,
        status: task.status || 'todo',
        source: task.source || 'manual',
      };
      
      console.log('Creating task with cleaned data:', taskData);
      
      const created = await createTask(taskData);
      if (created) {
        setShowAddTask(false);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const getTaskKey = (task, index) => {
    return task.id || task._id || task.task_id || `task-${index}`;
  };

  const isLoading = loading || tasksLoading;

  const stats = selectedProject ? getTaskStats(selectedProject.id) : null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Projects List */}
      <div className={`flex flex-col border-r border-border bg-card/30 transition-all ${selectedProject ? 'w-80 shrink-0' : 'flex-1'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h1 className="font-heading text-xl font-bold tracking-wide">PROJECTS</h1>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showCreate && (
          <div className="p-4 border-b border-border space-y-3 animate-fade-in">
            <input placeholder="Project name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50" />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-primary/50" />
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-125' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
              className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
            <div className="flex gap-2">
              <button onClick={createProject} disabled={saving || !form.name.trim()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
              </button>
              <button onClick={() => setShowCreate(false)} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <FolderOpen className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium text-sm">No projects yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Create your first project to organise tasks</p>
            </div>
          ) : (
            projects.map(proj => {
              const progress = getProgress(proj.id);
              const taskCount = getProjectTasks(proj.id).length;
              const isSelected = selectedProject?.id === proj.id;
              const isOverdue = proj.due_date && isPast(new Date(proj.due_date)) && proj.status !== 'completed';
              
              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProject(isSelected ? null : proj)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-primary/30
                    ${isSelected ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-card/50 hover:bg-secondary/30'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: proj.color || '#6C63FF' }} />
                      <p className="font-semibold text-sm text-foreground truncate">{proj.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[proj.status] || STATUS_COLOR.active}`}>
                        {proj.status}
                      </span>
                      {isSelected && <ChevronRight className="w-4 h-4 text-primary ml-1" />}
                    </div>
                  </div>
                  {proj.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{proj.description}</p>}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span className="flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" />
                        {taskCount} tasks
                      </span>
                      <span className="flex items-center gap-1">
                        {isOverdue && <Clock className="w-3 h-3 text-destructive" />}
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: proj.color || '#6C63FF' }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Project Detail */}
      {selectedProject && (
        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/30">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedProject.color || '#6C63FF' }} />
              <div>
                <h2 className="font-heading text-xl font-bold tracking-wide">{selectedProject.name}</h2>
                {selectedProject.description && <p className="text-xs text-muted-foreground">{selectedProject.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedProject.status || 'active'}
                onChange={(e) => updateProjectStatus(selectedProject.id, e.target.value)}
                className="bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
              <button onClick={() => setShowAddTask(!showAddTask)} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all">
                <Plus className="w-4 h-4" /> Add Task
              </button>
              <button onClick={() => deleteProject(selectedProject.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
              <button onClick={() => setSelectedProject(null)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {stats && (
            <div className="flex items-center gap-4 px-6 py-2 border-b border-border bg-secondary/20 text-xs">
              <span className="font-medium">Stats:</span>
              <span className="text-muted-foreground">Total: <span className="text-foreground font-semibold">{stats.total}</span></span>
              <span className="text-yellow-400">Todo: {stats.todo}</span>
              <span className="text-blue-400">In Progress: {stats.inProgress}</span>
              <span className="text-green-400">Done: {stats.done}</span>
              {stats.overdue > 0 && <span className="text-destructive">Overdue: {stats.overdue}</span>}
            </div>
          )}

          <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card/20 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${showFilters ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 border border-border text-muted-foreground hover:text-foreground'}`}
            >
              <Filter className="w-3.5 h-3.5" /> Filters
            </button>
            {showFilters && (
              <div className="flex items-center gap-2">
                <select
                  value={taskView}
                  onChange={(e) => setTaskView(e.target.value)}
                  className="bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                >
                  {VIEW_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>Sort: {opt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {showAddTask && (
            <div className="px-6 py-4 border-b border-border bg-card/20 animate-fade-in">
              <NLPTaskInput
                onTaskCreated={handleTaskCreated}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : getFilteredAndSortedTasks(selectedProject.id).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <CheckSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No tasks match your filters</p>
                <p className="text-muted-foreground/60 text-sm mt-1">Try adjusting your filters or add a new task</p>
              </div>
            ) : (
              <div className="space-y-2">
                {getFilteredAndSortedTasks(selectedProject.id).map((task, index) => {
                  const key = getTaskKey(task, index);
                  return (
                    <TaskCard
                      key={key}
                      task={task}
                      onUpdate={handleTaskUpdate}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedProject && !loading && projects.length > 0 && (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <FolderOpen className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">Select a project to view its tasks</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Click on a project from the list</p>
          </div>
        </div>
      )}
    </div>
  );
}
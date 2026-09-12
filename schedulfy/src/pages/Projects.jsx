// Projects.jsx - Complete fixed version

import { useState, useEffect, useCallback } from 'react';
import { isPast } from 'date-fns';
import { useTasks } from '@/context/TaskContext';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { API_BASE } from '@/lib/sdk';
import { 
  Plus, Trash2, X, Sparkles, CheckSquare, Clock, ChevronRight, ArrowLeft,
  Filter, Loader2, FolderOpen, Users, UserPlus, User, 
  ChevronDown, Check, Calendar as CalendarIcon, Flag, Send,
  UserCheck
} from 'lucide-react';
import TaskCard from '@/components/TaskCard';
import NLPTaskInput from '@/components/NLPTaskInput';

const STATUS_COLOR = {
  active: 'text-green-400 bg-green-400/10 border-green-400/20',
  completed: 'text-primary bg-primary/10 border-primary/20',
  archived: 'text-muted-foreground bg-muted border-border',
  on_hold: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
};

const PROJECT_COLORS = ['#6C63FF', '#00D4FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Demo team members
const DEMO_TEAM_MEMBERS = [
  { id: 'user1', name: 'Alex Johnson', email: 'alex@example.com', avatar: 'https://ui-avatars.com/api/?name=Alex+Johnson&background=6C63FF&color=fff' },
  { id: 'user2', name: 'Sarah Chen', email: 'sarah@example.com', avatar: 'https://ui-avatars.com/api/?name=Sarah+Chen&background=00D4FF&color=fff' },
  { id: 'user3', name: 'Mike Rivera', email: 'mike@example.com', avatar: 'https://ui-avatars.com/api/?name=Mike+Rivera&background=10B981&color=fff' },
  { id: 'user4', name: 'Emma Williams', email: 'emma@example.com', avatar: 'https://ui-avatars.com/api/?name=Emma+Williams&background=F59E0B&color=fff' },
];

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

// FIX: Moved AssignModal outside the Projects component to prevent re-creation on every render
const AssignModal = ({ 
  selectedTaskForAssign, 
  setShowAssignModal, 
  setSelectedTaskForAssign, 
  teamMembers, 
  getTasksForMember, 
  assignTaskToMember, 
  unassignTask, 
  getTaskId 
}) => {
  if (!selectedTaskForAssign) return null;
  
  const currentAssignee = selectedTaskForAssign.assignee_id;
  const currentAssigneeName = selectedTaskForAssign.assignee_name;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass rounded-xl max-w-md w-full p-6 border border-border animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Assign Task
          </h2>
          <button
            onClick={() => {
              setShowAssignModal(false);
              setSelectedTaskForAssign(null);
            }}
            className="p-1 hover:bg-secondary/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Assign "{selectedTaskForAssign.title}" to a team member
        </p>
        
        {currentAssignee && currentAssigneeName && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Currently assigned to</p>
              <p className="text-sm font-medium text-foreground">{currentAssigneeName}</p>
            </div>
          </div>
        )}
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No team members available</p>
              <p className="text-xs">Add team members to assign tasks</p>
            </div>
          ) : (
            teamMembers.map(member => {
              const isAssigned = currentAssignee === member.id;
              const taskCount = getTasksForMember(member.id).length;
              
              return (
                <button
                  key={`assign-${member.id}`}
                  onClick={() => assignTaskToMember(getTaskId(selectedTaskForAssign), member.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isAssigned 
                      ? 'border-primary/50 bg-primary/10' 
                      : 'border-border hover:border-primary/30 hover:bg-secondary/30'
                  }`}
                >
                  <img 
                    src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6C63FF&color=fff`} 
                    alt={member.name} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email || 'No email'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{taskCount} tasks</span>
                    {isAssigned && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
        
        {currentAssignee && (
          <button
            onClick={() => unassignTask(getTaskId(selectedTaskForAssign))}
            className="mt-4 w-full text-center text-sm text-red-500 hover:text-red-400 transition-colors"
          >
            Remove assignment
          </button>
        )}
      </div>
    </div>
  );
};

export default function Projects() {
  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask } = useTasks();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [projects, setProjects] = useState(DEMO_PROJECTS);
  const [selectedProject, setSelectedProject] = useState(null);
  const [teamMembers, setTeamMembers] = useState(DEMO_TEAM_MEMBERS);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#6C63FF', due_date: '' });
  const [saving, setSaving] = useState(false);
  
  // Manual task creation state
  const [manualTaskTitle, setManualTaskTitle] = useState('');
  const [manualTaskDescription, setManualTaskDescription] = useState('');
  const [manualTaskPriority, setManualTaskPriority] = useState('medium');
  const [manualTaskDueDate, setManualTaskDueDate] = useState('');
  const [manualTaskAssignee, setManualTaskAssignee] = useState('');
  const [isManualCreating, setIsManualCreating] = useState(false);
  
  // Advanced features: Filtering, Sorting, Search
  const [taskView, setTaskView] = useState('All');
  const [sortBy, setSortBy] = useState('Due Date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter by assignee
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [workspace, setWorkspace] = useState(null);

  // FIX: Wrapped loadProjects in useCallback to resolve dependency warning
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      console.log(' Fetching projects from backend...');
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token found - using demo data');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(' Projects fetched:', data);
        
        const projectsData = (Array.isArray(data) ? data : data.projects || data.data || [])
          .map((project) => ({ ...project, id: project.id || project._id }));
        const workspaceId = currentWorkspace?.id || currentWorkspace?._id;
        const scopedProjects = projectsData.filter(
          (project) => !project.workspace_id || String(project.workspace_id) === String(workspaceId)
        );
        if (scopedProjects.length > 0) {
          // Filter out projects without valid IDs
          const validProjects = scopedProjects.filter(p => p && p.id);
          if (validProjects.length > 0) {
            setProjects(validProjects);
          } else {
            console.log('Projects missing valid IDs - using demo data');
            setProjects(DEMO_PROJECTS);
          }
        } else {
          console.log('No projects from backend - using demo data');
          setProjects(DEMO_PROJECTS);
        }
      } else {
        console.log('Backend response not OK - using demo data');
        setProjects(DEMO_PROJECTS);
      }
    } catch (error) {
      console.error(' Failed to fetch projects:', error);
      console.log('Using demo data as fallback');
      setProjects(DEMO_PROJECTS);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  const loadWorkspaceMembers = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token || !user) return;

    try {
      if (!currentWorkspace) return;

      const detailsResponse = await fetch(`${API_BASE}/workspace/${currentWorkspace.id || currentWorkspace._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const details = detailsResponse.ok ? await detailsResponse.json() : currentWorkspace;
      setWorkspace(details);
      setTeamMembers((details.members || []).map((member) => {
        const id = String(member._id || member.id);
        const name = member.name || member.full_name || member.email;
        return {
          id,
          name,
          email: member.email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6C63FF&color=fff`,
        };
      }));
    } catch (error) {
      console.error('Failed to load workspace members:', error);
    }
  }, [user, currentWorkspace]);

  // Load projects and workspace members after authentication is available.
  // FIX: Added loadProjects and loadWorkspaceMembers to dependencies
  useEffect(() => {
    loadProjects();
    loadWorkspaceMembers();
  }, [loadProjects, loadWorkspaceMembers]);

  // Handle project selection with validation
  const handleProjectSelect = (project) => {
    // Validate project
    if (!project || typeof project !== 'object') {
      console.error('Invalid project:', project);
      return;
    }
    
    if (!project.id) {
      console.error('Project missing id:', project);
      return;
    }
    
    console.log(' Clicked project:', project.name || project.id);
    
    if (selectedProject && selectedProject.id === project.id) {
      setSelectedProject(null);
    } else {
      setSelectedProject(project);
    }
  };

  const createProject = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No auth token');
      }

      const newProject = {
        name: form.name,
        description: form.description,
        color: form.color,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        status: 'active',
      };

      const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProject),
      });

      if (response.ok) {
        const createdResponse = await response.json();
        const created = { ...createdResponse, id: createdResponse.id || createdResponse._id };
        console.log(' Project created:', created);
        setProjects(prev => [created, ...prev]);
        setSelectedProject(created);
      } else {
        console.log('Backend creation failed - saving locally');
        const localProject = {
          id: Date.now().toString(),
          ...newProject,
          created_at: new Date().toISOString(),
        };
        setProjects(prev => [localProject, ...prev]);
        setSelectedProject(localProject);
      }
    } catch (error) {
      console.error(' Failed to create project:', error);
      const localProject = {
        id: Date.now().toString(),
        name: form.name,
        description: form.description,
        color: form.color,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        status: 'active',
        created_at: new Date().toISOString(),
      };
      setProjects(prev => [localProject, ...prev]);
      setSelectedProject(localProject);
    }
    
    setForm({ name: '', description: '', color: '#6C63FF', due_date: '' });
    setShowCreate(false);
    setSaving(false);
  };

  const deleteProject = async (id) => {
    if (!id) {
      console.error('Cannot delete project: No ID');
      return;
    }
    
    if (!window.confirm('Delete this project and all its tasks?')) return;
    
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const response = await fetch(`${API_BASE}/projects/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          console.log(' Project deleted from backend');
        }
      }
    } catch (error) {
      console.error('Failed to delete project from backend:', error);
    }
    
    setProjects(prev => prev.filter(p => p.id !== id));
    const tasksToRemove = tasks.filter(t => t.project_id === id);
    for (const task of tasksToRemove) {
      await deleteTask(task.id);
    }
    if (selectedProject?.id === id) setSelectedProject(null);
  };

  const updateProjectStatus = async (projectId, newStatus) => {
    if (!projectId) {
      console.error('Cannot update project: No ID');
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const response = await fetch(`${API_BASE}/projects/${projectId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        });
        
        if (response.ok) {
          console.log(' Project status updated:', newStatus);
          setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
          if (selectedProject?.id === projectId) {
            setSelectedProject(prev => ({ ...prev, status: newStatus }));
          }
          return;
        }
      }
    } catch (error) {
      console.error('Failed to update project status:', error);
    }
    
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
    if (selectedProject?.id === projectId) {
      setSelectedProject(prev => ({ ...prev, status: newStatus }));
    }
  };

  // Assign task to member
  const assignTaskToMember = async (taskId, memberId) => {
    try {
      const task = tasks.find(t => (t.id || t._id) === taskId);
      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }
      
      const member = teamMembers.find(m => String(m.id) === String(memberId));
      if (!member) {
        console.error('Member not found:', memberId);
        return;
      }
      
      console.log(` Assigning task "${task.title}" to ${member.name}`);
      
      const updatedTask = { 
        ...task, 
        assignee_id: memberId,
        assignee_name: member.name,
        assignee_avatar: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6C63FF&color=fff`
      };
      
      await updateTask(taskId, updatedTask);
      
      console.log(' Task assigned successfully:', updatedTask);
      
      setShowAssignModal(false);
      setSelectedTaskForAssign(null);
    } catch (error) {
      console.error(' Failed to assign task:', error);
    }
  };

  // Unassign task
  const unassignTask = async (taskId) => {
    try {
      const task = tasks.find(t => (t.id || t._id) === taskId);
      if (!task) return;
      
      console.log(` Unassigning task "${task.title}"`);
      
      const updatedTask = { 
        ...task, 
        assignee_id: null,
        assignee_name: null,
        assignee_avatar: null
      };
      
      await updateTask(taskId, updatedTask);
      
      console.log(' Task unassigned successfully');
      setShowAssignModal(false);
      setSelectedTaskForAssign(null);
    } catch (error) {
      console.error(' Failed to unassign task:', error);
    }
  };

  // Helper function to get assignee display info
  const getAssigneeInfo = (task) => {
    if (!task || !task.assignee_id) return null;
    
    const member = teamMembers.find(m => String(m.id) === String(task.assignee_id));
    if (member) {
      return {
        name: member.name,
        avatar: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6C63FF&color=fff`,
        id: member.id
      };
    }
    
    if (task.assignee_name) {
      return {
        name: task.assignee_name,
        avatar: task.assignee_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee_name)}&background=6C63FF&color=fff`,
        id: task.assignee_id
      };
    }
    
    return null;
  };

  const getProjectTasks = (projectId) => {
    if (!projectId) return [];
    return tasks.filter(t => String(t.project_id) === String(projectId));
  };

  const getTasksForMember = (memberId) => {
    if (!memberId) return [];
    return tasks.filter(t => String(t.assignee_id) === String(memberId));
  };

  const getFilteredAndSortedTasks = (projectId) => {
    if (!projectId) return [];
    
    let filtered = getProjectTasks(projectId);
    
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        filtered = filtered.filter(t => !t.assignee_id);
      } else {
        filtered = filtered.filter(t => String(t.assignee_id) === String(assigneeFilter));
      }
    }
    
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
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) || 
        (t.description || '').toLowerCase().includes(query) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(query))
      );
    }
    
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
    if (!projectId) return 0;
    const pts = getProjectTasks(projectId);
    if (pts.length === 0) return 0;
    return Math.round((pts.filter(t => t.status === 'done').length / pts.length) * 100);
  };

  const getTaskStats = (projectId) => {
    if (!projectId) {
      return { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 };
    }
    const pts = getProjectTasks(projectId);
    return {
      total: pts.length,
      todo: pts.filter(t => t.status === 'todo').length,
      inProgress: pts.filter(t => t.status === 'in_progress').length,
      done: pts.filter(t => t.status === 'done').length,
      overdue: pts.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'done').length,
    };
  };

  const handleTaskUpdate = async (taskId, updatedTask) => {
    try {
      const id = taskId || updatedTask.id || updatedTask._id || updatedTask.task_id;
      await updateTask(id, updatedTask);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleTaskCreated = async (task) => {
    if (!selectedProject) {
      console.error('No project selected');
      return;
    }

    try {
      const taskData = {
        ...task,
        project_id: selectedProject.id,
        workspace_id: workspace?._id || workspace?.id,
        status: task.status || 'todo',
        source: task.source || 'manual',
      };
      
      console.log(' Creating task with AI:', taskData);
      
      const created = await createTask(taskData);
      if (created) {
        setShowAddTask(false);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleManualTaskCreate = async () => {
    if (!manualTaskTitle.trim() || !selectedProject) {
      console.error('No task title or project selected');
      return;
    }

    setIsManualCreating(true);
    try {
      const member = manualTaskAssignee ? teamMembers.find(m => m.id === manualTaskAssignee) : null;
      
      const taskData = {
        title: manualTaskTitle.trim(),
        description: manualTaskDescription.trim(),
        priority: manualTaskPriority || 'medium',
        due_date: manualTaskDueDate || null,
        assignee_id: manualTaskAssignee || null,
        assignee_name: member?.name || null,
        assignee_avatar: member?.avatar || null,
        project_id: selectedProject.id,
        workspace_id: workspace?._id || workspace?.id,
        status: 'todo',
        source: 'manual',
        tags: [],
      };
      
      console.log(' Creating manual task:', taskData);
      
      const created = await createTask(taskData);
      if (created) {
        setManualTaskTitle('');
        setManualTaskDescription('');
        setManualTaskPriority('medium');
        setManualTaskDueDate('');
        setManualTaskAssignee('');
        setShowAddTask(false);
      }
    } catch (error) {
      console.error('Failed to create manual task:', error);
    } finally {
      setIsManualCreating(false);
    }
  };

  const getTaskKey = (task, index) => {
    return task.id || task._id || task.task_id || `task-${index}`;
  };

  const getTaskId = (task) => {
    return task.id || task._id || task.task_id;
  };

  const isLoading = loading || tasksLoading;
  const stats = selectedProject ? getTaskStats(selectedProject.id) : null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Projects List */}
      <div
        className={`flex-col border-r border-border bg-card/30 transition-all
          ${selectedProject ? 'hidden md:flex md:w-80 md:shrink-0' : 'flex w-full md:flex-1'}`}
      >
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
                <button key={`color-${c}`} onClick={() => setForm(p => ({ ...p, color: c }))}
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
              // Skip rendering if project doesn't have a valid ID
              if (!proj || !proj.id) {
                console.warn('Skipping project with no id:', proj);
                return null;
              }
              
              const progress = getProgress(proj.id);
              const taskCount = getProjectTasks(proj.id).length;
              const isSelected = selectedProject?.id === proj.id;
              const isOverdue = proj.due_date && isPast(new Date(proj.due_date)) && proj.status !== 'completed';
              
              return (
                <div
                  key={`project-${proj.id}`}
                  onClick={() => handleProjectSelect(proj)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-primary/30
                    ${isSelected ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-card/50 hover:bg-secondary/30'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: proj.color || '#6C63FF' }} />
                      <p className="font-semibold text-sm text-foreground truncate">{proj.name || 'Unnamed'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[proj.status] || STATUS_COLOR.active}`}>
                        {proj.status || 'active'}
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
      {selectedProject && selectedProject.id && (
        <div className="flex w-full md:flex-1 flex-col overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border bg-card/30">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSelectedProject(null)}
                className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors md:hidden shrink-0"
                aria-label="Back to projects"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: selectedProject.color || '#6C63FF' }} />
              <div className="min-w-0">
                <h2 className="font-heading text-xl font-bold tracking-wide truncate">{selectedProject.name || 'Unnamed'}</h2>
                {selectedProject.description && <p className="text-xs text-muted-foreground truncate">{selectedProject.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/30 border border-border">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="flex -space-x-1.5">
                  {teamMembers.slice(0, 3).map(member => (
                    <img
                      key={`avatar-${member.id}`}
                      src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6C63FF&color=fff`}
                      alt={member.name}
                      className="w-6 h-6 rounded-full border-2 border-background"
                      title={member.name}
                    />
                  ))}
                  {teamMembers.length > 3 && (
                    <div key="more-members" className="w-6 h-6 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                      +{teamMembers.length - 3}
                    </div>
                  )}
                </div>
              </div>
              
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
              <button onClick={() => setShowAddTask(!showAddTask)} className="hidden sm:flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all">
                <Plus className="w-4 h-4" /> Add Task
              </button>
              <button onClick={() => setShowAddTask(!showAddTask)} className="sm:hidden p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all" aria-label="Add task">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => deleteProject(selectedProject.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
              <button onClick={() => setSelectedProject(null)} className="hidden md:flex p-2 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {stats && (
            <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-2 border-b border-border bg-secondary/20 text-xs overflow-x-auto">
              <span className="font-medium shrink-0">Stats:</span>
              <span className="text-muted-foreground shrink-0">Total: <span className="text-foreground font-semibold">{stats.total}</span></span>
              <span className="text-yellow-400 shrink-0">Todo: {stats.todo}</span>
              <span className="text-blue-400 shrink-0">In Progress: {stats.inProgress}</span>
              <span className="text-green-400 shrink-0">Done: {stats.done}</span>
              {stats.overdue > 0 && <span className="text-destructive shrink-0">Overdue: {stats.overdue}</span>}
            </div>
          )}

          <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-border bg-card/20 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
            >
              <option key="all" value="all">All Members</option>
              <option key="unassigned" value="unassigned">Unassigned</option>
              {teamMembers.map(member => (
                <option key={`filter-${member.id}`} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            
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
                    <option key={`view-${opt}`} value={opt}>{opt}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={`sort-${opt}`} value={opt}>Sort: {opt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Add Task Section */}
          {showAddTask && (
            <div className="px-4 md:px-6 py-4 border-b border-border bg-card/20 animate-fade-in space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan" />
                  AI Task Creation
                </p>
                <NLPTaskInput
                  onTaskCreated={handleTaskCreated}
                  projectId={selectedProject.id}
                  workspaceId={workspace?._id || workspace?.id}
                  onClose={() => setShowAddTask(false)}
                />
              </div>
              
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Manual Task Creation
                </p>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Task title *"
                      value={manualTaskTitle}
                      onChange={(e) => setManualTaskTitle(e.target.value)}
                      className="flex-1 bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                    <select
                      value={manualTaskPriority}
                      onChange={(e) => setManualTaskPriority(e.target.value)}
                      className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    >
                      <option key="priority-low" value="low">Low</option>
                      <option key="priority-medium" value="medium">Medium</option>
                      <option key="priority-high" value="high">High</option>
                      <option key="priority-urgent" value="urgent">Urgent</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={manualTaskDescription}
                      onChange={(e) => setManualTaskDescription(e.target.value)}
                      className="flex-1 bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                    <input
                      type="datetime-local"
                      value={manualTaskDueDate}
                      onChange={(e) => setManualTaskDueDate(e.target.value)}
                      className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={manualTaskAssignee}
                      onChange={(e) => setManualTaskAssignee(e.target.value)}
                      className="flex-1 bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    >
                      <option key="assign-none" value="">Unassigned</option>
                      {teamMembers.map(member => (
                        <option key={`assign-${member.id}`} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleManualTaskCreate}
                      disabled={isManualCreating || !manualTaskTitle.trim()}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {isManualCreating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Add Task
                    </button>
                    <button
                      onClick={() => {
                        setShowAddTask(false);
                        setManualTaskTitle('');
                        setManualTaskDescription('');
                        setManualTaskPriority('medium');
                        setManualTaskDueDate('');
                        setManualTaskAssignee('');
                      }}
                      className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : getFilteredAndSortedTasks(selectedProject.id).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <CheckSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No tasks in this project</p>
                <p className="text-muted-foreground/60 text-sm mt-1">Click "Add Task" to create your first task</p>
              </div>
            ) : (
              <div className="space-y-2">
                {getFilteredAndSortedTasks(selectedProject.id).map((task, index) => {
                  const key = getTaskKey(task, index);
                  const taskId = getTaskId(task);
                  const assigneeInfo = getAssigneeInfo(task);
                  
                  return (
                    <div key={key} className="relative group">
                      <TaskCard
                        task={task}
                        onUpdate={(id, updated) => handleTaskUpdate(id || taskId, updated)}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {assigneeInfo ? (
                          <button
                            onClick={() => {
                              setSelectedTaskForAssign(task);
                              setShowAssignModal(true);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary hover:bg-primary/20 transition-colors"
                          >
                            <img 
                              src={assigneeInfo.avatar} 
                              alt={assigneeInfo.name} 
                              className="w-5 h-5 rounded-full"
                            />
                            <span className="hidden sm:inline">{assigneeInfo.name.split(' ')[0]}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedTaskForAssign(task);
                              setShowAssignModal(true);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/60 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span className="hidden sm:inline">Assign</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedProject && !loading && projects.length > 0 && (
        <div className="hidden md:flex flex-1 items-center justify-center text-center">
          <div>
            <FolderOpen className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">Select a project to view its tasks</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Click on a project from the list</p>
          </div>
        </div>
      )}

      {/* FIX: Render the external AssignModal and pass the required props */}
      {showAssignModal && (
        <AssignModal 
          selectedTaskForAssign={selectedTaskForAssign}
          setShowAssignModal={setShowAssignModal}
          setSelectedTaskForAssign={setSelectedTaskForAssign}
          teamMembers={teamMembers}
          getTasksForMember={getTasksForMember}
          assignTaskToMember={assignTaskToMember}
          unassignTask={unassignTask}
          getTaskId={getTaskId}
        />
      )}
    </div>
  );
}
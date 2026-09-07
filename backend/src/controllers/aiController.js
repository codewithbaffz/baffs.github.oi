// backend/src/controllers/aiController.js
import User from '../models/User.js';
import Task from '../models/Task.js';
import Workspace from '../models/Workspace.js';
import groqService from '../services/groqService.js';

// Process AI command
export const processAICommand = async (req, res) => {
  try {
    const { command, context } = req.body;
    
    //  Try multiple ways to get userId
    const userId = req.userId || req.user?.id || req.user?.userId;
    
    console.log(' AI Command received:', command);
    console.log(' User ID from request:', userId);
    console.log(' Full req.user:', req.user);
    console.log(' Full req.userId:', req.userId);

    if (!command) {
      return res.status(400).json({
        type: 'error',
        message: 'Command is required',
      });
    }

    if (!userId) {
      console.log(' No user ID found in request');
      return res.status(401).json({
        type: 'error',
        message: 'Authentication required. Please login again.',
      });
    }

    // Get user from database
    const user = await User.findById(userId);
    console.log(' User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(404).json({
        type: 'error',
        message: 'User not found',
      });
    }

    const workspaces = await Workspace.find({ member_ids: userId }).select('_id admin_id visibility');
    const visibleWorkspaceIds = workspaces
      .filter((workspace) => workspace.admin_id === userId || workspace.visibility?.tasks !== false)
      .map((workspace) => workspace._id);
    const tasks = await Task.find({
      $or: [
        { user_id: userId },
        { workspace_id: { $in: visibleWorkspaceIds } },
      ],
    }).sort({ created_at: -1 }).lean();
    console.log(' Tasks found:', tasks.length);

    const response = await groqService.processCommand(command, {
      tasks,
      user: { name: user.name, email: user.email },
      stats: context?.stats,
    });

    res.json({
      ...response,
      type: response.type || response.intent || 'query',
      requiresConfirmation: response.requiresConfirmation || response.intent === 'delete',
    });
  } catch (error) {
    console.error(' AI processing error:', error);
    console.error(' Stack:', error.stack);
    res.status(502).json({
      type: 'error',
      message: error.message || 'The AI service could not process that request. Please try again.',
      error: error.message,
    });
  }
};

// Execute AI action
export const executeAIAction = async (req, res) => {
  try {
    const { action } = req.body;
    const userId = req.userId || req.user?.id || req.user?.userId;

    console.log(' Executing action:', action.type);
    console.log(' User ID:', userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login again.',
      });
    }

    let result;

    switch (action.type) {
      case 'create':
        result = await createTask(action.data, userId);
        break;
      case 'update':
        result = await updateTask(action.data, userId);
        break;
      case 'delete':
        result = await deleteTask(action.data, userId);
        break;
      case 'query':
        result = await queryTasks(action.data, userId);
        break;
      default:
        throw new Error('Unknown action type');
    }

    res.json(result);
  } catch (error) {
    console.error(' Action execution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute action',
      error: error.message,
    });
  }
};

// Process command - Simple version for testing
async function processCommand(command, context) {
  const { tasks, user } = context;
  const commandLower = command.toLowerCase();

  console.log(' Processing command:', commandLower);

  // Check for task creation
  if (commandLower.includes('create') || commandLower.includes('new task') || commandLower.includes('add task')) {
    let title = command;
    const phrases = ['create a new task', 'create task', 'new task', 'add task', 'create'];
    for (const phrase of phrases) {
      title = title.replace(new RegExp(phrase, 'i'), '').trim();
    }
    title = title.replace(/for (today|tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, '').trim();
    
    if (!title) {
      return {
        type: 'error',
        message: 'Please specify what task you want to create.',
        requiresConfirmation: false,
      };
    }

    return {
      type: 'create',
      data: {
        title: title || 'Untitled Task',
        priority: 'medium',
        status: 'todo',
      },
      message: `I'll create a new task: "${title}"`,
      requiresConfirmation: false,
    };
  }

  // Check for task listing
  if (commandLower.includes('show') || commandLower.includes('list') || commandLower.includes('view') || commandLower.includes('tasks')) {
    const taskList = tasks.map((t, i) => `${i + 1}. ${t.title} (${t.status || 'todo'})`).join('\n');
    return {
      type: 'query',
      data: { tasks },
      message: tasks.length > 0 
        ? `You have ${tasks.length} tasks:\n${taskList}`
        : 'You have no tasks yet.',
      requiresConfirmation: false,
    };
  }

  // Check for task deletion
  if (commandLower.includes('delete') || commandLower.includes('remove')) {
    if (tasks.length === 0) {
      return {
        type: 'error',
        message: 'You have no tasks to delete.',
        requiresConfirmation: false,
      };
    }
    return {
      type: 'delete',
      data: { 
        ids: tasks.map(t => t._id).slice(0, 1),
        title: tasks[0]?.title || 'task'
      },
      message: `Are you sure you want to delete "${tasks[0]?.title || 'this task'}"?`,
      requiresConfirmation: true,
    };
  }

  // Default response
  return {
    type: 'query',
    data: { tasks },
    message: ` Hello! I can help you manage your tasks. You have ${tasks.length} tasks. Try saying "create a new task" or "show my tasks".`,
    requiresConfirmation: false,
  };
}

// Helper functions
async function createTask(data, userId) {
  try {
    const task = new Task({
      title: data.title,
      description: data.description || '',
      priority: data.priority || 'medium',
      status: data.status || 'todo',
      due_date: data.due_date || null,
      tags: data.tags || [],
      is_ai_generated: true,
      source: 'ai_assistant',
      userId: userId,
    });

    const created = await task.save();

    return {
      success: true,
      task: created,
      message: `Created task: "${created.title}"`,
    };
  } catch (error) {
    console.error('Create task error:', error);
    return {
      success: false,
      message: 'Failed to create task',
      error: error.message,
    };
  }
}

async function updateTask(data, userId) {
  try {
    const { ids, changes } = data;
    const taskIds = ids || [data.id];

    if (!taskIds || taskIds.length === 0) {
      throw new Error('No task IDs provided');
    }

    const results = [];
    for (const id of taskIds) {
      const updated = await Task.findByIdAndUpdate(id, changes, { new: true });
      if (updated) results.push(updated);
    }

    return {
      success: true,
      tasks: results,
      message: `Updated ${results.length} task(s)`,
    };
  } catch (error) {
    console.error('Update task error:', error);
    return {
      success: false,
      message: 'Failed to update tasks',
      error: error.message,
    };
  }
}

async function deleteTask(data, userId) {
  try {
    const { ids, reason } = data;
    const taskIds = ids || [data.id];

    if (!taskIds || taskIds.length === 0) {
      throw new Error('No task IDs provided');
    }

    const results = [];
    for (const id of taskIds) {
      const deleted = await Task.findByIdAndDelete(id);
      if (deleted) results.push(id);
    }

    return {
      success: true,
      deletedIds: results,
      message: `Deleted ${results.length} task(s)${reason ? `: ${reason}` : ''}`,
    };
  } catch (error) {
    console.error('Delete task error:', error);
    return {
      success: false,
      message: 'Failed to delete tasks',
      error: error.message,
    };
  }
}

async function queryTasks(data, userId) {
  try {
    let query = { userId };
    const { status, priority, tags } = data;

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    let filtered = await Task.find(query);

    if (data.query) {
      const q = data.query.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    return {
      success: true,
      tasks: filtered,
      count: filtered.length,
      message: ` Found ${filtered.length} task(s) matching your query`,
    };
  } catch (error) {
    console.error('Query tasks error:', error);
    return {
      success: false,
      message: ' Failed to query tasks',
      error: error.message,
    };
  }
}

export default {
  processAICommand,
  executeAIAction,
};
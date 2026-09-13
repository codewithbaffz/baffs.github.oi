// backend/src/controllers/aiController.js
import User from '../models/User.js';
import Task from '../models/Task.js';
import Workspace from '../models/Workspace.js';
import groqService from '../services/groqService.js';

// ---------------------------------------------------------------------------
// Filter tasks locally based on the AI's query intent
// ---------------------------------------------------------------------------
function filterTasks(tasks, data = {}) {
  let result = Array.isArray(tasks) ? [...tasks] : [];

  if (data.status) {
    result = result.filter((t) => t.status === data.status);
  }
  if (data.priority) {
    result = result.filter((t) => t.priority === data.priority);
  }
  if (Array.isArray(data.tags) && data.tags.length > 0) {
    result = result.filter((t) =>
      (t.tags || []).some((tag) => data.tags.includes(tag))
    );
  }
  if (data.query && data.query.trim()) {
    const q = data.query.toLowerCase();
    result = result.filter(
      (t) =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
    );
  }
  return result;
}

// ---------------------------------------------------------------------------
// Build a nicer query message than "Here are your tasks."
// ---------------------------------------------------------------------------
function buildQueryMessage(filtered, originalMessage) {
  // If AI already gave a specific message that isn't the generic one, keep it
  const isGeneric =
    !originalMessage ||
    /^here (are|is) your/i.test(originalMessage.trim()) ||
    /here are your current tasks/i.test(originalMessage);

  if (!isGeneric) return originalMessage;

  if (filtered.length === 0) {
    return 'You have no tasks matching that.';
  }
  if (filtered.length === 1) {
    return 'Here is your task:';
  }
  return `You have ${filtered.length} tasks:`;
}

// Process AI command
export const processAICommand = async (req, res) => {
  try {
    const { command, context } = req.body;

    const userId = req.userId || req.user?.id || req.user?.userId;

    console.log(' AI Command received:', command);
    console.log(' User ID from request:', userId);

    if (!command) {
      return res.status(400).json({
        type: 'error',
        message: 'Command is required',
      });
    }

    if (!userId) {
      return res.status(401).json({
        type: 'error',
        message: 'Authentication required. Please login again.',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        type: 'error',
        message: 'User not found',
      });
    }

    const workspaces = await Workspace.find({ member_ids: userId }).select(
      '_id admin_id visibility'
    );
    const visibleWorkspaceIds = workspaces
      .filter(
        (workspace) =>
          workspace.admin_id === userId ||
          workspace.visibility?.tasks !== false
      )
      .map((workspace) => workspace._id);

    const tasks = await Task.find({
      $or: [
        { user_id: userId },
        { workspace_id: { $in: visibleWorkspaceIds } },
      ],
    })
      .sort({ created_at: -1 })
      .lean();

    console.log(' Tasks found:', tasks.length);

    const response = await groqService.processCommand(command, {
      tasks,
      user: { name: user.name, email: user.email },
      stats: context?.stats,
    });

    const intent = response.intent || response.type || 'query';

    // -----------------------------------------------------------------------
    // If it's a query, actually attach the filtered tasks so the frontend
    // can render them (frontend reads action.data.tasks).
    // -----------------------------------------------------------------------
    let enriched = { ...response };

    if (intent === 'query') {
      const filtered = filterTasks(tasks, response.data || {});
      enriched = {
        ...response,
        data: {
          ...(response.data || {}),
          tasks: filtered,
        },
        message: buildQueryMessage(filtered, response.message),
      };
    }

    res.json({
      ...enriched,
      type: enriched.type || enriched.intent || 'query',
      requiresConfirmation:
        enriched.requiresConfirmation || enriched.intent === 'delete',
    });
  } catch (error) {
    console.error(' AI processing error:', error);
    console.error(' Stack:', error.stack);
    res.status(502).json({
      type: 'error',
      message:
        error.message ||
        'The AI service could not process that request. Please try again.',
      error: error.message,
    });
  }
};

// Execute AI action
export const executeAIAction = async (req, res) => {
  try {
    const { action } = req.body;
    const userId = req.userId || req.user?.id || req.user?.userId;

    console.log(' Executing action:', action?.type);
    console.log(' User ID:', userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login again.',
      });
    }

    if (!action || !action.type) {
      return res.status(400).json({
        success: false,
        message: 'Action payload is missing or malformed.',
      });
    }

    let result;

    switch (action.type) {
      case 'create':
        result = await createTask(action.data || {}, userId);
        break;
      case 'update':
        result = await updateTask(action.data || {}, userId);
        break;
      case 'delete':
        result = await deleteTask(action.data || {}, userId);
        break;
      case 'query':
        result = await queryTasks(action.data || {}, userId);
        break;
      default:
        return res.status(200).json({
          success: false,
          needsMoreInfo: true,
          message: `I'm not sure how to handle a "${action.type}" action yet. Try rephrasing?`,
        });
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

// ---- Helpers ---------------------------------------------------------------

const VALID_PRIORITIES = ['urgent', 'high', 'medium', 'low'];
const VALID_STATUSES = ['todo', 'in_progress', 'done', 'overdue', 'snoozed'];

function normalizeTitle(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, ' ');
}
function normalizePriority(raw) {
  if (typeof raw !== 'string') return 'medium';
  const p = raw.toLowerCase().trim();
  return VALID_PRIORITIES.includes(p) ? p : 'medium';
}
function normalizeStatus(raw) {
  if (typeof raw !== 'string') return 'todo';
  const s = raw.toLowerCase().trim().replace(/\s+/g, '_');
  return VALID_STATUSES.includes(s) ? s : 'todo';
}
function normalizeDueDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

async function createTask(data, userId) {
  try {
    const title = normalizeTitle(data.title);

    if (!title) {
      return {
        success: false,
        needsMoreInfo: true,
        message:
          'Sure — what would you like the task to be called? Try something like "Create a task called Buy groceries tomorrow at 5pm".',
      };
    }

    const task = new Task({
      title,
      description:
        typeof data.description === 'string' ? data.description.trim() : '',
      priority: normalizePriority(data.priority),
      status: normalizeStatus(data.status),
      due_date: normalizeDueDate(data.due_date),
      tags: Array.isArray(data.tags)
        ? data.tags.map((t) => String(t).trim()).filter(Boolean)
        : [],
      is_ai_generated: true,
      source: 'ai_assistant',
      user_id: userId, // <-- matches your schema's field name
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
    const taskIds = ids || (data.id ? [data.id] : []);

    if (!taskIds.length) {
      return {
        success: false,
        needsMoreInfo: true,
        message: 'Which task would you like to update?',
      };
    }

    const safeChanges = { ...changes };
    if ('priority' in safeChanges)
      safeChanges.priority = normalizePriority(safeChanges.priority);
    if ('status' in safeChanges)
      safeChanges.status = normalizeStatus(safeChanges.status);
    if ('due_date' in safeChanges)
      safeChanges.due_date = normalizeDueDate(safeChanges.due_date);
    if ('title' in safeChanges) {
      const t = normalizeTitle(safeChanges.title);
      if (!t) delete safeChanges.title;
      else safeChanges.title = t;
    }

    const results = [];
    for (const id of taskIds) {
      const updated = await Task.findOneAndUpdate(
        { _id: id, $or: [{ user_id: userId }, { userId }] },
        safeChanges,
        { new: true }
      );
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
    const taskIds = ids || (data.id ? [data.id] : []);

    if (!taskIds.length) {
      return {
        success: false,
        needsMoreInfo: true,
        message: 'Which task would you like to delete?',
      };
    }

    const results = [];
    for (const id of taskIds) {
      const deleted = await Task.findOneAndDelete({
        _id: id,
        $or: [{ user_id: userId }, { userId }],
      });
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
    const query = { $or: [{ user_id: userId }, { userId }] };
    const { status, priority, tags } = data;

    if (status) query.status = normalizeStatus(status);
    if (priority) query.priority = normalizePriority(priority);
    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    let filtered = await Task.find(query);

    if (data.query) {
      const q = data.query.toLowerCase();
      filtered = filtered.filter(
        (t) =>
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
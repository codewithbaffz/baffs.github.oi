import Notification from '../models/Notification.js';
import Workspace from '../models/Workspace.js';
import User from '../models/User.js';

export const notifyUsers = async ({ userIds, actorId, actorName, workspaceId, type, title, message, entityType, entityId }) => {
  const recipients = [...new Set(userIds.map(String))].filter((userId) => userId !== String(actorId));
  if (recipients.length === 0) return;

  await Notification.insertMany(recipients.map((userId) => ({
    user_id: userId,
    workspace_id: workspaceId,
    type,
    title,
    message: message.replaceAll('{{actor}}', actorName || 'A team member'),
    actor_name: actorName || 'A team member',
    entity_type: entityType,
    entity_id: entityId ? String(entityId) : undefined,
  })));
};

export const notifyWorkspace = async ({ workspaceId, actorId, type, title, message, entityType, entityId, onlyUserId }) => {
  const workspace = await Workspace.findById(workspaceId).select('member_ids');
  if (!workspace) return;
  const actor = await User.findById(actorId).select('name email').lean();

  await notifyUsers({
    userIds: onlyUserId ? [onlyUserId] : workspace.member_ids,
    actorId,
    actorName: actor?.name || actor?.email,
    workspaceId,
    type,
    title,
    message,
    entityType,
    entityId,
  });
};

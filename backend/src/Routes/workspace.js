// backend/src/Routes/workspace.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import mongoose from 'mongoose';
import { resolve4, resolveMx } from 'node:dns/promises';
import { generateInviteToken, sendInvitationEmail } from '../services/emailService.js';
import Workspace from '../models/Workspace.js';
import User from '../models/User.js';
import { notifyWorkspace } from '../services/notificationService.js';
import Task from '../models/Task.js';
import TeamMessage from '../models/TeamMessage.js';
import TeamMeeting from '../models/TeamMeeting.js';

const router = express.Router();

const hasMailServer = async (email) => {
  const domain = email.split('@')[1];

  try {
    if ((await resolveMx(domain)).length > 0) return true;
  } catch (error) {
    if (!['ENODATA', 'ENOTFOUND'].includes(error.code)) throw error;
  }

  // Domains without MX records may receive mail through their A record.
  try {
    return (await resolve4(domain)).length > 0;
  } catch (error) {
    if (['ENODATA', 'ENOTFOUND'].includes(error.code)) return false;
    throw error;
  }
};

// Get all workspaces
router.get('/', authenticate, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ member_ids: req.userId }).lean();
    if (workspaces.length === 0) {
      const workspace = await Workspace.create({
        name: 'Schedulfy Team',
        description: 'Main product development workspace',
        admin_id: req.userId,
        invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        member_ids: [req.userId],
      });
      return res.json([{ ...workspace.toObject(), id: workspace._id }]);
    }
    res.json(workspaces.map((workspace) => ({ ...workspace, id: workspace._id })));
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ message: 'Failed to fetch workspaces' });
  }
});

// Create workspace
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name?.trim()) return res.status(400).json({ message: 'Workspace name is required' });

    const workspace = await Workspace.create({
      name: name.trim(),
      description,
      admin_id: req.userId,
      invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      member_ids: [req.userId],
    });

    res.status(201).json({ ...workspace.toObject(), id: workspace._id });
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({ message: 'Failed to create workspace' });
  }
});

// Invite member - FIXED
router.post('/:workspaceId/invite', authenticate, async (req, res) => {
  console.log(' Invitation request received');
  console.log(' Email:', req.body?.email);
  console.log(' Workspace ID:', req.params.workspaceId);
  console.log(' User ID:', req.userId);
  
  try {
    const { workspaceId } = req.params;
    const email = req.body?.email?.trim().toLowerCase();
    const inviterId = req.userId;

    // Validate inputs
    if (!email) {
      console.log(' No email provided');
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (!(await hasMailServer(email))) {
      return res.status(400).json({
        message: `The email domain for ${email} cannot receive mail. Check the address and try again.`,
      });
    }

    if (!workspaceId) {
      console.log(' No workspace ID provided');
      return res.status(400).json({ 
        message: 'Workspace ID is required' 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({ message: 'Invalid workspace ID' });
    }

    const workspace = await Workspace.findOne({ _id: workspaceId, member_ids: inviterId });
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (workspace.admin_id !== inviterId) {
      return res.status(403).json({ message: 'Only the workspace admin can invite members' });
    }

    console.log(' Invitation validated');

    // Generate invitation token
    const inviteToken = generateInviteToken();
    console.log(' Generated token:', inviteToken);

    // Send the invitation through the configured SMTP provider.
    await sendInvitationEmail({
      email,
      workspaceName: workspace.name,
      inviterName: (await User.findById(inviterId).select('name'))?.name || 'A team member',
      inviteCode: workspace.invite_code,
      inviteToken,
    });

    workspace.invitations = workspace.invitations.filter((invitation) =>
      !(invitation.email === email && !invitation.accepted)
    );
    workspace.invitations.push({
      email,
      token: inviteToken,
      invited_by: inviterId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await workspace.save();

    console.log(' Invitation sent successfully to:', email);

    res.status(200).json({
      success: true,
      message: `Invitation sent to ${email}`,
      inviteToken: inviteToken,
    });
  } catch (error) {
    console.error(' Error sending invitation:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to send invitation'
    });
  }
});

// Accept invitation
router.post('/accept-invite', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.userId;

    if (!token || !userId) {
      return res.status(400).json({ 
        message: 'Token and userId are required' 
      });
    }

    const workspace = await Workspace.findOne({
      'invitations.token': token,
      'invitations.accepted': false,
    });
    if (!workspace) return res.status(404).json({ message: 'Invitation not found or already accepted' });

    const invitation = workspace.invitations.find((item) => item.token === token);
    if (!invitation || invitation.expires_at < new Date()) {
      return res.status(410).json({ message: 'This invitation has expired' });
    }

    const user = await User.findById(userId).select('email name');
    if (!user || user.email !== invitation.email) {
      return res.status(403).json({ message: `Sign in with ${invitation.email} to accept this invitation` });
    }

    if (!workspace.member_ids.includes(userId)) workspace.member_ids.push(userId);
    invitation.accepted = true;
    await workspace.save();

    await notifyWorkspace({
      workspaceId: workspace._id,
      actorId: userId,
      type: 'team_update',
      title: 'New member joined',
      message: '{{actor}} joined ' + workspace.name + '.',
      entityType: 'workspace',
      entityId: workspace._id,
    });

    res.json({
      success: true,
      message: 'Successfully joined workspace',
      workspace: {
        id: workspace._id,
        name: workspace.name,
        invite_code: workspace.invite_code,
      },
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to accept invitation'
    });
  }
});

// Get workspace by ID
router.get('/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findOne({ _id: workspaceId, member_ids: req.userId }).lean();
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    const members = workspace.visibility?.members === false && workspace.admin_id !== req.userId
      ? []
      : await User.find({ _id: { $in: workspace.member_ids } }).select('name email').lean();
    res.json({ ...workspace, id: workspace._id, members });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    res.status(500).json({ message: 'Failed to fetch workspace' });
  }
});

// Update workspace visibility. Only the admin can change what members can see.
router.patch('/:workspaceId/settings', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const allowedKeys = ['tasks', 'projects', 'members'];
    const updates = Object.fromEntries(
      allowedKeys
        .filter((key) => typeof req.body?.[key] === 'boolean')
        .map((key) => [`visibility.${key}`, req.body[key]])
    );

    const workspace = await Workspace.findOne({ _id: workspaceId, admin_id: req.userId });
    if (!workspace) return res.status(403).json({ message: 'Only the workspace admin can change settings' });
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'At least one visibility setting is required' });
    }

    Object.entries(updates).forEach(([path, value]) => {
      const key = path.split('.')[1];
      workspace.visibility[key] = value;
    });
    await workspace.save();
    res.json({ visibility: workspace.visibility });
  } catch (error) {
    console.error('Error updating workspace settings:', error);
    res.status(500).json({ message: 'Failed to update workspace settings' });
  }
});

// A member can leave, but the admin must transfer ownership first.
router.post('/:workspaceId/leave', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findOne({ _id: req.params.workspaceId, member_ids: req.userId });
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (workspace.admin_id === req.userId) {
      return res.status(400).json({ message: 'The workspace admin cannot leave the workspace' });
    }

    workspace.member_ids = workspace.member_ids.filter((memberId) => memberId !== req.userId);
    await workspace.save();
    res.json({ success: true, message: 'You left the workspace' });
  } catch (error) {
    console.error('Error leaving workspace:', error);
    res.status(500).json({ message: 'Failed to leave workspace' });
  }
});

// Remove a member. Only the workspace admin can do this.
router.delete('/:workspaceId/members/:memberId', authenticate, async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;
    const workspace = await Workspace.findOne({ _id: workspaceId, admin_id: req.userId });
    if (!workspace) return res.status(403).json({ message: 'Only the workspace admin can remove members' });
    if (!workspace.member_ids.includes(memberId)) {
      return res.status(404).json({ message: 'Member is not in this workspace' });
    }
    if (memberId === req.userId) {
      return res.status(400).json({ message: 'The workspace admin cannot remove themselves' });
    }

    const member = await User.findById(memberId).select('email');
    workspace.member_ids = workspace.member_ids.filter((id) => id !== memberId);
    workspace.invitations = workspace.invitations.filter(
      (invitation) => invitation.email !== member?.email
    );
    await workspace.save();
    await Task.updateMany(
      { workspace_id: workspace._id, assignee_id: memberId },
      { $unset: { assignee_id: 1, assignee_name: 1, assignee_avatar: 1 } }
    );
    res.json({ success: true, message: 'Member removed from workspace' });
  } catch (error) {
    console.error('Error removing workspace member:', error);
    res.status(500).json({ message: 'Failed to remove workspace member' });
  }
});

// Load recent team chat messages for a workspace member.
router.get('/:workspaceId/messages', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findOne({ _id: req.params.workspaceId, member_ids: req.userId }).select('_id');
    if (!workspace) return res.status(403).json({ message: 'You are not a member of this workspace' });
    const messages = await TeamMessage.find({ workspace_id: workspace._id })
      .sort({ created_at: -1 })
      .limit(100)
      .lean();
    res.json(messages.reverse().map((message) => ({ ...message, id: message._id })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to load team messages' });
  }
});

// Post a message to the current workspace team chat.
router.post('/:workspaceId/messages', authenticate, async (req, res) => {
  try {
    const messageText = req.body?.message?.trim();
    const replyTo = req.body?.reply_to || null;
    if (!messageText) return res.status(400).json({ message: 'Message is required' });
    const workspace = await Workspace.findOne({ _id: req.params.workspaceId, member_ids: req.userId }).select('_id');
    if (!workspace) return res.status(403).json({ message: 'You are not a member of this workspace' });
    if (replyTo) {
      const repliedMessage = await TeamMessage.findOne({ _id: replyTo, workspace_id: workspace._id }).select('_id');
      if (!repliedMessage) return res.status(400).json({ message: 'The message you are replying to was not found' });
    }
    const author = await User.findById(req.userId).select('name email');
    const message = await TeamMessage.create({
      workspace_id: workspace._id,
      author_id: req.userId,
      author_name: author?.name || author?.email || 'Team member',
      message: messageText,
      reply_to: replyTo,
    });
    res.status(201).json({ ...message.toObject(), id: message._id });
  } catch (error) {
    res.status(400).json({ message: 'Failed to send team message' });
  }
});

// Delete a team message. Authors can delete their own messages; admins can moderate the workspace chat.
router.delete('/:workspaceId/messages/:messageId', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findOne({ _id: req.params.workspaceId, member_ids: req.userId }).select('admin_id');
    if (!workspace) return res.status(403).json({ message: 'You are not a member of this workspace' });
    const message = await TeamMessage.findOne({ _id: req.params.messageId, workspace_id: req.params.workspaceId });
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.author_id !== req.userId && workspace.admin_id !== req.userId) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    await TeamMessage.deleteOne({ _id: message._id });
    await TeamMessage.updateMany({ reply_to: message._id }, { $set: { reply_to: null } });
    res.json({ success: true, id: message._id });
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete team message' });
  }
});

// Save an external Zoom scheduling link for the workspace team.
router.get('/:workspaceId/meetings', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findOne({ _id: req.params.workspaceId, member_ids: req.userId }).select('_id');
    if (!workspace) return res.status(403).json({ message: 'You are not a member of this workspace' });
    const meetings = await TeamMeeting.find({ workspace_id: workspace._id, starts_at: { $gte: new Date() } })
      .sort({ starts_at: 1 })
      .limit(20)
      .lean();
    res.json(meetings.map((meeting) => ({ ...meeting, id: meeting._id })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to load team meetings' });
  }
});

router.post('/:workspaceId/meetings', authenticate, async (req, res) => {
  try {
    const { title, starts_at: startsAt, duration_minutes: durationMinutes } = req.body || {};
    const workspace = await Workspace.findOne({ _id: req.params.workspaceId, member_ids: req.userId }).select('_id');
    if (!workspace) return res.status(403).json({ message: 'You are not a member of this workspace' });
    if (!title?.trim() || !startsAt || Number.isNaN(new Date(startsAt).getTime())) {
      return res.status(400).json({ message: 'Title and a valid start time are required' });
    }
    const author = await User.findById(req.userId).select('name email');
    const meeting = await TeamMeeting.create({
      workspace_id: workspace._id,
      created_by: req.userId,
      creator_name: author?.name || author?.email || 'Team member',
      title: title.trim(),
      starts_at: new Date(startsAt),
      duration_minutes: Number(durationMinutes) || 30,
      zoom_url: 'https://zoom.us/meeting/schedule',
    });
    res.status(201).json({ ...meeting.toObject(), id: meeting._id });
  } catch (error) {
    res.status(400).json({ message: 'Failed to schedule team meeting' });
  }
});

export default router;
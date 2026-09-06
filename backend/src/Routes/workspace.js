// backend/src/Routes/workspace.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import mongoose from 'mongoose';
import { resolve4, resolveMx } from 'node:dns/promises';
import { generateInviteToken, sendInvitationEmail } from '../services/emailService.js';
import Workspace from '../models/Workspace.js';
import User from '../models/User.js';
import { notifyWorkspace } from '../services/notificationService.js';

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
      console.log('❌ No workspace ID provided');
      return res.status(400).json({ 
        message: 'Workspace ID is required' 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({ message: 'Invalid workspace ID' });
    }

    const workspace = await Workspace.findOne({ _id: workspaceId, member_ids: inviterId });
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    console.log('✅ Invitation validated');

    // Generate invitation token
    const inviteToken = generateInviteToken();
    console.log('🔑 Generated token:', inviteToken);

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

    console.log('✅ Invitation sent successfully to:', email);

    res.status(200).json({
      success: true,
      message: `Invitation sent to ${email}`,
      inviteToken: inviteToken,
    });
  } catch (error) {
    console.error('❌ Error sending invitation:', error);
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
    const members = await User.find({ _id: { $in: workspace.member_ids } }).select('name email').lean();
    res.json({ ...workspace, id: workspace._id, members });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    res.status(500).json({ message: 'Failed to fetch workspace' });
  }
});

export default router;
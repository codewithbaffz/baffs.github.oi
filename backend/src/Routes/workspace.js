// backend/src/Routes/workspace.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import mongoose from 'mongoose';
import crypto from 'crypto';

const router = express.Router();

// Generate invite token
const generateInviteToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Mock email function (will be replaced later)
const sendInvitationEmail = async (inviteData) => {
  console.log('📧 Would send email to:', inviteData.email);
  console.log('📝 Workspace:', inviteData.workspaceName);
  console.log('👤 Inviter:', inviteData.inviterName);
  console.log('🔑 Invite code:', inviteData.inviteCode);
  return { success: true };
};

// Get all workspaces
router.get('/', authenticate, async (req, res) => {
  try {
    // For now, return a default workspace since we don't have a Workspace model yet
    res.json([{
      id: '1',
      name: 'Schedulfy Team',
      description: 'Main product development workspace',
      admin_id: req.userId,
      invite_code: 'SCHD42',
      member_ids: [req.userId],
    }]);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ message: 'Failed to fetch workspaces' });
  }
});

// Create workspace
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Create a workspace object (without database for now)
    const workspace = {
      id: Date.now().toString(),
      name,
      description,
      admin_id: req.userId,
      invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      member_ids: [req.userId],
    };
    
    res.status(201).json(workspace);
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({ message: 'Failed to create workspace' });
  }
});

// Invite member - FIXED
router.post('/:workspaceId/invite', authenticate, async (req, res) => {
  console.log('📨 Invitation request received');
  console.log('📧 Email:', req.body?.email);
  console.log('🏢 Workspace ID:', req.params.workspaceId);
  console.log('👤 User ID:', req.userId);
  
  try {
    const { workspaceId } = req.params;
    const { email } = req.body;
    const inviterId = req.userId;

    // Validate inputs
    if (!email) {
      console.log('❌ No email provided');
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }

    if (!workspaceId) {
      console.log('❌ No workspace ID provided');
      return res.status(400).json({ 
        message: 'Workspace ID is required' 
      });
    }

    console.log('✅ Invitation validated');

    // Generate invitation token
    const inviteToken = generateInviteToken();
    console.log('🔑 Generated token:', inviteToken);

    // Try to send email (it will log to console for now)
    await sendInvitationEmail({
      email,
      workspaceName: 'Schedulfy Team',
      inviterName: 'Team Member',
      inviteCode: 'SCHD42',
      inviteToken,
    });

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
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, userId } = req.body;

    if (!token || !userId) {
      return res.status(400).json({ 
        message: 'Token and userId are required' 
      });
    }

    res.json({
      success: true,
      message: 'Successfully joined workspace',
      workspace: {
        id: '1',
        name: 'Schedulfy Team',
        invite_code: 'SCHD42',
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

    res.json({
      id: workspaceId,
      name: 'Schedulfy Team',
      description: 'Main product development workspace',
      admin_id: req.userId,
      invite_code: 'SCHD42',
      member_ids: [req.userId],
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    res.status(500).json({ message: 'Failed to fetch workspace' });
  }
});

export default router;
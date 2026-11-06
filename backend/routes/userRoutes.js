/**
 * @file backend/routes/userRoutes.js
 * @description System Admin User Governance & Access Control endpoints
 */
const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const { fallbackUsers } = require('./authRoutes');

/**
 * GET /api/users
 * Strictly visible and operational ONLY for System Admins.
 * Retrieves full platform user directory.
 */
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    let users = [];
    try {
      users = await User.find().select('-password').sort({ createdAt: -1 });
    } catch (dbErr) {
      // Fallback
      users = fallbackUsers.map(({ password, passwordHash, ...rest }) => rest);
    }

    if (!users || users.length === 0) {
      users = fallbackUsers.map(({ password, passwordHash, ...rest }) => rest);
    }

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve system user directory.',
      error: error.message,
    });
  }
});

/**
 * PATCH /api/users/:id/role
 * Elevated System Admin endpoint to modify user roles
 */
router.patch('/:id/role', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!['customer', 'vendor', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified. Must be customer, vendor, or admin.',
      });
    }

    let updatedUser;
    try {
      updatedUser = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
    } catch (e) {
      const match = fallbackUsers.find((u) => u._id === userId);
      if (match) {
        match.role = role;
        const { password, passwordHash, ...rest } = match;
        updatedUser = rest;
      }
    }

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.json({
      success: true,
      message: `User role successfully updated to ${role.toUpperCase()}.`,
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update user role.',
    });
  }
});

/**
 * PATCH /api/users/:id/status
 * Suspends or activates user access
 */
router.patch('/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.params.id;

    if (!['active', 'suspended', 'revoked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, suspended, or revoked.',
      });
    }

    let updatedUser;
    try {
      updatedUser = await User.findByIdAndUpdate(userId, { status }, { new: true }).select('-password');
    } catch (e) {
      const match = fallbackUsers.find((u) => u._id === userId);
      if (match) {
        match.status = status;
        const { password, passwordHash, ...rest } = match;
        updatedUser = rest;
      }
    }

    return res.json({
      success: true,
      message: `User status set to ${status.toUpperCase()}.`,
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update user status.',
    });
  }
});

/**
 * DELETE /api/users/:id
 * Revokes and deletes a user account strictly by System Admins
 */
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Security Violation: Cannot delete your own active administrator account.',
      });
    }

    try {
      await User.findByIdAndDelete(userId);
    } catch (e) {
      const idx = fallbackUsers.findIndex((u) => u._id === userId);
      if (idx !== -1) fallbackUsers.splice(idx, 1);
    }

    return res.json({
      success: true,
      message: 'User account revoked and deleted from platform successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke user account.',
    });
  }
});

module.exports = router;

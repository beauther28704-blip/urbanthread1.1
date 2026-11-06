/**
 * @file backend/routes/authRoutes.js
 * @description Authentication endpoints for Customer, Vendor, and Admin registration and login
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET, verifyToken } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Fallback in-memory users with pre-seeded demo accounts for instant zero-config testing
const fallbackUsers = [
  {
    _id: 'usr_admin_01',
    name: 'Prince Wisdom (Admin)',
    email: 'admin@urbanthread.co',
    passwordHash: bcrypt.hashSync('AdminPass2026!', 8),
    role: 'admin',
    brandName: 'UrbanThread HQ',
    status: 'active',
    createdAt: new Date(),
  },
  {
    _id: 'usr_vendor_01',
    name: 'Beauther Ndemo (Vendor)',
    email: 'vendor@urbanthread.co',
    passwordHash: bcrypt.hashSync('VendorPass2026!', 8),
    role: 'vendor',
    brandName: 'Tokyo Void Streetwear',
    status: 'active',
    createdAt: new Date(),
  },
  {
    _id: 'usr_customer_01',
    name: 'Scarlett Flowerlett (Customer)',
    email: 'customer@urbanthread.co',
    passwordHash: bcrypt.hashSync('CustomerPass2026!', 8),
    role: 'customer',
    brandName: '',
    status: 'active',
    createdAt: new Date(),
  },
];

/**
 * POST /api/auth/register
 * Register a new Customer or Business / Vendor
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, brandName, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    // Sanitize role: only 'customer' or 'vendor' can self-register.
    // 'admin' role requires system admin elevation.
    const assignedRole = role === 'vendor' ? 'vendor' : 'customer';

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await User.findOne({ email: cleanEmail });
    } catch (e) {
      existingUser = fallbackUsers.find((u) => u.email === cleanEmail);
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let savedUser;
    try {
      savedUser = await User.create({
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: assignedRole,
        brandName: brandName || (assignedRole === 'vendor' ? `${name} Atelier` : ''),
        phone: phone || '',
        status: 'active',
      });
    } catch (dbErr) {
      savedUser = {
        _id: `usr_${Date.now()}`,
        name,
        email: cleanEmail,
        passwordHash: hashedPassword,
        role: assignedRole,
        brandName: brandName || '',
        phone: phone || '',
        status: 'active',
        createdAt: new Date(),
      };
      fallbackUsers.push(savedUser);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: `Account created successfully as ${assignedRole.toUpperCase()}.`,
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        brandName: savedUser.brandName || '',
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create account.',
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user credentials and return JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    let user;
    try {
      user = await User.findOne({ email: cleanEmail });
    } catch (e) {
      // ignore
    }

    if (!user) {
      user = fallbackUsers.find((u) => u.email === cleanEmail);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    if (user.status === 'revoked' || user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'This account has been revoked by System Administrators.',
      });
    }

    const passwordToCompare = user.password || user.passwordHash;
    const isMatch = await bcrypt.compare(password, passwordToCompare);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        brandName: user.brandName || '',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.',
      error: error.message,
    });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current profile from bearer token
 */
router.get('/me', verifyToken, async (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

module.exports = {
  router,
  fallbackUsers,
};

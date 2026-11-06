/**
 * @file backend/middleware/authMiddleware.js
 * @description Role-Based Access Control (RBAC) middleware for UrbanThread
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'urbanthread-super-secret-jwt-key-2026';

/**
 * verifyToken
 * Authenticates JWT tokens from the Authorization header for any logged-in user.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: Missing or malformed authorization token.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, name }
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Invalid or expired token.'
    });
  }
}

/**
 * verifyVendor
 * Restricts access to Vendors and Admins for store inventory management.
 */
function verifyVendor(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication required.'
    });
  }

  const role = (req.user.role || '').toLowerCase();
  if (role === 'vendor' || role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden: Access restricted to verified Vendors and System Administrators.'
  });
}

/**
 * verifyAdmin
 * Restricts user account revocation and platform governance strictly to System Admins.
 */
function verifyAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication required.'
    });
  }

  const role = (req.user.role || '').toLowerCase();
  if (role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden: Strictly restricted to System Administrators only.'
  });
}

module.exports = {
  verifyToken,
  verifyVendor,
  verifyAdmin,
  JWT_SECRET
};

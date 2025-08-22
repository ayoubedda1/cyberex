// routes/user.js - Enhanced with RBAC
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const UserService = require('../services/userservices');
const UserRoleService = require('../services/UserRoleServices');
const { verifyJwtToken, requireAdmin, canModifyUser, preventSelfPrivilegeEscalation } = require('../middlewares/auth');

// Apply authentication to all user routes
router.use(verifyJwtToken);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: Retrieve all users from the database with optional pagination and filters. Only administrators can view all users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name or email
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       401:
 *         description: Unauthorized - JWT token required
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { page, limit, search, isActive } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search: search || null,
      isActive: isActive !== undefined ? isActive === 'true' : null
    };

    logger.info('Admin users endpoint accessed', {
      ip: req.ip,
      adminUserId: req.user?.userId,
      userRoles: req.user?.roles,
      endpoint: '/api/users',
      method: 'GET',
      options
    });

    const result = await UserService.getAllUsers(options);
    
    res.json(result);
  } catch (error) {
    logger.error('Error retrieving users', {
      error: error.message,
      ip: req.ip,
      userId: req.user?.userId
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while fetching users'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a specific user by their ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('Get user by ID endpoint accessed', {
      userId: id,
      ip: req.ip,
      currentUserId: req.user?.userId,
      endpoint: `/api/users/${id}`,
      method: 'GET'
    });

    const result = await UserService.getUserById(id);
    res.json(result);
  } catch (error) {
    logger.error('Error retrieving user', {
      error: error.message,
      userId: req.params.id,
      ip: req.ip,
      currentUserId: req.user?.userId
    });

    if (error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with the specified ID'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the user'
    });
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create new user
 *     description: Create a new user in the database
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 128
 *                 example: "password123"
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "John Doe"
 *               exercise_id:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const userData = req.body;
    
    logger.info('Create user endpoint accessed', {
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: '/api/users',
      method: 'POST'
    });

    const result = await UserService.createUser(userData);

    logger.info('User created successfully', {
      ip: req.ip,
      userId: req.user?.userId,
      newUserId: result.data.id
    });

    res.status(201).json({
      ...result,
      message: 'User created successfully'
    });
  } catch (error) {
    logger.error('Error creating user', {
      error: error.message,
      ip: req.ip,
      userId: req.user?.userId
    });

    if (error.message.includes('validation') || error.message.includes('required') || 
        error.message.includes('Invalid') || error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while creating the user'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     description: Update an existing user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 128
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               exercise_id:
 *                 type: string
 *                 format: uuid
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.put('/:id', canModifyUser, preventSelfPrivilegeEscalation, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    logger.info('Update user endpoint accessed', {
      userId: id,
      ip: req.ip,
      currentUserId: req.user?.userId,
      endpoint: `/api/users/${id}`,
      method: 'PUT'
    });

    const result = await UserService.updateUser(id, updateData);

    logger.info('User updated successfully', {
      ip: req.ip,
      currentUserId: req.user?.userId,
      userId: id
    });

    res.json({
      ...result,
      message: 'User updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user', {
      error: error.message,
      userId: req.params.id,
      ip: req.ip,
      currentUserId: req.user?.userId
    });

    if (error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with the specified ID'
      });
    }

    if (error.message.includes('validation') || error.message.includes('Invalid') || 
        error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while updating the user'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}/activate:
 *   patch:
 *     summary: Activate user
 *     description: Activate a user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User activated successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.patch('/:id/activate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('Activate user endpoint accessed', {
      userId: id,
      ip: req.ip,
      currentUserId: req.user?.userId,
      endpoint: `/api/users/${id}/activate`,
      method: 'PATCH'
    });

    const result = await UserService.activateUser(id);

    logger.info('User activated successfully', {
      ip: req.ip,
      currentUserId: req.user?.userId,
      userId: id
    });

    res.json({
      ...result,
      message: 'User activated successfully'
    });
  } catch (error) {
    logger.error('Error activating user', {
      error: error.message,
      userId: req.params.id,
      ip: req.ip,
      currentUserId: req.user?.userId
    });

    if (error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with the specified ID'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while activating the user'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate user
 *     description: Deactivate a user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.patch('/:id/deactivate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('Deactivate user endpoint accessed', {
      userId: id,
      ip: req.ip,
      currentUserId: req.user?.userId,
      endpoint: `/api/users/${id}/deactivate`,
      method: 'PATCH'
    });

    const result = await UserService.deactivateUser(id);

    logger.info('User deactivated successfully', {
      ip: req.ip,
      currentUserId: req.user?.userId,
      userId: id
    });

    res.json({
      ...result,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    logger.error('Error deactivating user', {
      error: error.message,
      userId: req.params.id,
      ip: req.ip,
      currentUserId: req.user?.userId
    });

    if (error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with the specified ID'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while deactivating the user'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}/password:
 *   patch:
 *     summary: Change user password
 *     description: Change password for a specific user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 128
 *                 example: "newPassword123"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.patch('/:id/password', canModifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'New password is required'
      });
    }

    logger.info('Change password endpoint accessed', {
      userId: id,
      ip: req.ip,
      currentUserId: req.user?.userId,
      endpoint: `/api/users/${id}/password`,
      method: 'PATCH'
    });

    const result = await UserService.changePassword(id, newPassword);

    logger.info('Password changed successfully', {
      ip: req.ip,
      currentUserId: req.user?.userId,
      userId: id
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Error changing password', {
      error: error.message,
      userId: req.params.id,
      ip: req.ip,
      currentUserId: req.user?.userId
    });

    if (error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with the specified ID'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while changing the password'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Delete a user (soft delete - marks as deleted but preserves data)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to permanently delete the user
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const permanent = req.query.permanent === 'true';
    
    logger.info('Delete user endpoint accessed', {
      userId: id,
      ip: req.ip,
      currentUserId: req.user?.userId,
      endpoint: `/api/users/${id}`,
      method: 'DELETE',
      permanent
    });

    const result = await UserService.deleteUser(id, permanent);

    logger.info('User deleted successfully', {
      ip: req.ip,
      currentUserId: req.user?.userId,
      userId: id,
      permanent
    });

    res.json(result);
  } catch (error) {
    logger.error('Error deleting user', {
      error: error.message,
      userId: req.params.id,
      ip: req.ip,
      currentUserId: req.user?.userId
    });

    if (error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with the specified ID'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the user'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}/restore:
 *   patch:
 *     summary: Restore deleted user
 *     description: Restore a soft-deleted user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User restored successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.patch('/:id/restore', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('Restore user endpoint accessed', {
      userId: id,
      ip: req.ip,
      currentUserId: req.user?.userId,
      endpoint: `/api/users/${id}/restore`,
      method: 'PATCH'
    });

    const result = await UserService.restoreUser(id);

    logger.info('User restored successfully', {
      ip: req.ip,
      currentUserId: req.user?.userId,
      userId: id
    });

    res.json({
      ...result,
      message: 'User restored successfully'
    });
  } catch (error) {
    logger.error('Error restoring user', {
      error: error.message,
      userId: req.params.id,
      ip: req.ip,
      currentUserId: req.user?.userId
    });

    if (error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with the specified ID'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while restoring the user'
    });
  }
});

module.exports = router;
/**
 * Assignment endpoints (Admin only)
 * - Assign a role to a user
 * - Revoke a role from a user
 */

/**
 * @swagger
 * /api/users/{id}/roles:
 *   post:
 *     summary: Assign role to user (Admin only)
 *     description: Assign a role to a user with optional metadata
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleId
 *             properties:
 *               roleId:
 *                 type: string
 *                 format: uuid
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role assigned successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin required
 */
router.post('/:id/roles', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId, expiresAt, notes } = req.body || {};

    if (!roleId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'roleId is required'
      });
    }

    const result = await UserRoleService.assignRole(id, roleId, {
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: notes || null
    });

    return res.json({
      ...result,
      message: 'Role assigned successfully'
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/users/{id}/roles/{roleId}:
 *   delete:
 *     summary: Revoke role from user (Admin only)
 *     description: Revoke an active role assignment from a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role revoked successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin required
 *       404:
 *         description: Assignment not found
 */
router.delete('/:id/roles/:roleId', requireAdmin, async (req, res) => {
  try {
    const { id, roleId } = req.params;
    const result = await UserRoleService.revokeRole(id, roleId);
    return res.json(result);
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      error: status === 404 ? 'Not Found' : 'Bad Request',
      message: error.message
    });
  }
});
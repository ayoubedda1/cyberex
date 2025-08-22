// routes/role.js - Enhanced with RBAC
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const RoleService = require('../services/RoleServices');
const UserRoleService = require('../services/UserRoleServices');
const TaskService = require('../services/TaskServices');
const { verifyJwtToken, requireAdmin } = require('../middlewares/auth');

// Apply authentication to all role routes
router.use(verifyJwtToken);

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all active roles
 *     description: Retrieve all active roles from the database
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active roles retrieved successfully
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.get('/', async (req, res) => {
  try {
    logger.info('Roles endpoint accessed', {
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: '/api/roles',
      method: 'GET'
    });

    const result = await RoleService.getAllActiveRoles();

    res.json({
      ...result,
      count: result.data.length
    });
  } catch (error) {
    logger.error('Error retrieving roles', {
      error: error.message,
      ip: req.ip,
      userId: req.user?.userId
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while fetching roles'
    });
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     description: Retrieve a specific role by its ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *       404:
 *         description: Role not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Get role by ID endpoint accessed', {
      roleId: id,
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: `/api/roles/${id}`,
      method: 'GET'
    });

    const result = await RoleService.getRoleById(id);
    res.json(result);
  } catch (error) {
    logger.error('Error retrieving role', {
      error: error.message,
      roleId: req.params.id,
      ip: req.ip,
      userId: req.user?.userId
    });

    if (error.message.includes('non trouvé') || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
        message: 'No role found with the specified ID'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the role'
    });
  }
});

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create new role
 *     description: Create a new role in the database
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "Security Analyst"
 *               description:
 *                 type: string
 *                 example: "Responsible for analyzing security threats and vulnerabilities"
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const roleData = req.body;

    logger.info('Create role endpoint accessed', {
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: '/api/roles',
      method: 'POST'
    });

    const result = await RoleService.createRole(roleData);

    logger.info('Role created successfully', {
      ip: req.ip,
      userId: req.user?.userId,
      roleId: result.data.id
    });

    res.status(201).json({
      ...result,
      message: 'Role created successfully'
    });
  } catch (error) {
    logger.error('Error creating role', {
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
      message: 'An error occurred while creating the role'
    });
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Update role
 *     description: Update an existing role by ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: Role not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    logger.info('Update role endpoint accessed', {
      roleId: id,
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: `/api/roles/${id}`,
      method: 'PUT'
    });

    const result = await RoleService.updateRole(id, updateData);

    logger.info('Role updated successfully', {
      ip: req.ip,
      userId: req.user?.userId,
      roleId: id
    });

    res.json({
      ...result,
      message: 'Role updated successfully'
    });
  } catch (error) {
    logger.error('Error updating role', {
      error: error.message,
      roleId: req.params.id,
      ip: req.ip,
      userId: req.user?.userId
    });

    if (error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
        message: 'No role found with the specified ID'
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
      message: 'An error occurred while updating the role'
    });
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete role
 *     description: Delete a role by ID (hard delete - removes from database)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       404:
 *         description: Role not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const permanent = req.query.permanent === 'true';

    logger.info('Delete role endpoint accessed', {
      roleId: id,
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: `/api/roles/${id}`,
      method: 'DELETE',
      permanent
    });

    const result = await RoleService.deleteRole(id, permanent);

    logger.info('Role deleted successfully', {
      ip: req.ip,
      userId: req.user?.userId,
      roleId: id,
      permanent
    });

    res.json(result);
  } catch (error) {
    logger.error('Error deleting role', {
      error: error.message,
      roleId: req.params.id,
      ip: req.ip,
      userId: req.user?.userId
    });

    if (error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
        message: 'No role found with the specified ID'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the role'
    });
  }
});

/**
 * @swagger
 * /api/roles/{id}/restore:
 *   patch:
 *     summary: Restore deleted role
 *     description: Restore a soft-deleted role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role restored successfully
 *       404:
 *         description: Role not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.patch('/:id/restore', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Restore role endpoint accessed', {
      roleId: id,
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: `/api/roles/${id}/restore`,
      method: 'PATCH'
    });

    const result = await RoleService.restoreRole(id);

    logger.info('Role restored successfully', {
      ip: req.ip,
      userId: req.user?.userId,
      roleId: id
    });

    res.json({
      ...result,
      message: 'Role restored successfully'
    });
  } catch (error) {
    logger.error('Error restoring role', {
      error: error.message,
      roleId: req.params.id,
      ip: req.ip,
      userId: req.user?.userId
    });

    if (error.message.includes('non trouvé') || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
        message: 'No role found with the specified ID'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while restoring the role'
    });
  }
});

/**
 * @swagger
 * /api/roles/{id}/users:
 *   post:
 *     summary: Assign role to user (Admin only)
 *     description: Assign this role to a user with optional metadata
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role assigned to user successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin required
 */
router.post('/:id/users', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, expiresAt, notes } = req.body || {};
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'userId is required'
      });
    }
    const result = await UserRoleService.assignRole(userId, id, {
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: notes || null
    });
    return res.json({
      ...result,
      message: 'Role assigned to user successfully'
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
 * /api/roles/{id}/users/{userId}:
 *   delete:
 *     summary: Revoke role from user (Admin only)
 *     description: Revoke this role from a user
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: Role revoked from user successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin required
 *       404:
 *         description: Assignment not found
 */
router.delete('/:id/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const result = await UserRoleService.revokeRole(userId, id);
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

/**
 * @swagger
 * /api/roles/{id}/tasks:
 *   post:
 *     summary: Assign task to role (Admin only)
 *     description: Assign a task to this role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *             properties:
 *               taskId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Task assigned to role successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin required
 */
router.post('/:id/tasks', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params; // roleId
    const { taskId } = req.body || {};
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'taskId is required'
      });
    }
    const result = await TaskService.assignToRole(taskId, id);
    return res.json(result);
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
 * /api/roles/{id}/tasks/{taskId}:
 *   delete:
 *     summary: Unassign task from role (Admin only)
 *     description: Remove a task from this role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task unassigned from role successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin required
 *       404:
 *         description: Assignment not found
 */
router.delete('/:id/tasks/:taskId', requireAdmin, async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const result = await TaskService.unassignFromRole(taskId, id);
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

module.exports = router;

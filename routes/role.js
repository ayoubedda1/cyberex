const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const RoleService = require('../services/RoleServices');

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
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["read", "write", "delete"]
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.post('/', async (req, res) => {
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
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
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
router.put('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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
router.patch('/:id/restore', async (req, res) => {
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

module.exports = router;

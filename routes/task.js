// routes/task.js - Enhanced with RBAC
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const TaskService = require('../services/TaskServices');
const { verifyJwtToken, requireAdmin } = require('../middlewares/auth');

// Apply authentication to all task routes
router.use(verifyJwtToken);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks
 *     description: Retrieve all tasks from the database. All authenticated users can view tasks.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tasks retrieved successfully
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.get('/', async (req, res) => {
  try {
    logger.info('Tasks endpoint accessed', {
      ip: req.ip,
      userId: req.user?.userId,
      userRoles: req.user?.roles,
      endpoint: '/api/tasks',
      method: 'GET'
    });

    const result = await TaskService.getAllTasks();

    res.json({
      ...result,
      count: result.data.length
    });
  } catch (error) {
    logger.error('Error retrieving tasks', {
      error: error.message,
      ip: req.ip,
      userId: req.user?.userId
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while fetching tasks'
    });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     description: Retrieve a specific task by its ID. All authenticated users can view tasks.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Get task by ID endpoint accessed', {
      taskId: id,
      ip: req.ip,
      userId: req.user?.userId,
      userRoles: req.user?.roles,
      endpoint: `/api/tasks/${id}`,
      method: 'GET'
    });

    const result = await TaskService.getTaskById(id);
    res.json(result);
  } catch (error) {
    logger.error('Error retrieving task', {
      error: error.message,
      taskId: req.params.id,
      ip: req.ip,
      userId: req.user?.userId
    });

    if (error.message.includes('non trouvé') || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'No task found with the specified ID'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the task'
    });
  }
});

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create new task (Admin only)
 *     description: Create a new task in the database. Only administrators can create tasks.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 example: "SQL Injection Prevention"
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *                 example: "Learn how to prevent SQL injection attacks in web applications"
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - JWT token required
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const taskData = req.body;

    logger.info('Admin create task endpoint accessed', {
      ip: req.ip,
      adminUserId: req.user?.userId,
      userRoles: req.user?.roles,
      endpoint: '/api/tasks',
      method: 'POST',
      taskTitle: taskData.title
    });

    const result = await TaskService.createTask(taskData);

    logger.info('Task created successfully by admin', {
      ip: req.ip,
      adminUserId: req.user?.userId,
      taskId: result.data.id,
      taskTitle: result.data.title
    });

    res.status(201).json({
      ...result,
      message: 'Task created successfully'
    });
  } catch (error) {
    logger.error('Error creating task', {
      error: error.message,
      ip: req.ip,
      adminUserId: req.user?.userId
    });

    if (error.message.includes('validation') || error.message.includes('required') ||
        error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while creating the task'
    });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update task (Admin only)
 *     description: Update an existing task by ID. Only administrators can update tasks.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized - JWT token required
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    logger.info('Admin update task endpoint accessed', {
      taskId: id,
      ip: req.ip,
      adminUserId: req.user?.userId,
      userRoles: req.user?.roles,
      endpoint: `/api/tasks/${id}`,
      method: 'PUT',
      updateFields: Object.keys(updateData)
    });

    const result = await TaskService.updateTask(id, updateData);

    logger.info('Task updated successfully by admin', {
      ip: req.ip,
      adminUserId: req.user?.userId,
      taskId: id,
      updatedFields: Object.keys(updateData)
    });

    res.json({
      ...result,
      message: 'Task updated successfully'
    });
  } catch (error) {
    logger.error('Error updating task', {
      error: error.message,
      taskId: req.params.id,
      ip: req.ip,
      adminUserId: req.user?.userId
    });

    if (error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'No task found with the specified ID'
      });
    }

    if (error.message.includes('validation') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while updating the task'
    });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete task (Admin only)
 *     description: Delete a task by ID (soft delete - marks as deleted but preserves data). Only administrators can delete tasks.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to permanently delete the task
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized - JWT token required
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const permanent = req.query.permanent === 'true';

    logger.info('Admin delete task endpoint accessed', {
      taskId: id,
      ip: req.ip,
      adminUserId: req.user?.userId,
      userRoles: req.user?.roles,
      endpoint: `/api/tasks/${id}`,
      method: 'DELETE',
      permanent
    });

    const result = await TaskService.deleteTask(id, permanent);

    logger.info('Task deleted successfully by admin', {
      ip: req.ip,
      adminUserId: req.user?.userId,
      taskId: id,
      permanent
    });

    res.json(result);
  } catch (error) {
    logger.error('Error deleting task', {
      error: error.message,
      taskId: req.params.id,
      ip: req.ip,
      adminUserId: req.user?.userId
    });

    if (error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'No task found with the specified ID'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the task'
    });
  }
});

/**
 * @swagger
 * /api/tasks/{id}/restore:
 *   patch:
 *     summary: Restore deleted task (Admin only)
 *     description: Restore a soft-deleted task. Only administrators can restore tasks.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task restored successfully
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized - JWT token required
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.patch('/:id/restore', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Admin restore task endpoint accessed', {
      taskId: id,
      ip: req.ip,
      adminUserId: req.user?.userId,
      endpoint: `/api/tasks/${id}/restore`,
      method: 'PATCH'
    });

    const result = await TaskService.restoreTask(id);

    logger.info('Task restored successfully by admin', {
      ip: req.ip,
      adminUserId: req.user?.userId,
      taskId: id
    });

    res.json({
      ...result,
      message: 'Task restored successfully'
    });
  } catch (error) {
    logger.error('Error restoring task', {
      error: error.message,
      taskId: req.params.id,
      ip: req.ip,
      adminUserId: req.user?.userId
    });

    if (error.message.includes('non trouvé') || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'No task found with the specified ID'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while restoring the task'
    });
  }
});

module.exports = router;

/**
 * @swagger
 * /api/tasks/{id}/assign:
 *   post:
 *     summary: Assign task to role (Admin only)
 *     description: Assign a task to a role
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
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
router.post('/:id/assign', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body || {};
    if (!roleId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'roleId is required'
      });
    }
    const result = await TaskService.assignToRole(id, roleId);
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
 * /api/tasks/{id}/assign/{roleId}:
 *   delete:
 *     summary: Unassign task from role (Admin only)
 *     description: Remove role assignment from a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
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
router.delete('/:id/assign/:roleId', requireAdmin, async (req, res) => {
  try {
    const { id, roleId } = req.params;
    const result = await TaskService.unassignFromRole(id, roleId);
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
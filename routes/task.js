const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const TaskService = require('../services/TaskServices');

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks
 *     description: Retrieve all tasks from the database
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
 *     description: Retrieve a specific task by its ID
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
 *     summary: Create new task
 *     description: Create a new task in the database
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
 */
router.post('/', async (req, res) => {
  try {
    const taskData = req.body;

    logger.info('Create task endpoint accessed', {
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: '/api/tasks',
      method: 'POST'
    });

    const result = await TaskService.createTask(taskData);

    logger.info('Task created successfully', {
      ip: req.ip,
      userId: req.user?.userId,
      taskId: result.data.id
    });

    res.status(201).json({
      ...result,
      message: 'Task created successfully'
    });
  } catch (error) {
    logger.error('Error creating task', {
      error: error.message,
      ip: req.ip,
      userId: req.user?.userId
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
 *     summary: Update task
 *     description: Update an existing task by ID
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
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    logger.info('Update task endpoint accessed', {
      taskId: id,
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: `/api/tasks/${id}`,
      method: 'PUT'
    });

    const result = await TaskService.updateTask(id, updateData);

    logger.info('Task updated successfully', {
      ip: req.ip,
      userId: req.user?.userId,
      taskId: id
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
      userId: req.user?.userId
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
 *     summary: Delete task
 *     description: Delete a task 
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
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const permanent = req.query.permanent === 'true';

    logger.info('Delete task endpoint accessed', {
      taskId: id,
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: `/api/tasks/${id}`,
      method: 'DELETE',
      permanent
    });

    const result = await TaskService.deleteTask(id, permanent);

    logger.info('Task deleted successfully', {
      ip: req.ip,
      userId: req.user?.userId,
      taskId: id,
      permanent
    });

    res.json(result);
  } catch (error) {
    logger.error('Error deleting task', {
      error: error.message,
      taskId: req.params.id,
      ip: req.ip,
      userId: req.user?.userId
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
 *     summary: Restore deleted task
 *     description: Restore a soft-deleted task
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
 */
router.patch('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Restore task endpoint accessed', {
      taskId: id,
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: `/api/tasks/${id}/restore`,
      method: 'PATCH'
    });

    const result = await TaskService.restoreTask(id);

    logger.info('Task restored successfully', {
      ip: req.ip,
      userId: req.user?.userId,
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
      message: 'An error occurred while restoring the task'
    });
  }
});

module.exports = router;

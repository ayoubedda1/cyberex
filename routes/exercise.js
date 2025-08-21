const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const ExerciseService = require('../services/ExerciceServices');

/**
 * @swagger
 * /api/exercises:
 *   get:
 *     summary: Get all exercises
 *     description: Retrieve all exercises from the database
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of exercises retrieved successfully
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.get('/', async (req, res) => {
  try {
    logger.info('Exercises endpoint accessed', {
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: '/api/exercises',
      method: 'GET'
    });

    const result = await ExerciseService.getAllExercises();

    res.json({
      ...result,
      count: result.data.length
    });
  } catch (error) {
    logger.error('Error retrieving exercises', {
      error: error.message,
      ip: req.ip,
      userId: req.user?.userId
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while fetching exercises'
    });
  }
});

/**
 * @swagger
 * /api/exercises/{id}:
 *   get:
 *     summary: Get exercise by ID
 *     description: Retrieve a specific exercise by its ID
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Exercise ID
 *     responses:
 *       200:
 *         description: Exercise retrieved successfully
 *       404:
 *         description: Exercise not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Get exercise by ID endpoint accessed', {
      exerciseId: id,
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: `/api/exercises/${id}`,
      method: 'GET'
    });

    const result = await ExerciseService.getExerciseById(id);
    res.json(result);
  } catch (error) {
    logger.error('Error retrieving exercise', {
      error: error.message,
      exerciseId: req.params.id,
      ip: req.ip,
      userId: req.user?.userId
    });

    if (error.message.includes('non trouvé') || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Exercise not found',
        message: 'No exercise found with the specified ID'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the exercise'
    });
  }
});

/**
 * @swagger
 * /api/exercises:
 *   post:
 *     summary: Create new exercise
 *     description: Create a new exercise in the database
 *     tags: [Exercises]
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
 *               - start_date
 *               - end_date
 *             properties:
 *               name:
 *                 type: string
 *                 example: "SQL Injection Challenge"
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T00:00:00.000Z"
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-02-15T00:00:00.000Z"
 *               status:
 *                 type: string
 *                 enum: [active, closed]
 *                 example: "active"
 *     responses:
 *       201:
 *         description: Exercise created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.post('/', async (req, res) => {
  try {
    const exerciseData = req.body;

    logger.info('Create exercise endpoint accessed', {
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: '/api/exercises',
      method: 'POST'
    });

    const result = await ExerciseService.createExercise(exerciseData);

    logger.info('Exercise created successfully', {
      ip: req.ip,
      userId: req.user?.userId,
      exerciseId: result.data.id
    });

    res.status(201).json({
      ...result,
      message: 'Exercise created successfully'
    });
  } catch (error) {
    logger.error('Error creating exercise', {
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
      message: 'An error occurred while creating the exercise'
    });
  }
});

/**
 * @swagger
 * /api/exercises/{id}:
 *   put:
 *     summary: Update exercise
 *     description: Update an existing exercise by ID
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Exercise ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [active, closed]
 *     responses:
 *       200:
 *         description: Exercise updated successfully
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: Exercise not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    logger.info('Update exercise endpoint accessed', {
      exerciseId: id,
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: `/api/exercises/${id}`,
      method: 'PUT'
    });

    const result = await ExerciseService.updateExercise(id, updateData);

    logger.info('Exercise updated successfully', {
      ip: req.ip,
      userId: req.user?.userId,
      exerciseId: id
    });

    res.json({
      ...result,
      message: 'Exercise updated successfully'
    });
  } catch (error) {
    logger.error('Error updating exercise', {
      error: error.message,
      exerciseId: req.params.id,
      ip: req.ip,
      userId: req.user?.userId
    });

    if (error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'Exercise not found',
        message: 'No exercise found with the specified ID'
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
      message: 'An error occurred while updating the exercise'
    });
  }
});

/**
 * @swagger
 * /api/exercises/{id}:
 *   delete:
 *     summary: Delete exercise
 *     description: Delete an exercise by ID (soft delete - marks as deleted but preserves data)
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Exercise ID
 *     responses:
 *       200:
 *         description: Exercise deleted successfully
 *       404:
 *         description: Exercise not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const permanent = req.query.permanent === 'true';

    logger.info('Delete exercise endpoint accessed', {
      exerciseId: id,
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: `/api/exercises/${id}`,
      method: 'DELETE',
      permanent
    });

    const result = await ExerciseService.deleteExercise(id, permanent);

    logger.info('Exercise deleted successfully', {
      ip: req.ip,
      userId: req.user?.userId,
      exerciseId: id,
      permanent
    });

    res.json(result);
  } catch (error) {
    logger.error('Error deleting exercise', {
      error: error.message,
      exerciseId: req.params.id,
      ip: req.ip,
      userId: req.user?.userId
    });

    if (error.message.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'Exercise not found',
        message: 'No exercise found with the specified ID'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the exercise'
    });
  }
});

/**
 * @swagger
 * /api/exercises/{id}/restore:
 *   patch:
 *     summary: Restore deleted exercise
 *     description: Restore a soft-deleted exercise
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Exercise ID
 *     responses:
 *       200:
 *         description: Exercise restored successfully
 *       404:
 *         description: Exercise not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.patch('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Restore exercise endpoint accessed', {
      exerciseId: id,
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: `/api/exercises/${id}/restore`,
      method: 'PATCH'
    });

    const result = await ExerciseService.restoreExercise(id);

    logger.info('Exercise restored successfully', {
      ip: req.ip,
      userId: req.user?.userId,
      exerciseId: id
    });

    res.json({
      ...result,
      message: 'Exercise restored successfully'
    });
  } catch (error) {
    logger.error('Error restoring exercise', {
      error: error.message,
      exerciseId: req.params.id,
      ip: req.ip,
      userId: req.user?.userId
    });

    if (error.message.includes('non trouvé') || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Exercise not found',
        message: 'No exercise found with the specified ID'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while restoring the exercise'
    });
  }
});

module.exports = router;

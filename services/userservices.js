// services/userservices.js - Enhanced with better error handling, validation and RBAC
const logger = require('../config/logger');
const bcrypt = require('bcryptjs');

class UserService {

  /**
   * Create a new user with validation
   * @param {Object} userData - User data
   * @param {string} createdBy - ID of user creating this user
   * @returns {Object} - Service response with created user
   */
  static async createUser(userData, createdBy = null) {
    try {
      const { User, Exercise } = require('../models');

      // Enhanced validation
      const validationErrors = this._validateUserData(userData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check for duplicate email
      const existingUser = await User.findOne({
        where: { email: userData.email.toLowerCase().trim() }
      });

      if (existingUser) {
        throw new Error(`A user with email "${userData.email}" already exists`);
      }

      // Validate exercise_id if provided
      if (userData.exercise_id) {
        const exercise = await Exercise.findByPk(userData.exercise_id);
        if (!exercise) {
          throw new Error('Invalid exercise ID provided');
        }
        if (exercise.status !== 'active') {
          logger.warn('User assigned to inactive exercise', {
            exerciseId: userData.exercise_id,
            exerciseStatus: exercise.status,
            createdBy
          });
        }
      }

      const user = await User.create({
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        name: userData.name.trim(),
        exercise_id: userData.exercise_id || null,
        isActive: userData.isActive !== undefined ? userData.isActive : true
      });

      // Remove password from response
      const userResponse = user.toJSON();
      delete userResponse.password;

      logger.info('User created successfully', {
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        exerciseId: user.exercise_id,
        createdBy
      });

      return { success: true, data: userResponse };
    } catch (error) {
      logger.error('Error creating user', {
        error: error.message,
        stack: error.stack,
        userData: { 
          email: userData.email, 
          name: userData.name, 
          exercise_id: userData.exercise_id,
          createdBy 
        }
      });
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Get user by ID with related data
   * @param {string} id - User ID
   * @param {Object} options - Include options
   * @returns {Object} - Service response with user data
   */
  static async getUserById(id, options = {}) {
    try {
      const { User, Role, Exercise } = require('../models');
      const { includeRoles = true, includeExercise = true, includeDeleted = false } = options;

      if (!id || typeof id !== 'string') {
        throw new Error('Valid user ID is required');
      }

      const includeOptions = [];
      if (includeRoles) {
        includeOptions.push({
          model: Role,
          as: 'roles',
          through: { 
            attributes: ['assigned_at', 'isActive', 'expiresAt'],
            where: { isActive: true }
          },
          where: { isActive: true },
          required: false
        });
      }

      if (includeExercise) {
        includeOptions.push({
          model: Exercise,
          as: 'exercise',
          required: false
        });
      }

      const user = await User.findByPk(id, {
        include: includeOptions,
        attributes: { exclude: ['password'] },
        paranoid: !includeDeleted
      });

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('User retrieved successfully', {
        userId: id,
        userEmail: user.email,
        includeRoles,
        includeExercise
      });

      return { success: true, data: user };
    } catch (error) {
      logger.error('Error retrieving user', {
        error: error.message,
        stack: error.stack,
        userId: id,
        options
      });
      throw new Error(`Failed to retrieve user: ${error.message}`);
    }
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Object} - Service response with user data
   */
  static async getUserByEmail(email) {
    try {
      const { User, Role, Exercise } = require('../models');

      if (!email || typeof email !== 'string') {
        throw new Error('Valid email is required');
      }

      const user = await User.findOne({
        where: { email: email.toLowerCase().trim() },
        include: [
          {
            model: Role,
            as: 'roles',
            through: { 
              attributes: ['assigned_at', 'isActive', 'expiresAt'],
              where: { isActive: true }
            },
            where: { isActive: true },
            required: false
          },
          {
            model: Exercise,
            as: 'exercise',
            required: false
          }
        ],
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('User retrieved by email successfully', {
        userId: user.id,
        userEmail: user.email
      });

      return { success: true, data: user };
    } catch (error) {
      logger.error('Error retrieving user by email', {
        error: error.message,
        stack: error.stack,
        email
      });
      throw new Error(`Failed to retrieve user by email: ${error.message}`);
    }
  }

  /**
   * Get all users with pagination and filtering
   * @param {Object} options - Query options
   * @returns {Object} - Service response with users data
   */
  static async getAllUsers(options = {}) {
    try {
      const { User, Role, Exercise } = require('../models');
      const {
        page = 1,
        limit = 10,
        search = null,
        isActive = null,
        exerciseId = null,
        roleId = null,
        includeDeleted = false,
        orderBy = 'createdAt',
        orderDirection = 'DESC'
      } = options;

      const offset = (page - 1) * limit;
      const whereClause = {};

      // Apply filters
      if (isActive !== null) {
        whereClause.isActive = isActive;
      }

      if (exerciseId) {
        whereClause.exercise_id = exerciseId;
      }

      if (search) {
        whereClause[require('sequelize').Op.or] = [
          { name: { [require('sequelize').Op.iLike]: `%${search}%` } },
          { email: { [require('sequelize').Op.iLike]: `%${search}%` } }
        ];
      }

      const includeOptions = [
        {
          model: Role,
          as: 'roles',
          through: { 
            attributes: ['assigned_at', 'isActive', 'expiresAt'],
            where: { isActive: true }
          },
          where: { isActive: true },
          required: roleId ? true : false
        },
        {
          model: Exercise,
          as: 'exercise',
          required: false
        }
      ];

      // Filter by role if specified
      if (roleId) {
        includeOptions[0].where.id = roleId;
      }

      const result = await User.findAndCountAll({
        where: whereClause,
        include: includeOptions,
        attributes: { exclude: ['password'] },
        limit: parseInt(limit),
        offset: offset,
        order: [[orderBy, orderDirection]],
        paranoid: !includeDeleted,
        distinct: true
      });

      const totalPages = Math.ceil(result.count / limit);

      logger.info('Users retrieved successfully', {
        count: result.count,
        page,
        limit,
        totalPages,
        filters: { search, isActive, exerciseId, roleId, includeDeleted }
      });

      return {
        success: true,
        data: result.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: result.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: { search, isActive, exerciseId, roleId, includeDeleted }
      };
    } catch (error) {
      logger.error('Error retrieving users', {
        error: error.message,
        stack: error.stack,
        options
      });
      throw new Error(`Failed to retrieve users: ${error.message}`);
    }
  }

  /**
   * Update user with validation
   * @param {string} id - User ID
   * @param {Object} updateData - Update data
   * @param {string} updatedBy - ID of user making the update
   * @param {boolean} isAdmin - Whether the updater is admin
   * @returns {Object} - Service response with updated user
   */
  static async updateUser(id, updateData, updatedBy = null, isAdmin = false) {
    try {
      const { User, Exercise } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid user ID is required');
      }

      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate update data
      const validationErrors = this._validateUserData(updateData, true);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      const processedData = { ...updateData };

      // Prevent non-admin users from updating certain fields
      if (!isAdmin) {
        const restrictedFields = ['isActive', 'exercise_id', 'failedLoginAttempts', 'lockedUntil'];
        restrictedFields.forEach(field => {
          if (processedData.hasOwnProperty(field)) {
            delete processedData[field];
            logger.warn('Non-admin user attempted to update restricted field', {
              userId: id,
              updatedBy,
              restrictedField: field
            });
          }
        });
      }

      // Check for duplicate email if email is being updated
      if (processedData.email && processedData.email.toLowerCase().trim() !== user.email) {
        const existingUser = await User.findOne({
          where: { 
            email: processedData.email.toLowerCase().trim(),
            id: { [require('sequelize').Op.ne]: id }
          }
        });

        if (existingUser) {
          throw new Error(`A user with email "${processedData.email}" already exists`);
        }
        processedData.email = processedData.email.toLowerCase().trim();
      }

      // Validate exercise_id if provided
      if (processedData.exercise_id) {
        const exercise = await Exercise.findByPk(processedData.exercise_id);
        if (!exercise) {
          throw new Error('Invalid exercise ID provided');
        }
      }

      // Process name
      if (processedData.name) {
        processedData.name = processedData.name.trim();
      }

      // Password will be hashed by model hook if provided

      await user.update(processedData);

      // Get updated user without password
      const updatedUser = await User.findByPk(id, {
        attributes: { exclude: ['password'] }
      });

      logger.info('User updated successfully', {
        userId: id,
        userEmail: user.email,
        updatedFields: Object.keys(processedData),
        updatedBy,
        isAdmin
      });

      return { success: true, data: updatedUser };
    } catch (error) {
      logger.error('Error updating user', {
        error: error.message,
        stack: error.stack,
        userId: id,
        updateData: { ...updateData, password: updateData.password ? '[HIDDEN]' : undefined },
        updatedBy,
        isAdmin
      });
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Activate a user
   * @param {string} id - User ID
   * @param {string} activatedBy - ID of user activating
   * @returns {Object} - Service response
   */
  static async activateUser(id, activatedBy = null) {
    try {
      const { User } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid user ID is required');
      }

      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.isActive) {
        logger.info('User already active', {
          userId: id,
          userEmail: user.email
        });
        return { success: true, data: user, message: 'User is already active' };
      }

      await user.update({ 
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null
      });

      logger.info('User activated successfully', {
        userId: id,
        userEmail: user.email,
        activatedBy
      });

      return { success: true, data: user };
    } catch (error) {
      logger.error('Error activating user', {
        error: error.message,
        stack: error.stack,
        userId: id,
        activatedBy
      });
      throw new Error(`Failed to activate user: ${error.message}`);
    }
  }

  /**
   * Deactivate a user
   * @param {string} id - User ID
   * @param {string} deactivatedBy - ID of user deactivating
   * @returns {Object} - Service response
   */
  static async deactivateUser(id, deactivatedBy = null) {
    try {
      const { User } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid user ID is required');
      }

      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        logger.info('User already inactive', {
          userId: id,
          userEmail: user.email
        });
        return { success: true, data: user, message: 'User is already inactive' };
      }

      await user.update({ isActive: false });

      logger.info('User deactivated successfully', {
        userId: id,
        userEmail: user.email,
        deactivatedBy
      });

      return { success: true, data: user };
    } catch (error) {
      logger.error('Error deactivating user', {
        error: error.message,
        stack: error.stack,
        userId: id,
        deactivatedBy
      });
      throw new Error(`Failed to deactivate user: ${error.message}`);
    }
  }

  /**
   * Change user password with validation
   * @param {string} id - User ID
   * @param {string} newPassword - New password
   * @param {string} changedBy - ID of user changing password
   * @returns {Object} - Service response
   */
  static async changePassword(id, newPassword, changedBy = null) {
    try {
      const { User } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid user ID is required');
      }

      if (!newPassword || typeof newPassword !== 'string') {
        throw new Error('Valid new password is required');
      }

      if (newPassword.length < 6 || newPassword.length > 128) {
        throw new Error('Password must be between 6 and 128 characters');
      }

      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('User not found');
      }

      await user.update({ 
        password: newPassword,
        failedLoginAttempts: 0,
        lockedUntil: null
      });

      logger.info('User password changed successfully', {
        userId: id,
        userEmail: user.email,
        changedBy
      });

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Error changing user password', {
        error: error.message,
        stack: error.stack,
        userId: id,
        changedBy
      });
      throw new Error(`Failed to change password: ${error.message}`);
    }
  }

  /**
   * Delete user (soft or permanent)
   * @param {string} id - User ID
   * @param {boolean} permanent - Whether to permanently delete
   * @param {string} deletedBy - ID of user deleting
   * @returns {Object} - Service response
   */
  static async deleteUser(id, permanent = false, deletedBy = null) {
    try {
      const { User, UserRole } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid user ID is required');
      }

      const user = await User.findByPk(id, { paranoid: false });
      if (!user) {
        throw new Error('User not found');
      }

      if (permanent) {
        // Remove all role assignments first
        await UserRole.destroy({
          where: { user_id: id }
        });

        await user.destroy({ force: true });
        
        logger.warn('User permanently deleted', {
          userId: id,
          userEmail: user.email,
          deletedBy
        });

        return { success: true, message: 'User permanently deleted' };
      } else {
        await user.destroy(); // Soft delete
        
        logger.info('User soft deleted', {
          userId: id,
          userEmail: user.email,
          deletedBy
        });

        return { success: true, message: 'User soft deleted' };
      }
    } catch (error) {
      logger.error('Error deleting user', {
        error: error.message,
        stack: error.stack,
        userId: id,
        permanent,
        deletedBy
      });
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Restore a soft-deleted user
   * @param {string} id - User ID
   * @param {string} restoredBy - ID of user restoring
   * @returns {Object} - Service response
   */
  static async restoreUser(id, restoredBy = null) {
    try {
      const { User } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid user ID is required');
      }

      const user = await User.findByPk(id, { paranoid: false });
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.deletedAt) {
        logger.info('User not deleted, no restoration needed', {
          userId: id,
          userEmail: user.email
        });
        return { success: true, data: user, message: 'User is not deleted' };
      }

      await user.restore();

      logger.info('User restored successfully', {
        userId: id,
        userEmail: user.email,
        restoredBy
      });

      return { success: true, data: user };
    } catch (error) {
      logger.error('Error restoring user', {
        error: error.message,
        stack: error.stack,
        userId: id,
        restoredBy
      });
      throw new Error(`Failed to restore user: ${error.message}`);
    }
  }

  /**
   * Get user statistics
   * @returns {Object} - Service response with statistics
   */
  static async getUserStatistics() {
    try {
      const { User, UserRole } = require('../models');

      const [totalUsers, activeUsers, inactiveUsers, deletedUsers, lockedUsers, usersWithRoles, usersInExercises] = await Promise.all([
        User.count({ paranoid: false }),
        User.count({ where: { isActive: true } }),
        User.count({ where: { isActive: false } }),
        User.count({ paranoid: false, where: { deletedAt: { [require('sequelize').Op.ne]: null } } }),
        User.count({ where: { lockedUntil: { [require('sequelize').Op.gt]: new Date() } } }),
        UserRole.count({ where: { isActive: true }, distinct: true, col: 'user_id' }),
        User.count({ where: { exercise_id: { [require('sequelize').Op.ne]: null } } })
      ]);

      const statistics = {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        deleted: deletedUsers,
        locked: lockedUsers,
        withRoles: usersWithRoles,
        inExercises: usersInExercises
      };

      logger.info('User statistics retrieved', statistics);

      return { success: true, data: statistics };
    } catch (error) {
      logger.error('Error getting user statistics', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }
  }

  /**
   * Search users by name or email
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Object} - Service response with search results
   */
  static async searchUsers(searchTerm, options = {}) {
    try {
      const { limit = 50, includeInactive = false } = options;

      if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
        throw new Error('Valid search term is required');
      }

      const searchOptions = {
        search: searchTerm.trim(),
        limit,
        isActive: includeInactive ? null : true,
        page: 1
      };

      return await this.getAllUsers(searchOptions);
    } catch (error) {
      logger.error('Error searching users', {
        error: error.message,
        stack: error.stack,
        searchTerm,
        options
      });
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }

  /**
   * Get users by exercise
   * @param {string} exerciseId - Exercise ID
   * @param {Object} options - Query options
   * @returns {Object} - Service response with users
   */
  static async getUsersByExercise(exerciseId, options = {}) {
    try {
      const { includeInactive = false, limit = 100 } = options;

      if (!exerciseId || typeof exerciseId !== 'string') {
        throw new Error('Valid exercise ID is required');
      }

      const queryOptions = {
        exerciseId,
        isActive: includeInactive ? null : true,
        limit,
        page: 1
      };

      return await this.getAllUsers(queryOptions);
    } catch (error) {
      logger.error('Error getting users by exercise', {
        error: error.message,
        stack: error.stack,
        exerciseId,
        options
      });
      throw new Error(`Failed to get users by exercise: ${error.message}`);
    }
  }

  /**
   * Validate user password
   * @param {string} id - User ID
   * @param {string} password - Password to validate
   * @returns {Object} - Service response with validation result
   */
  static async validateUserPassword(id, password) {
    try {
      const { User } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid user ID is required');
      }

      if (!password || typeof password !== 'string') {
        throw new Error('Valid password is required');
      }

      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('User not found');
      }

      const isValid = await bcrypt.compare(password, user.password);

      logger.info('Password validation completed', {
        userId: id,
        userEmail: user.email,
        isValid
      });

      return { success: true, isValid };
    } catch (error) {
      logger.error('Error validating user password', {
        error: error.message,
        stack: error.stack,
        userId: id
      });
      throw new Error(`Failed to validate password: ${error.message}`);
    }
  }

  /**
   * Lock user account
   * @param {string} id - User ID
   * @param {number} lockDurationMinutes - Lock duration in minutes
   * @param {string} lockedBy - ID of user locking the account
   * @returns {Object} - Service response
   */
  static async lockUser(id, lockDurationMinutes = 30, lockedBy = null) {
    try {
      const { User } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid user ID is required');
      }

      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('User not found');
      }

      const lockUntil = new Date(Date.now() + (lockDurationMinutes * 60 * 1000));

      await user.update({ 
        lockedUntil: lockUntil,
        failedLoginAttempts: 5 // Set to max to indicate locked status
      });

      logger.warn('User account locked', {
        userId: id,
        userEmail: user.email,
        lockDurationMinutes,
        lockUntil: lockUntil.toISOString(),
        lockedBy
      });

      return { success: true, data: user, lockedUntil: lockUntil };
    } catch (error) {
      logger.error('Error locking user account', {
        error: error.message,
        stack: error.stack,
        userId: id,
        lockDurationMinutes,
        lockedBy
      });
      throw new Error(`Failed to lock user account: ${error.message}`);
    }
  }

  /**
   * Unlock user account
   * @param {string} id - User ID
   * @param {string} unlockedBy - ID of user unlocking the account
   * @returns {Object} - Service response
   */
  static async unlockUser(id, unlockedBy = null) {
    try {
      const { User } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid user ID is required');
      }

      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('User not found');
      }

      await user.update({ 
        lockedUntil: null,
        failedLoginAttempts: 0
      });

      logger.info('User account unlocked', {
        userId: id,
        userEmail: user.email,
        unlockedBy
      });

      return { success: true, data: user };
    } catch (error) {
      logger.error('Error unlocking user account', {
        error: error.message,
        stack: error.stack,
        userId: id,
        unlockedBy
      });
      throw new Error(`Failed to unlock user account: ${error.message}`);
    }
  }

  /**
   * Private method to validate user data
   * @param {Object} data - User data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Array} - Array of validation errors
   */
  static _validateUserData(data, isUpdate = false) {
    const errors = [];

    // Email validation
    if (!isUpdate && (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0)) {
      errors.push('Email is required');
    }

    if (data.email && (typeof data.email !== 'string' || !this._isValidEmail(data.email.trim()))) {
      errors.push('Invalid email format');
    }

    // Password validation
    if (!isUpdate && (!data.password || typeof data.password !== 'string')) {
      errors.push('Password is required');
    }

    if (data.password && (typeof data.password !== 'string' || data.password.length < 6 || data.password.length > 128)) {
      errors.push('Password must be between 6 and 128 characters');
    }

    // Name validation
    if (!isUpdate && (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0)) {
      errors.push('Name is required');
    }

    if (data.name && (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.trim().length > 100)) {
      errors.push('Name must be between 2 and 100 characters');
    }

    // Exercise ID validation
    if (data.exercise_id && typeof data.exercise_id !== 'string') {
      errors.push('Exercise ID must be a valid UUID string');
    }

    // isActive validation
    if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
      errors.push('isActive must be a boolean');
    }

    return errors;
  }

  /**
   * Private method to validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} - Whether email is valid
   */
  static _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = UserService;
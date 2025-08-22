// services/RoleServices.js - Enhanced with better error handling and validation
const logger = require('../config/logger');

class RoleService {

  /**
   * Get all active roles with optional filtering
   * @param {Object} options - Filter options
   * @returns {Object} - Service response with roles data
   */
  static async getAllActiveRoles(options = {}) {
    try {
      const { Role, User, Task } = require('../models');
      const { 
        includeUsers = false,
        includeTasks = false,
        includeInactive = false,
        orderBy = 'name',
        orderDirection = 'ASC'
      } = options;

      const whereClause = {};
      if (!includeInactive) {
        whereClause.isActive = true;
      }

      const includeOptions = [];
      if (includeUsers) {
        includeOptions.push({
          model: User,
          as: 'users',
          through: { attributes: [] },
          attributes: { exclude: ['password'] }
        });
      }

      if (includeTasks) {
        includeOptions.push({
          model: Task,
          as: 'tasks',
          through: { attributes: [] }
        });
      }

      const roles = await Role.findAll({
        where: whereClause,
        include: includeOptions,
        order: [[orderBy, orderDirection]]
      });

      logger.info('Active roles retrieved successfully', {
        count: roles.length,
        includeUsers,
        includeTasks,
        includeInactive
      });

      return { 
        success: true, 
        data: roles,
        count: roles.length,
        filters: { includeUsers, includeTasks, includeInactive }
      };
    } catch (error) {
      logger.error('Error retrieving active roles', {
        error: error.message,
        stack: error.stack,
        options
      });
      throw new Error(`Failed to retrieve active roles: ${error.message}`);
    }
  }

  /**
   * Create a new role with validation
   * @param {Object} roleData - Role data
   * @param {string} createdBy - ID of user creating the role
   * @returns {Object} - Service response with created role
   */
  static async createRole(roleData, createdBy = null) {
    try {
      const { Role } = require('../models');

      // Enhanced validation
      const validationErrors = this._validateRoleData(roleData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check for duplicate role names
      const existingRole = await Role.findOne({
        where: { name: roleData.name.trim().toLowerCase() }
      });

      if (existingRole) {
        throw new Error(`A role with name "${roleData.name}" already exists`);
      }

      // Validate reserved role names
      const reservedNames = ['super_admin', 'admin', 'system', 'root'];
      if (reservedNames.includes(roleData.name.trim().toLowerCase())) {
        logger.warn('Attempt to create role with reserved name', {
          roleName: roleData.name,
          createdBy
        });
        throw new Error(`Role name "${roleData.name}" is reserved and cannot be used`);
      }

      const role = await Role.create({
        name: roleData.name.trim().toLowerCase(),
        description: roleData.description ? roleData.description.trim() : null,
        isActive: roleData.isActive !== undefined ? roleData.isActive : true
      });

      logger.info('Role created successfully', {
        roleId: role.id,
        roleName: role.name,
        isActive: role.isActive,
        createdBy
      });

      return { success: true, data: role };
    } catch (error) {
      logger.error('Error creating role', {
        error: error.message,
        stack: error.stack,
        roleData: { ...roleData, createdBy }
      });
      throw new Error(`Failed to create role: ${error.message}`);
    }
  }

  /**
   * Get role by ID with related data
   * @param {string} id - Role ID
   * @param {Object} options - Include options
   * @returns {Object} - Service response with role data
   */
  static async getRoleById(id, options = {}) {
    try {
      const { Role, User, Task } = require('../models');
      const { includeUsers = true, includeTasks = true, includeDeleted = false } = options;

      if (!id || typeof id !== 'string') {
        throw new Error('Valid role ID is required');
      }

      const includeOptions = [];
      if (includeUsers) {
        includeOptions.push({
          model: User,
          as: 'users',
          through: { attributes: [] },
          attributes: { exclude: ['password'] }
        });
      }

      if (includeTasks) {
        includeOptions.push({
          model: Task,
          as: 'tasks',
          through: { attributes: [] }
        });
      }

      const role = await Role.findByPk(id, {
        include: includeOptions,
        paranoid: !includeDeleted
      });

      if (!role) {
        throw new Error('Role not found');
      }

      logger.info('Role retrieved successfully', {
        roleId: id,
        roleName: role.name,
        includeUsers,
        includeTasks
      });

      return { success: true, data: role };
    } catch (error) {
      logger.error('Error retrieving role', {
        error: error.message,
        stack: error.stack,
        roleId: id,
        options
      });
      throw new Error(`Failed to retrieve role: ${error.message}`);
    }
  }

  /**
   * Get role by name
   * @param {string} name - Role name
   * @returns {Object} - Service response with role data
   */
  static async getRoleByName(name) {
    try {
      const { Role } = require('../models');

      if (!name || typeof name !== 'string') {
        throw new Error('Valid role name is required');
      }

      const role = await Role.findOne({
        where: { 
          name: name.trim().toLowerCase(),
          isActive: true 
        }
      });

      if (!role) {
        throw new Error('Role not found');
      }

      logger.info('Role retrieved by name successfully', {
        roleId: role.id,
        roleName: role.name
      });

      return { success: true, data: role };
    } catch (error) {
      logger.error('Error retrieving role by name', {
        error: error.message,
        stack: error.stack,
        roleName: name
      });
      throw new Error(`Failed to retrieve role by name: ${error.message}`);
    }
  }

  /**
   * Update role with validation
   * @param {string} id - Role ID
   * @param {Object} updateData - Update data
   * @param {string} updatedBy - ID of user updating the role
   * @returns {Object} - Service response with updated role
   */
  static async updateRole(id, updateData, updatedBy = null) {
    try {
      const { Role } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid role ID is required');
      }

      const role = await Role.findByPk(id);
      if (!role) {
        throw new Error('Role not found');
      }

      // Validate update data
      const validationErrors = this._validateRoleData(updateData, true);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      const processedData = { ...updateData };

      // Check for duplicate names if name is being updated
      if (processedData.name && processedData.name.trim().toLowerCase() !== role.name.toLowerCase()) {
        const existingRole = await Role.findOne({
          where: { 
            name: processedData.name.trim().toLowerCase(),
            id: { [require('sequelize').Op.ne]: id }
          }
        });

        if (existingRole) {
          throw new Error(`A role with name "${processedData.name}" already exists`);
        }

        // Check reserved names
        const reservedNames = ['super_admin', 'admin', 'system', 'root'];
        if (reservedNames.includes(processedData.name.trim().toLowerCase())) {
          throw new Error(`Role name "${processedData.name}" is reserved and cannot be used`);
        }

        processedData.name = processedData.name.trim().toLowerCase();
      }

      if (processedData.description !== undefined) {
        processedData.description = processedData.description ? processedData.description.trim() : null;
      }

      await role.update(processedData);

      logger.info('Role updated successfully', {
        roleId: id,
        roleName: role.name,
        updatedFields: Object.keys(processedData),
        updatedBy
      });

      return { success: true, data: role };
    } catch (error) {
      logger.error('Error updating role', {
        error: error.message,
        stack: error.stack,
        roleId: id,
        updateData,
        updatedBy
      });
      throw new Error(`Failed to update role: ${error.message}`);
    }
  }

  /**
   * Activate a role
   * @param {string} id - Role ID
   * @param {string} activatedBy - ID of user activating the role
   * @returns {Object} - Service response
   */
  static async activateRole(id, activatedBy = null) {
    try {
      const { Role } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid role ID is required');
      }

      const role = await Role.findByPk(id);
      if (!role) {
        throw new Error('Role not found');
      }

      if (role.isActive) {
        logger.info('Role already active', {
          roleId: id,
          roleName: role.name
        });
        return { success: true, data: role, message: 'Role is already active' };
      }

      await role.update({ isActive: true });

      logger.info('Role activated successfully', {
        roleId: id,
        roleName: role.name,
        activatedBy
      });

      return { success: true, data: role };
    } catch (error) {
      logger.error('Error activating role', {
        error: error.message,
        stack: error.stack,
        roleId: id,
        activatedBy
      });
      throw new Error(`Failed to activate role: ${error.message}`);
    }
  }

  /**
   * Deactivate a role
   * @param {string} id - Role ID
   * @param {string} deactivatedBy - ID of user deactivating the role
   * @returns {Object} - Service response
   */
  static async deactivateRole(id, deactivatedBy = null) {
    try {
      const { Role } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid role ID is required');
      }

      const role = await Role.findByPk(id);
      if (!role) {
        throw new Error('Role not found');
      }

      if (!role.isActive) {
        logger.info('Role already inactive', {
          roleId: id,
          roleName: role.name
        });
        return { success: true, data: role, message: 'Role is already inactive' };
      }

      // Check if this is a system role that shouldn't be deactivated
      const protectedRoles = ['super_admin', 'admin'];
      if (protectedRoles.includes(role.name.toLowerCase())) {
        throw new Error(`Cannot deactivate protected system role: ${role.name}`);
      }

      await role.update({ isActive: false });

      logger.info('Role deactivated successfully', {
        roleId: id,
        roleName: role.name,
        deactivatedBy
      });

      return { success: true, data: role };
    } catch (error) {
      logger.error('Error deactivating role', {
        error: error.message,
        stack: error.stack,
        roleId: id,
        deactivatedBy
      });
      throw new Error(`Failed to deactivate role: ${error.message}`);
    }
  }

  /**
   * Delete role (soft or permanent)
   * @param {string} id - Role ID
   * @param {boolean} permanent - Whether to permanently delete
   * @param {string} deletedBy - ID of user deleting the role
   * @returns {Object} - Service response
   */
  static async deleteRole(id, permanent = false, deletedBy = null) {
    try {
      const { Role, UserRole } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid role ID is required');
      }

      const role = await Role.findByPk(id, { paranoid: false });
      if (!role) {
        throw new Error('Role not found');
      }

      // Check if this is a system role that shouldn't be deleted
      const protectedRoles = ['super_admin', 'admin'];
      if (protectedRoles.includes(role.name.toLowerCase())) {
        throw new Error(`Cannot delete protected system role: ${role.name}`);
      }

      // Check for assigned users
      const userCount = await UserRole.count({
        where: { role_id: id, isActive: true }
      });

      if (userCount > 0) {
        if (permanent) {
          throw new Error('Cannot permanently delete role with assigned users. Remove users first or use soft delete.');
        } else {
          logger.warn('Soft deleting role with assigned users', {
            roleId: id,
            roleName: role.name,
            userCount,
            deletedBy
          });
        }
      }

      if (permanent) {
        // Remove all user assignments first
        await UserRole.destroy({
          where: { role_id: id }
        });
        
        await role.destroy({ force: true });
        
        logger.warn('Role permanently deleted', {
          roleId: id,
          roleName: role.name,
          deletedBy
        });

        return { success: true, message: 'Role permanently deleted' };
      } else {
        await role.destroy(); // Soft delete
        
        logger.info('Role soft deleted', {
          roleId: id,
          roleName: role.name,
          deletedBy
        });

        return { success: true, message: 'Role soft deleted' };
      }
    } catch (error) {
      logger.error('Error deleting role', {
        error: error.message,
        stack: error.stack,
        roleId: id,
        permanent,
        deletedBy
      });
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  }

  /**
   * Restore a soft-deleted role
   * @param {string} id - Role ID
   * @param {string} restoredBy - ID of user restoring the role
   * @returns {Object} - Service response
   */
  static async restoreRole(id, restoredBy = null) {
    try {
      const { Role } = require('../models');

      if (!id || typeof id !== 'string') {
        throw new Error('Valid role ID is required');
      }

      const role = await Role.findByPk(id, { paranoid: false });
      if (!role) {
        throw new Error('Role not found');
      }

      if (!role.deletedAt) {
        logger.info('Role not deleted, no restoration needed', {
          roleId: id,
          roleName: role.name
        });
        return { success: true, data: role, message: 'Role is not deleted' };
      }

      await role.restore();

      logger.info('Role restored successfully', {
        roleId: id,
        roleName: role.name,
        restoredBy
      });

      return { success: true, data: role };
    } catch (error) {
      logger.error('Error restoring role', {
        error: error.message,
        stack: error.stack,
        roleId: id,
        restoredBy
      });
      throw new Error(`Failed to restore role: ${error.message}`);
    }
  }

  /**
   * Get all roles (including inactive)
   * @param {Object} options - Filter options
   * @returns {Object} - Service response with all roles
   */
  static async getAllRoles(options = {}) {
    try {
      return await this.getAllActiveRoles({ ...options, includeInactive: true });
    } catch (error) {
      logger.error('Error getting all roles', {
        error: error.message,
        stack: error.stack,
        options
      });
      throw new Error(`Failed to get all roles: ${error.message}`);
    }
  }

  /**
   * Get role statistics
   * @returns {Object} - Service response with statistics
   */
  static async getRoleStatistics() {
    try {
      const { Role, UserRole } = require('../models');

      const [totalRoles, activeRoles, inactiveRoles, deletedRoles, totalAssignments] = await Promise.all([
        Role.count({ paranoid: false }),
        Role.count({ where: { isActive: true } }),
        Role.count({ where: { isActive: false } }),
        Role.count({ paranoid: false, where: { deletedAt: { [require('sequelize').Op.ne]: null } } }),
        UserRole.count({ where: { isActive: true } })
      ]);

      const statistics = {
        total: totalRoles,
        active: activeRoles,
        inactive: inactiveRoles,
        deleted: deletedRoles,
        totalAssignments: totalAssignments
      };

      logger.info('Role statistics retrieved', statistics);

      return { success: true, data: statistics };
    } catch (error) {
      logger.error('Error getting role statistics', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to get role statistics: ${error.message}`);
    }
  }

  /**
   * Private method to validate role data
   * @param {Object} data - Role data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Array} - Array of validation errors
   */
  static _validateRoleData(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate && (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0)) {
      errors.push('Role name is required');
    }

    if (data.name && (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.trim().length > 50)) {
      errors.push('Role name must be between 2 and 50 characters');
    }

    if (data.name && !/^[a-zA-Z0-9_-]+$/.test(data.name.trim())) {
      errors.push('Role name can only contain letters, numbers, underscores, and hyphens');
    }

    if (data.description && typeof data.description !== 'string') {
      errors.push('Role description must be a string');
    }

    if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
      errors.push('isActive must be a boolean');
    }

    return errors;
  }
}

module.exports = RoleService;
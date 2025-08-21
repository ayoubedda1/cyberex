const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserRole = sequelize.define('UserRole', {
    user_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    role_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      }
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'user_roles',
    timestamps: true
  });

  // ============ CRUD METHODS ============

  // CREATE Methods
  UserRole.assignRole = async function(userId, roleId, options = {}) {
    try {
      const { assignedBy = null, expiresAt = null, notes = null } = options;

      // Check if user exists and is active
      const user = await sequelize.models.User.findOne({
        where: { id: userId, isActive: true }
      });
      if (!user) {
        throw new Error('User not found or inactive');
      }

      // Check if role exists and is active
      const role = await sequelize.models.Role.findOne({
        where: { id: roleId, isActive: true }
      });
      if (!role) {
        throw new Error('Role not found or inactive');
      }

      // Check if assignment already exists
      const existing = await this.findOne({
        where: { user_id: userId, role_id: roleId }
      });
      if (existing) {
        if (existing.isActive) {
          throw new Error('User already has this role');
        } else {
          // Reactivate existing assignment
          return await existing.update({
            isActive: true,
            assigned_at: new Date(),
            assignedBy,
            expiresAt,
            notes
          });
        }
      }

      return await this.create({
        user_id: userId,
        role_id: roleId,
        assigned_at: new Date(),
        assignedBy,
        expiresAt,
        notes,
        isActive: true
      });
    } catch (error) {
      throw new Error(`Failed to assign role: ${error.message}`);
    }
  };

  UserRole.assignRoleToUsers = async function(userIds, roleId, options = {}) {
    try {
      const { assignedBy = null, expiresAt = null, notes = null } = options;

      // Check if role exists and is active
      const role = await sequelize.models.Role.findOne({
        where: { id: roleId, isActive: true }
      });
      if (!role) {
        throw new Error('Role not found or inactive');
      }

      // Check if users exist and are active
      const users = await sequelize.models.User.findAll({
        where: { id: userIds, isActive: true }
      });
      if (users.length !== userIds.length) {
        throw new Error('One or more users not found or inactive');
      }

      // Get existing assignments
      const existing = await this.findAll({
        where: { user_id: userIds, role_id: roleId }
      });
      const existingUserIds = existing.filter(ur => ur.isActive).map(ur => ur.user_id);

      // Filter out users who already have this role active
      const newUserIds = userIds.filter(userId => !existingUserIds.includes(userId));

      if (newUserIds.length === 0) {
        throw new Error('All specified users already have this role');
      }

      const assignments = newUserIds.map(userId => ({
        user_id: userId,
        role_id: roleId,
        assigned_at: new Date(),
        assignedBy,
        expiresAt,
        notes,
        isActive: true
      }));

      return await this.bulkCreate(assignments);
    } catch (error) {
      throw new Error(`Failed to assign role to users: ${error.message}`);
    }
  };

  // READ Methods
  UserRole.findByUser = function(userId, includeInactive = false) {
    const whereClause = { user_id: userId };
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: sequelize.models.Role,
          as: 'role',
          where: { isActive: true }
        }
      ],
      order: [['assigned_at', 'DESC']]
    });
  };

  UserRole.findByRole = function(roleId, includeInactive = false) {
    const whereClause = { role_id: roleId };
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          where: { isActive: true },
          attributes: { exclude: ['password'] }
        }
      ],
      order: [['assigned_at', 'DESC']]
    });
  };

  UserRole.findUsersWithRole = function(roleName, includeInactive = false) {
    const whereClause = { isActive: true };
    if (includeInactive) {
      delete whereClause.isActive;
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          where: { isActive: true },
          attributes: { exclude: ['password'] }
        },
        {
          model: sequelize.models.Role,
          as: 'role',
          where: { name: roleName, isActive: true }
        }
      ],
      order: [['assigned_at', 'DESC']]
    });
  };

  // UPDATE Methods
  UserRole.updateAssignment = async function(userId, roleId, updateData) {
    try {
      const assignment = await this.findOne({
        where: { user_id: userId, role_id: roleId }
      });

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      await assignment.update(updateData);
      return assignment;
    } catch (error) {
      throw new Error(`Failed to update assignment: ${error.message}`);
    }
  };

  // DELETE Methods
  UserRole.revokeRole = async function(userId, roleId) {
    try {
      const updated = await this.update(
        { isActive: false },
        {
          where: {
            user_id: userId,
            role_id: roleId,
            isActive: true
          }
        }
      );

      if (updated[0] === 0) {
        throw new Error('Assignment not found or already revoked');
      }

      return { message: 'Role revoked successfully' };
    } catch (error) {
      throw new Error(`Failed to revoke role: ${error.message}`);
    }
  };

  return UserRole;
};
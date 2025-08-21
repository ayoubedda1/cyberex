const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 50]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
  
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    tableName: 'roles',
    timestamps: true,
    paranoid: true
  });

  // ============ CRUD METHODS ============

  // CREATE Methods
  Role.createRole = async function(roleData) {
    try {
      return await this.create({
        name: roleData.name.trim(),
        description: roleData.description ? roleData.description.trim() : null,
        permissions: roleData.permissions || [],
        isActive: roleData.isActive !== undefined ? roleData.isActive : true
      });
    } catch (error) {
      throw new Error(`Failed to create role: ${error.message}`);
    }
  };

  // READ Methods
  Role.findByName = function(name) {
    return this.findOne({ 
      where: { 
        name: name.trim(),
        isActive: true 
      } 
    });
  };

  Role.findById = function(id) {
    return this.findByPk(id, {
      include: [
        {
          model: sequelize.models.User,
          as: 'users',
          through: { attributes: [] },
          attributes: { exclude: ['password'] }
        },
        {
          model: sequelize.models.Task,
          as: 'tasks',
          through: { attributes: [] }
        }
      ]
    });
  };
  
  // UPDATE Methods
  Role.updateRole = async function(id, updateData) {
    try {
      const role = await this.findByPk(id);
      if (!role) {
        throw new Error('Role not found');
      }

      const processedData = { ...updateData };
      if (processedData.name) {
        processedData.name = processedData.name.trim();
      }
      if (processedData.description !== undefined) {
        processedData.description = processedData.description ? processedData.description.trim() : null;
      }

      await role.update(processedData);
      return role;
    } catch (error) {
      throw new Error(`Failed to update role: ${error.message}`);
    }
  };

  Role.activateRole = async function(id) {
    return await this.updateRole(id, { isActive: true });
  };

  Role.deactivateRole = async function(id) {
    return await this.updateRole(id, { isActive: false });
  };

  // DELETE Methods
  Role.deleteRole = async function(id, permanent = false) {
    try {
      const role = await this.findByPk(id);
      if (!role) {
        throw new Error('Role not found');
      }

      // Check if role has users assigned
      const userCount = await sequelize.models.UserRole.count({
        where: { role_id: id }
      });

      if (userCount > 0 && permanent) {
        throw new Error('Cannot permanently delete role with assigned users. Remove users first.');
      }

      if (permanent) {
        await role.destroy({ force: true });
        return { message: 'Role permanently deleted' };
      } else {
        await role.destroy(); // Soft delete
        return { message: 'Role soft deleted' };
      }
    } catch (error) {
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  };

  Role.restoreRole = async function(id) {
    try {
      const role = await this.findByPk(id, { paranoid: false });
      if (!role) {
        throw new Error('Role not found');
      }

      await role.restore();
      return role;
    } catch (error) {
      throw new Error(`Failed to restore role: ${error.message}`);
    }
  };

  return Role;
};
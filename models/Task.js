const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 2000]
      }
    }
  }, {
    tableName: 'tasks',
    timestamps: true,
    paranoid: true
  });

  // ============ CRUD METHODS ============

  // CREATE Methods
  Task.createTask = async function(taskData) {
    try {
      return await this.create({
        title: taskData.title.trim(),
        description: taskData.description.trim()
      });
    } catch (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }
  };

  // READ Methods
  Task.findById = function(id) {
    return this.findByPk(id, {
      include: [
        {
          model: sequelize.models.Role,
          as: 'roles',
          through: { attributes: [] }
        }
      ]
    });
  };

  Task.findByTitle = function(title) {
    return this.findOne({
      where: { title: { [Op.iLike]: title } }
    });
  };

  Task.searchByTitle = function(searchTerm) {
    return this.findAll({
      where: {
        title: { [Op.iLike]: `%${searchTerm}%` }
      },
      order: [['title', 'ASC']]
    });
  };


  // UPDATE Methods
  Task.updateTask = async function(id, updateData) {
    try {
      const task = await this.findByPk(id);
      if (!task) {
        throw new Error('Task not found');
      }

      const processedData = { ...updateData };
      if (processedData.title) {
        processedData.title = processedData.title.trim();
      }
      if (processedData.description) {
        processedData.description = processedData.description.trim();
      }

      await task.update(processedData);
      return task;
    } catch (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
  };

  // DELETE Methods
  Task.deleteTask = async function(id, permanent = false) {
    try {
      const task = await this.findByPk(id);
      if (!task) {
        throw new Error('Task not found');
      }

      // Check if task has roles assigned
      const roleCount = await sequelize.models.RoleTask.count({
        where: { task_id: id }
      });

      if (roleCount > 0 && permanent) {
        throw new Error('Cannot permanently delete task with assigned roles. Remove roles first.');
      }

      if (permanent) {
        // Remove all role assignments first
        await sequelize.models.RoleTask.destroy({
          where: { task_id: id }
        });
        await task.destroy({ force: true });
        return { message: 'Task permanently deleted' };
      } else {
        await task.destroy(); // Soft delete
        return { message: 'Task soft deleted' };
      }
    } catch (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  };

  Task.restoreTask = async function(id) {
    try {
      const task = await this.findByPk(id, { paranoid: false });
      if (!task) {
        throw new Error('Task not found');
      }

      await task.restore();
      return task;
    } catch (error) {
      throw new Error(`Failed to restore task: ${error.message}`);
    }
  };

  // ============ ROLE ASSIGNMENT METHODS ============

  Task.assignToRole = async function(taskId, roleId) {
    try {
      const task = await this.findByPk(taskId);
      const role = await sequelize.models.Role.findByPk(roleId);

      if (!task) throw new Error('Task not found');
      if (!role) throw new Error('Role not found');

      // Check if already assigned
      const existing = await sequelize.models.RoleTask.findOne({
        where: { task_id: taskId, role_id: roleId }
      });

      if (existing) {
        throw new Error('Task already assigned to this role');
      }

      await sequelize.models.RoleTask.create({
        task_id: taskId,
        role_id: roleId
      });

      return { message: 'Task assigned to role successfully' };
    } catch (error) {
      throw new Error(`Failed to assign task to role: ${error.message}`);
    }
  };

  Task.unassignFromRole = async function(taskId, roleId) {
    try {
      const deleted = await sequelize.models.RoleTask.destroy({
        where: { task_id: taskId, role_id: roleId }
      });

      if (deleted === 0) {
        throw new Error('Task not assigned to this role');
      }

      return { message: 'Task unassigned from role successfully' };
    } catch (error) {
      throw new Error(`Failed to unassign task from role: ${error.message}`);
    }
  };
  
  return Task;
};
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        len: [3, 255]
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 128]
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100],
        notEmpty: true
      }
    },
    exercise_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'exercises',
        key: 'id'
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Soft delete
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const saltRounds = 12;
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const saltRounds = 12;
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      }
    }
  });

  // ============ CRUD METHODS ============

  // CREATE Methods
  User.createUser = async function(userData) {
    try {
      return await this.create({
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        name: userData.name.trim(),
        exercise_id: userData.exercise_id || null,
        isActive: userData.isActive !== undefined ? userData.isActive : true
      });
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  };

  // READ Methods
  User.findByEmail = function(email) {
    return this.findOne({ 
      where: { 
        email: email.toLowerCase().trim() 
      } 
    });
  };

  User.findById = function(id) {
    return this.findByPk(id, {
      include: [
        {
          model: sequelize.models.Role,
          as: 'roles',
          through: { attributes: [] }
        },
        {
          model: sequelize.models.Exercise,
          as: 'exercise'
        }
      ]
    });
  };

  User.findAllUsers = function(options = {}) {
    const {
      page = 1,
      limit = 10,
      isActive = null,
      search = null,
      includeDeleted = false
    } = options;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (isActive !== null) {
      whereClause.isActive = isActive;
    }

    if (search) {
      whereClause[sequelize.Sequelize.Op.or] = [
        { name: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { email: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    return this.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: sequelize.models.Role,
          as: 'roles',
          through: { attributes: [] }
        },
        {
          model: sequelize.models.Exercise,
          as: 'exercise'
        }
      ],
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      paranoid: !includeDeleted
    });
  };

  // UPDATE Methods
  User.updateUser = async function(id, updateData) {
    try {
      const user = await this.findByPk(id);
      if (!user) {
        throw new Error('User not found');
      }

      // Process update data
      const processedData = { ...updateData };
      if (processedData.email) {
        processedData.email = processedData.email.toLowerCase().trim();
      }
      if (processedData.name) {
        processedData.name = processedData.name.trim();
      }

      await user.update(processedData);
      return user;
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  };

  User.activateUser = async function(id) {
    return await this.updateUser(id, { isActive: true });
  };

  User.deactivateUser = async function(id) {
    return await this.updateUser(id, { isActive: false });
  };

  User.changePassword = async function(id, newPassword) {
    try {
      const user = await this.findByPk(id);
      if (!user) {
        throw new Error('User not found');
      }

      await user.update({ password: newPassword });
      return user;
    } catch (error) {
      throw new Error(`Failed to change password: ${error.message}`);
    }
  };

  // DELETE Methods
  User.deleteUser = async function(id, permanent = false) {
    try {
      const user = await this.findByPk(id);
      if (!user) {
        throw new Error('User not found');
      }

      if (permanent) {
        await user.destroy({ force: true });
        return { message: 'User permanently deleted' };
      } else {
        await user.destroy(); // Soft delete
        return { message: 'User soft deleted' };
      }
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  };

  User.restoreUser = async function(id) {
    try {
      const user = await this.findByPk(id, { paranoid: false });
      if (!user) {
        throw new Error('User not found');
      }

      await user.restore();
      return user;
    } catch (error) {
      throw new Error(`Failed to restore user: ${error.message}`);
    }
  };


  // ============ UTILITY METHODS ============


  User.prototype.hasRole = function(roleName) {
    return this.roles && this.roles.some(role => role.name === roleName);
  };

  User.prototype.getRoleNames = function() {
    return this.roles ? this.roles.map(role => role.name) : [];
  };

  User.prototype.isLocked = function() {
    return this.lockedUntil && this.lockedUntil > new Date();
  };

  User.prototype.validatePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  User.prototype.incrementFailedAttempts = async function() {
    const maxAttempts = 5;
    const lockTime = 30 * 60 * 1000; // 30 minutes

    this.failedLoginAttempts += 1;

    if (this.failedLoginAttempts >= maxAttempts) {
      this.lockedUntil = new Date(Date.now() + lockTime);
    }

    await this.save();
  };

  User.prototype.resetFailedAttempts = async function() {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    this.lastLoginAt = new Date();
    await this.save();
  };

  return User;
};
const { DataTypes } = require('sequelize');

const RoleTask = (sequelize) => {
  const RoleTask = sequelize.define('RoleTask', {
    role_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      }
    },
    task_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'tasks',
        key: 'id'
      }
    }
  }, {
    tableName: 'role_tasks',
    timestamps: false
  });

  return RoleTask;
};

module.exports = RoleTask;

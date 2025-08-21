const { sequelize } = require('../config/database');

// Import and initialize all models
const User = require('./User')(sequelize);
const Role = require('./Role')(sequelize);
const Exercise = require('./Exercise')(sequelize);
const Task = require('./Task')(sequelize);
const UserRole = require('./UserRole')(sequelize);
const RoleTask = require('./RoleTask')(sequelize);

// Export all models first (before associations to avoid circular dependency issues)
const models = {
  sequelize,
  User,
  Role,
  Exercise,
  Task,
  UserRole,
  RoleTask
};

// Define associations after export

// User - Exercise (Many-to-One)
User.belongsTo(Exercise, {
  foreignKey: 'exercise_id',
  as: 'exercise'
});
Exercise.hasMany(User, {
  foreignKey: 'exercise_id',
  as: 'users'
});

// User - Role (Many-to-Many through UserRole)
// Utilisé dans routes/user.js: include: [{ model: Role, as: 'roles' }]
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'user_id',
  otherKey: 'role_id',
  as: 'roles'
});
Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'role_id',
  otherKey: 'user_id',
  as: 'users'
});

// Role - Task (Many-to-Many through RoleTask)
// Utilisé dans routes/task.js: include: [{ model: Role, as: 'roles' }]
Role.belongsToMany(Task, {
  through: RoleTask,
  foreignKey: 'role_id',
  otherKey: 'task_id',
  as: 'tasks'
});
Task.belongsToMany(Role, {
  through: RoleTask,
  foreignKey: 'task_id',
  otherKey: 'role_id',
  as: 'roles'
});

// Direct associations for junction tables
UserRole.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserRole.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

RoleTask.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
RoleTask.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });

module.exports = models;
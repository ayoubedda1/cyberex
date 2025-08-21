class UserRoleService {
  // Assigner un rôle à un utilisateur
  static async assignRole(userId, roleId, options = {}) {
    try {
      const { UserRole } = require('../models');
      // Vérifier si l'assignation existe déjà
      const existingAssignment = await UserRole.findOne({
        where: { user_id: userId, role_id: roleId }
      });

      if (existingAssignment) {
        throw new Error('Ce rôle est déjà assigné à cet utilisateur');
      }

      const assignment = await UserRole.create({
        user_id: userId,
        role_id: roleId,
        ...options
      });
      return { success: true, data: assignment };
    } catch (error) {
      throw new Error(`Erreur lors de l'assignation du rôle : ${error.message}`);
    }
  }

  // Assigner un rôle à plusieurs utilisateurs
  static async assignRoleToUsers(userIds, roleId, options = {}) {
    try {
      const assignments = await UserRole.assignRoleToUsers(userIds, roleId, options);
      return { success: true, data: assignments, count: assignments.length };
    } catch (error) {
      throw new Error(`Erreur lors de l'assignation du rôle aux utilisateurs : ${error.message}`);
    }
  }

  // Récupérer les rôles d'un utilisateur
  static async getUserRoles(userId, includeInactive = false) {
    try {
      const userRoles = await UserRole.findByUser(userId, includeInactive);
      return { success: true, data: userRoles, count: userRoles.length };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des rôles de l'utilisateur : ${error.message}`);
    }
  }

  // Récupérer les utilisateurs d'un rôle
  static async getRoleUsers(roleId, includeInactive = false) {
    try {
      const roleUsers = await UserRole.findByRole(roleId, includeInactive);
      return { success: true, data: roleUsers, count: roleUsers.length };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des utilisateurs du rôle : ${error.message}`);
    }
  }

  // Récupérer les utilisateurs ayant un rôle spécifique par nom
  static async getUsersWithRole(roleName, includeInactive = false) {
    try {
      const users = await UserRole.findUsersWithRole(roleName, includeInactive);
      return { success: true, data: users, count: users.length };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des utilisateurs avec le rôle : ${error.message}`);
    }
  }

  // Mettre à jour une assignation
  static async updateAssignment(userId, roleId, updateData) {
    try {
      const assignment = await UserRole.updateAssignment(userId, roleId, updateData);
      return { success: true, data: assignment };
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour de l'assignation : ${error.message}`);
    }
  }

  // Révoquer un rôle d'un utilisateur
  static async revokeRole(userId, roleId) {
    try {
      const result = await UserRole.revokeRole(userId, roleId);
      return { success: true, message: result.message };
    } catch (error) {
      throw new Error(`Erreur lors de la révocation du rôle : ${error.message}`);
    }
  }

  // Vérifier si un utilisateur a un rôle spécifique
  static async hasRole(userId, roleName) {
    try {
      const userRoles = await UserRole.findByUser(userId, false);
      const hasRole = userRoles.some(ur => ur.role && ur.role.name === roleName);
      return { success: true, hasRole };
    } catch (error) {
      throw new Error(`Erreur lors de la vérification du rôle : ${error.message}`);
    }
  }

  // Obtenir toutes les assignations avec filtres
  static async getAllAssignments(filters = {}) {
    try {
      const {
        userId = null,
        roleId = null,
        isActive = true,
        includeExpired = false,
        page = 1,
        limit = 10
      } = filters;

      const offset = (page - 1) * limit;
      const whereClause = {};

      if (userId) whereClause.user_id = userId;
      if (roleId) whereClause.role_id = roleId;
      if (isActive !== null) whereClause.isActive = isActive;

      if (!includeExpired) {
        whereClause[require('sequelize').Op.or] = [
          { expiresAt: null },
          { expiresAt: { [require('sequelize').Op.gt]: new Date() } }
        ];
      }

      const assignments = await UserRole.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: require('../models').User,
            as: 'user',
            attributes: { exclude: ['password'] }
          },
          {
            model: require('../models').Role,
            as: 'role'
          }
        ],
        limit,
        offset,
        order: [['assigned_at', 'DESC']]
      });

      return {
        success: true,
        data: assignments.rows,
        count: assignments.count,
        totalPages: Math.ceil(assignments.count / limit),
        currentPage: page
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des assignations : ${error.message}`);
    }
  }
}

module.exports = UserRoleService;
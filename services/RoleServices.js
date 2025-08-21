// Import models at module level
const models = require('../models');

class RoleService {
  // Récupérer tous les rôles actifs
  static async getAllActiveRoles() {
    try {
      const { Role } = models;
      const roles = await Role.findAll({
        where: { isActive: true },
        order: [['name', 'ASC']]
      });
      return { success: true, data: roles };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des rôles actifs : ${error.message}`);
    }
  }

  // Créer un rôle
  static async createRole(roleData) {
    try {
      const { Role } = models;
      // Validation des données
      if (!roleData.name) {
        throw new Error('Le nom du rôle est requis');
      }

      // Vérifier si le rôle existe déjà
      const existingRole = await Role.findOne({ where: { name: roleData.name } });
      if (existingRole) {
        throw new Error('Un rôle avec ce nom existe déjà');
      }

      const role = await Role.create(roleData);
      return { success: true, data: role };
    } catch (error) {
      throw new Error(`Erreur lors de la création du rôle : ${error.message}`);
    }
  }

  // Récupérer un rôle par ID
  static async getRoleById(id) {
    try {
      const { Role } = models;
      const role = await Role.findByPk(id);
      if (!role) {
        throw new Error('Rôle non trouvé');
      }
      return { success: true, data: role };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du rôle : ${error.message}`);
    }
  }

  // Récupérer un rôle par nom
  static async getRoleByName(name) {
    try {
      const { Role } = models;
      const role = await Role.findByName(name);
      if (!role) {
        throw new Error('Rôle non trouvé');
      }
      return { success: true, data: role };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du rôle : ${error.message}`);
    }
  }

  // Récupérer tous les rôles actifs
  static async getAllRoles() {
    try {
      const { Role } = models;
      const roles = await Role.findAll({
        where: { isActive: true },
        order: [['name', 'ASC']]
      });
      return { success: true, data: roles, count: roles.length };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des rôles : ${error.message}`);
    }
  }

  // Mettre à jour un rôle
  static async updateRole(id, updateData) {
    try {
      const { Role } = models;
      const role = await Role.updateRole(id, updateData);
      return { success: true, data: role };
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour du rôle : ${error.message}`);
    }
  }

  // Activer un rôle
  static async activateRole(id) {
    try {
      const { Role } = models;
      const role = await Role.activateRole(id);
      return { success: true, data: role };
    } catch (error) {
      throw new Error(`Erreur lors de l'activation du rôle : ${error.message}`);
    }
  }

  // Désactiver un rôle
  static async deactivateRole(id) {
    try {
      const { Role } = models;
      const role = await Role.deactivateRole(id);
      return { success: true, data: role };
    } catch (error) {
      throw new Error(`Erreur lors de la désactivation du rôle : ${error.message}`);
    }
  }

  // Supprimer un rôle (soft ou permanent)
  static async deleteRole(id, permanent = false) {
    try {
      const { Role } = require('../models');
      const result = await Role.deleteRole(id, permanent);
      return { success: true, message: result.message };
    } catch (error) {
      throw new Error(`Erreur lors de la suppression du rôle : ${error.message}`);
    }
  }

  // Restaurer un rôle supprimé
  static async restoreRole(id) {
    try {
      const { Role } = models;
      const role = await Role.restoreRole(id);
      return { success: true, data: role };
    } catch (error) {
      throw new Error(`Erreur lors de la restauration du rôle : ${error.message}`);
    }
  }
}

module.exports = RoleService;
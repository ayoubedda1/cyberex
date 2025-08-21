// Import models at module level
const models = require('../models');

class UserService {
  // Créer un utilisateur
  static async createUser(userData) {
    try {
      const { User } = models;
      // Validation des données
      if (!userData.email || !userData.password || !userData.name) {
        throw new Error('Email, mot de passe et nom sont requis');
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findOne({
        where: { email: userData.email }
      });
      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      // Hasher le mot de passe
      const bcrypt = require('bcryptjs');
      userData.password = await bcrypt.hash(userData.password, 10);

      const user = await User.create(userData);
      return { success: true, data: user };
    } catch (error) {
      throw new Error(`Erreur lors de la création de l'utilisateur : ${error.message}`);
    }
  }

  // Récupérer un utilisateur par ID
  static async getUserById(id) {
    try {
      const { User } = models;
      const user = await User.findById(id);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      return { success: true, data: user };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération de l'utilisateur : ${error.message}`);
    }
  }

  // Récupérer un utilisateur par email
  static async getUserByEmail(email) {
    try {
      const { User } = models;
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      return { success: true, data: user };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération de l'utilisateur : ${error.message}`);
    }
  }

  // Récupérer tous les utilisateurs avec pagination
  static async getAllUsers(options = {}) {
    try {
      const result = await User.findAllUsers(options);
      return { 
        success: true, 
        data: result.rows, 
        count: result.count,
        totalPages: Math.ceil(result.count / (options.limit || 10)),
        currentPage: options.page || 1
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des utilisateurs : ${error.message}`);
    }
  }

  // Mettre à jour un utilisateur
  static async updateUser(id, updateData) {
    try {
      const { User } = models;
      const user = await User.updateUser(id, updateData);
      return { success: true, data: user };
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour de l'utilisateur : ${error.message}`);
    }
  }

  // Activer un utilisateur
  static async activateUser(id) {
    try {
      const { User } = models;
      const user = await User.activateUser(id);
      return { success: true, data: user };
    } catch (error) {
      throw new Error(`Erreur lors de l'activation de l'utilisateur : ${error.message}`);
    }
  }

  // Désactiver un utilisateur
  static async deactivateUser(id) {
    try {
      const { User } = models;
      const user = await User.deactivateUser(id);
      return { success: true, data: user };
    } catch (error) {
      throw new Error(`Erreur lors de la désactivation de l'utilisateur : ${error.message}`);
    }
  }

  // Changer le mot de passe
  static async changePassword(id, newPassword) {
    try {
      const { User } = models;
      const user = await User.changePassword(id, newPassword);
      return { success: true, data: user };
    } catch (error) {
      throw new Error(`Erreur lors du changement de mot de passe : ${error.message}`);
    }
  }

  // Supprimer un utilisateur (soft ou permanent)
  static async deleteUser(id, permanent = false) {
    try {
      const result = await User.deleteUser(id, permanent);
      return { success: true, message: result.message };
    } catch (error) {
      throw new Error(`Erreur lors de la suppression de l'utilisateur : ${error.message}`);
    }
  }

  // Restaurer un utilisateur supprimé
  static async restoreUser(id) {
    try {
      const { User } = models;
      const user = await User.restoreUser(id);
      return { success: true, data: user };
    } catch (error) {
      throw new Error(`Erreur lors de la restauration de l'utilisateur : ${error.message}`);
    }
  }
}

module.exports = UserService;
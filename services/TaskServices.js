class TaskService {
  // Récupérer toutes les tâches
  static async getAllTasks() {
    try {
      const { Task, Role } = require('../models');
      const tasks = await Task.findAll({
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['id', 'name', 'description'],
          through: { attributes: [] }
        }],
        order: [['title', 'ASC']]
      });
      return { success: true, data: tasks };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des tâches : ${error.message}`);
    }
  }

  // Créer une tâche
  static async createTask(taskData) {
    try {
      const { Task } = require('../models');
      // Validation des données
      if (!taskData.title || !taskData.description) {
        throw new Error('Le titre et la description sont requis');
      }

      const task = await Task.create(taskData);
      return { success: true, data: task };
    } catch (error) {
      throw new Error(`Erreur lors de la création de la tâche : ${error.message}`);
    }
  }

  // Récupérer une tâche par ID
  static async getTaskById(id) {
    try {
      const { Task } = require('../models');
      const task = await Task.findById(id);
      if (!task) {
        throw new Error('Tâche non trouvée');
      }
      return { success: true, data: task };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération de la tâche : ${error.message}`);
    }
  }

  // Récupérer une tâche par titre
  static async getTaskByTitle(title) {
    try {
      const { Task } = require('../models');
      const task = await Task.findByTitle(title);
      if (!task) {
        throw new Error('Tâche non trouvée');
      }
      return { success: true, data: task };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération de la tâche : ${error.message}`);
    }
  }

  // Rechercher des tâches par titre
  static async searchTasks(searchTerm) {
    try {
      const { Task } = require('../models');
      const tasks = await Task.searchByTitle(searchTerm);
      return { success: true, data: tasks };
    } catch (error) {
      throw new Error(`Erreur lors de la recherche des tâches : ${error.message}`);
    }
  }

  // Mettre à jour une tâche
  static async updateTask(id, updateData) {
    try {
      const { Task } = require('../models');
      const task = await Task.updateTask(id, updateData);
      return { success: true, data: task };
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour de la tâche : ${error.message}`);
    }
  }

  // Supprimer une tâche (soft ou permanent)
  static async deleteTask(id, permanent = false) {
    try {
      const { Task } = require('../models');
      const result = await Task.deleteTask(id, permanent);
      return { success: true, message: result.message };
    } catch (error) {
      throw new Error(`Erreur lors de la suppression de la tâche : ${error.message}`);
    }
  }

  // Restaurer une tâche supprimée
  static async restoreTask(id) {
    try {
      const { Task } = require('../models');
      const task = await Task.restoreTask(id);
      return { success: true, data: task };
    } catch (error) {
      throw new Error(`Erreur lors de la restauration de la tâche : ${error.message}`);
    }
  }

  // Assigner une tâche à un rôle
  static async assignToRole(taskId, roleId) {
    try {
      const { RoleTask } = require('../models');

      // Vérifier si l'assignation existe déjà
      const existingAssignment = await RoleTask.findOne({
        where: { task_id: taskId, role_id: roleId }
      });

      if (existingAssignment) {
        throw new Error('Cette tâche est déjà assignée à ce rôle');
      }

      await RoleTask.create({
        task_id: taskId,
        role_id: roleId
      });

      return { success: true, message: 'Tâche assignée au rôle avec succès' };
    } catch (error) {
      throw new Error(`Erreur lors de l'assignation de la tâche au rôle : ${error.message}`);
    }
  }

  // Retirer une tâche d'un rôle
  static async unassignFromRole(taskId, roleId) {
    try {
      const result = await Task.unassignFromRole(taskId, roleId);
      return { success: true, message: result.message };
    } catch (error) {
      throw new Error(`Erreur lors du retrait de la tâche du rôle : ${error.message}`);
    }
  }
}

module.exports = TaskService;
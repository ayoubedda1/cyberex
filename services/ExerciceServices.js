class ExerciseService {
  // Récupérer tous les exercices
  static async getAllExercises() {
    try {
      const { Exercise } = require('../models');
      const exercises = await Exercise.findAll({
        order: [['name', 'ASC']]
      });
      return { success: true, data: exercises };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des exercices : ${error.message}`);
    }
  }

  // Créer un exercice
  static async createExercise(exerciseData) {
    try {
      const { Exercise } = require('../models');
      // Validation des données
      if (!exerciseData.name || !exerciseData.start_date || !exerciseData.end_date) {
        throw new Error('Le nom, la date de début et la date de fin sont requis');
      }

      const exercise = await Exercise.create(exerciseData);
      return { success: true, data: exercise };
    } catch (error) {
      throw new Error(`Erreur lors de la création de l'exercice : ${error.message}`);
    }
  }

  // Récupérer un exercice par ID
  static async getExerciseById(id) {
    try {
      const { Exercise } = require('../models');
      const exercise = await Exercise.findById(id);
      if (!exercise) {
        throw new Error('Exercice non trouvé');
      }
      return { success: true, data: exercise };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération de l'exercice : ${error.message}`);
    }
  }

  // Mettre à jour un exercice
  static async updateExercise(id, updateData) {
    try {
      const { Exercise } = require('../models');
      const exercise = await Exercise.updateExercise(id, updateData);
      return { success: true, data: exercise };
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour de l'exercice : ${error.message}`);
    }
  }

  // Activer un exercice
  static async activateExercise(id) {
    try {
      const { Exercise } = require('../models');
      const exercise = await Exercise.activateExercise(id);
      return { success: true, data: exercise };
    } catch (error) {
      throw new Error(`Erreur lors de l'activation de l'exercice : ${error.message}`);
    }
  }

  // Fermer un exercice
  static async closeExercise(id) {
    try {
      const { Exercise } = require('../models');
      const exercise = await Exercise.closeExercise(id);
      return { success: true, data: exercise };
    } catch (error) {
      throw new Error(`Erreur lors de la fermeture de l'exercice : ${error.message}`);
    }
  }

  // Supprimer un exercice (soft ou permanent)
  static async deleteExercise(id, permanent = false) {
    try {
      const { Exercise } = require('../models');
      const result = await Exercise.deleteExercise(id, permanent);
      return { success: true, message: result.message };
    } catch (error) {
      throw new Error(`Erreur lors de la suppression de l'exercice : ${error.message}`);
    }
  }

  // Restaurer un exercice supprimé
  static async restoreExercise(id) {
    try {
      const { Exercise } = require('../models');
      const exercise = await Exercise.restoreExercise(id);
      return { success: true, data: exercise };
    } catch (error) {
      throw new Error(`Erreur lors de la restauration de l'exercice : ${error.message}`);
    }
  }
}

module.exports = ExerciseService;
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Exercise = sequelize.define('Exercise', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true
      }
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
        isAfterStartDate(value) {
          if (this.start_date && value <= this.start_date) {
            throw new Error('End date must be after start date');
          }
        }
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'closed'),
      allowNull: false,
      defaultValue: 'active'
    }
  }, {
    tableName: 'exercises',
    timestamps: true,
    paranoid: true
  });

  // ============ CRUD METHODS ============

  // CREATE Methods
  Exercise.createExercise = async function(exerciseData) {
    try {
      const startDate = new Date(exerciseData.start_date);
      const endDate = new Date(exerciseData.end_date);

      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }

      return await this.create({
        name: exerciseData.name.trim(),
        start_date: startDate,
        end_date: endDate,
        status: exerciseData.status || 'active'
      });
    } catch (error) {
      throw new Error(`Failed to create exercise: ${error.message}`);
    }
  };

  // READ Methods
  Exercise.findById = function(id) {
    return this.findByPk(id, {
      include: [
        {
          model: sequelize.models.User,
          as: 'users',
          attributes: { exclude: ['password'] }
        }
      ]
    });
  };

  // UPDATE Methods
  Exercise.updateExercise = async function(id, updateData) {
    try {
      const exercise = await this.findByPk(id);
      if (!exercise) {
        throw new Error('Exercise not found');
      }

      const processedData = { ...updateData };
      if (processedData.name) {
        processedData.name = processedData.name.trim();
      }

      // Validate dates if provided
      if (processedData.start_date || processedData.end_date) {
        const startDate = processedData.start_date ? new Date(processedData.start_date) : exercise.start_date;
        const endDate = processedData.end_date ? new Date(processedData.end_date) : exercise.end_date;

        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }

        if (processedData.start_date) processedData.start_date = startDate;
        if (processedData.end_date) processedData.end_date = endDate;
      }

      await exercise.update(processedData);
      return exercise;
    } catch (error) {
      throw new Error(`Failed to update exercise: ${error.message}`);
    }
  };

  Exercise.activateExercise = async function(id) {
    return await this.updateExercise(id, { status: 'active' });
  };

  Exercise.closeExercise = async function(id) {
    return await this.updateExercise(id, { status: 'closed' });
  };

  // DELETE Methods
  Exercise.deleteExercise = async function(id, permanent = false) {
    try {
      const exercise = await this.findByPk(id);
      if (!exercise) {
        throw new Error('Exercise not found');
      }

      if (permanent) {
        await exercise.destroy({ force: true });
        return { message: 'Exercise permanently deleted' };
      } else {
        await exercise.destroy(); // Soft delete
        return { message: 'Exercise soft deleted' };
      }
    } catch (error) {
      throw new Error(`Failed to delete exercise: ${error.message}`);
    }
  };

  Exercise.restoreExercise = async function(id) {
    try {
      const exercise = await this.findByPk(id, { paranoid: false });
      if (!exercise) {
        throw new Error('Exercise not found');
      }

      await exercise.restore();
      return exercise;
    } catch (error) {
      throw new Error(`Failed to restore exercise: ${error.message}`);
    }
  };

  return Exercise;
};
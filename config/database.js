const { Sequelize } = require('sequelize');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

const databaseConfig = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cyberx',
    username: process.env.DB_USER || 'cyberex',
    password: process.env.DB_PASSWORD || 'cyber123',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    pool: {
      max: 1,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      statement_timeout: 30000
    }
  }
};

// Validate required environment variables for production
if (env === 'production') {
  const requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables for production: ${missingVars.join(', ')}`);
  }
}

const sequelize = new Sequelize(databaseConfig[env]);

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('🔌 Connected to PostgreSQL database');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function syncDatabase(force = false) {
  try {
    await sequelize.sync({ force });
    console.log('✅ Database synchronized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    return false;
  }
}

async function closeConnection() {
  try {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error.message);
  }
}

// Ensure case-insensitive unique index on roles.name (Postgres only)
async function ensureRoleNameLowerUniqueIndex() {
  try {
    if (sequelize.getDialect() !== 'postgres') {
      return;
    }
    // Idempotent index creation on expression lower(name)
    await sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS roles_name_lower_unique ON roles ((lower(name)));'
    );
    return true;
  } catch (error) {
    console.error('❌ Failed ensuring roles lower(name) unique index:', error.message);
    return false;
  }
}

module.exports = {
  sequelize,
  config: databaseConfig,
  testConnection,
  syncDatabase,
  closeConnection,
  ensureRoleNameLowerUniqueIndex
};

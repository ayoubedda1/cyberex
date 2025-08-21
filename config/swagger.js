const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CyberX Backend API',
      version: '1.0.0',
      description: 'A secure Express.js API for CyberX application',
      contact: {
        name: 'CyberX Team',
        email: 'team@cyberx.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './server.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs;

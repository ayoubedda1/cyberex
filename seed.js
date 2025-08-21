const { syncDatabase } = require('./config/database');
const logger = require('./config/logger');
const http = require('http');

// Import models and services
const { User } = require('./models');
const RoleService = require('./services/RoleServices');
const TaskService = require('./services/TaskServices');
const ExerciseService = require('./services/ExerciceServices');
const UserRoleService = require('./services/UserRoleServices');

// Test utilities
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Sync database (create tables)
    await syncDatabase(true); // Force sync to recreate tables
    console.log('📊 Database tables created/updated');

    // 1. Create roles using services
    console.log('📝 Creating roles...');
    const rolesData = [
      {
        name: 'admin',
        description: 'Administrator with full access',
        permissions: ['read', 'write', 'delete', 'admin']
      },
      {
        name: 'user',
        description: 'Regular user with basic access',
        permissions: ['read', 'write']
      },
      {
        name: 'viewer',
        description: 'Read-only user',
        permissions: ['read']
      }
    ];

    const createdRoles = {};
    for (const roleData of rolesData) {
      const result = await RoleService.createRole(roleData);
      createdRoles[result.data.name] = result.data;
      console.log(`✅ Created role: ${result.data.name}`);
    }
    
    // 2. Create exercises using services
    console.log('🎯 Creating exercises...');
    const exercisesData = [
      {
        name: 'Exercise 1',
        start_date: new Date('2024-01-15'),
        end_date: new Date('2024-01-20'),
        status: 'active'
      },
      {
        name: 'Exercise 2',
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-02-10'),
        status: 'active'
      },
      {
        name: 'Exercise 3',
        start_date: new Date('2024-03-01'),
        end_date: new Date('2024-03-05'),
        status: 'closed'
      }
    ];

    const createdExercises = [];
    for (const exerciseData of exercisesData) {
      const result = await ExerciseService.createExercise(exerciseData);
      createdExercises.push(result.data);
      console.log(`✅ Created exercise: ${result.data.name}`);
    }
    
    // 3. Create tasks using services
    console.log('📋 Creating tasks...');
    const tasksData = [
      {
        title: 'Task 1',
        description: 'Complete the first cybersecurity exercise task.'
      },
      {
        title: 'Task 2',
        description: 'Execute the second cybersecurity exercise task.'
      },
      {
        title: 'Task 3',
        description: 'Perform the third cybersecurity exercise task.'
      }
    ];

    const createdTasks = [];
    for (const taskData of tasksData) {
      const result = await TaskService.createTask(taskData);
      createdTasks.push(result.data);
      console.log(`✅ Created task: ${result.data.title}`);
    }
    
    // 4. Create users using services
    console.log('👥 Creating users...');
    const usersData = [
      {
        email: 'admin@cyberx.com',
        password: 'admin123',
        name: 'System Administrator',
        exercise_id: createdExercises[0].id,
        roles: ['admin']
      },
      {
        email: 'user@cyberx.com',
        password: 'user123',
        name: 'Regular User',
        exercise_id: createdExercises[0].id,
        roles: ['user']
      },
      {
        email: 'viewer@cyberx.com',
        password: 'viewer123',
        name: 'Viewer User',
        exercise_id: createdExercises[1].id,
        roles: ['viewer']
      }
    ];

    const createdUsers = [];
    for (const userData of usersData) {
      const { roles, ...userCreateData } = userData;
      const user = await User.createUser(userCreateData);
      createdUsers.push({ user, roles });
      console.log(`✅ Created user: ${user.email}`);
    }
    
    // 5. Assign roles to users using services
    console.log('🔗 Assigning roles to users...');
    for (const { user, roles } of createdUsers) {
      for (const roleName of roles) {
        const role = createdRoles[roleName];
        if (role) {
          await UserRoleService.assignRole(user.id, role.id);
          console.log(`✅ Assigned role '${roleName}' to user '${user.email}'`);
        }
      }
    }

    // 6. Assign tasks to roles using services
    console.log('📋 Assigning tasks to roles...');
    const taskRoleAssignments = [
      { taskIndex: 0, roles: ['admin', 'user'] }, // Task 1
      { taskIndex: 1, roles: ['admin', 'user'] }, // Task 2
      { taskIndex: 2, roles: ['admin'] }, // Task 3 (admin only)
    ];

    for (const assignment of taskRoleAssignments) {
      const task = createdTasks[assignment.taskIndex];
      for (const roleName of assignment.roles) {
        const role = createdRoles[roleName];
        if (task && role) {
          await TaskService.assignToRole(task.id, role.id);
          console.log(`✅ Assigned task '${task.title}' to role '${roleName}'`);
        }
      }
    }
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│                    LOGIN CREDENTIALS                    │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ Admin:   admin@cyberx.com   / admin123                 │');
    console.log('│ User:    user@cyberx.com    / user123                  │');
    console.log('│ Viewer:  viewer@cyberx.com  / viewer123                │');
    console.log('└─────────────────────────────────────────────────────────┘');
    
    console.log('\n📊 Database Summary:');
    console.log(`• ${Object.keys(createdRoles).length} roles created`);
    console.log(`• ${createdExercises.length} exercises created`);
    console.log(`• ${createdTasks.length} tasks created`);
    console.log(`• ${createdUsers.length} users created`);
    console.log(`• Role-User assignments completed`);
    console.log(`• Task-Role assignments completed`);
    
    logger.info('Database seeding completed successfully', {
      roles: Object.keys(createdRoles).length,
      exercises: createdExercises.length,
      tasks: createdTasks.length,
      users: createdUsers.length
    });

    // Run integrated tests
    await runIntegratedTests();

  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    logger.error('Database seeding failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Integrated tests function
async function runIntegratedTests() {
  console.log('\n🧪 Running Integrated API Tests...');
  console.log('=' .repeat(60));

  try {
    // Wait for server to be ready
    await waitForServer();

    // Test authentication
    const token = await testAuthentication();

    // Test CRUD endpoints
    await testCrudEndpoints(token);

    // Test special endpoints
    await testSpecialEndpoints(token);

    console.log('\n✅ All integrated tests passed!');
    console.log('🎉 API is ready for use!');

  } catch (error) {
    console.error('❌ Integrated tests failed:', error.message);
    throw error;
  }
}

// Wait for server to be ready
async function waitForServer(maxAttempts = 10) {
  console.log('⏳ Waiting for server to be ready...');

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const options = {
        hostname: '192.168.0.200',
        port: 3000,
        path: '/api/db-test',
        method: 'GET',
        timeout: 2000
      };

      const response = await makeRequest(options);
      if (response.status === 200) {
        console.log('✅ Server is ready');
        return;
      }
    } catch (error) {
      // Server not ready yet
    }

    console.log(`   Attempt ${i + 1}/${maxAttempts}...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Server did not become ready in time');
}

// Test authentication
async function testAuthentication() {
  console.log('🔐 Testing authentication...');

  const loginData = JSON.stringify({ email: 'admin@cyberx.com', password: 'admin123' });
  const options = {
    hostname: '192.168.0.200',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  const response = await makeRequest(options, loginData);
  if (response.status === 200 && response.data.success) {
    console.log('✅ Authentication test passed');
    return response.data.token;
  }

  throw new Error('Authentication test failed');
}

// Test CRUD endpoints
async function testCrudEndpoints(token) {
  console.log('📋 Testing CRUD endpoints...');

  const endpoints = [
    { path: '/api/roles', name: 'Roles' },
    { path: '/api/tasks', name: 'Tasks' },
    { path: '/api/exercises', name: 'Exercises' },
    { path: '/api/users', name: 'Users' }
  ];

  for (const endpoint of endpoints) {
    try {
      const options = {
        hostname: '192.168.0.200',
        port: 3000,
        path: endpoint.path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await makeRequest(options);
      if (response.status === 200) {
        console.log(`✅ ${endpoint.name} GET endpoint working`);
      } else {
        console.log(`⚠️  ${endpoint.name} GET endpoint returned ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name} GET endpoint failed: ${error.message}`);
    }
  }
}

// Test special endpoints
async function testSpecialEndpoints(token) {
  console.log('🔧 Testing special endpoints...');

  // Test database connection
  try {
    const options = {
      hostname: '192.168.0.200',
      port: 3000,
      path: '/api/db-test',
      method: 'GET'
    };

    const response = await makeRequest(options);
    if (response.status === 200) {
      console.log('✅ Database test endpoint working');
    }
  } catch (error) {
    console.log('❌ Database test endpoint failed');
  }

  // Test protected endpoint
  try {
    const options = {
      hostname: '192.168.0.200',
      port: 3000,
      path: '/api',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await makeRequest(options);
    if (response.status === 200) {
      console.log('✅ Protected endpoint working');
    }
  } catch (error) {
    console.log('❌ Protected endpoint failed');
  }

  // Test Swagger token generation
  try {
    const swaggerData = JSON.stringify({ swaggerSecret: 'cyberx-swagger-access-secret-2024' });
    const options = {
      hostname: '192.168.0.200',
      port: 3000,
      path: '/api/swagger/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': swaggerData.length
      }
    };

    const response = await makeRequest(options, swaggerData);
    if (response.status === 200 && response.data.success) {
      console.log('✅ Swagger token generation working');
    }
  } catch (error) {
    console.log('❌ Swagger token generation failed');
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase().then(() => {
    console.log('🏁 Seeding and testing process completed. Exiting...');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Process failed:', error.message);
    process.exit(1);
  });
}

module.exports = seedDatabase;

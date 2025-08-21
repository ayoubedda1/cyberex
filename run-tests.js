const http = require('http');

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
  
  let passedTests = 0;
  
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
        passedTests++;
      } else {
        console.log(`⚠️  ${endpoint.name} GET endpoint returned ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name} GET endpoint failed: ${error.message}`);
    }
  }
  
  return passedTests;
}

// Test special endpoints
async function testSpecialEndpoints(token) {
  console.log('🔧 Testing special endpoints...');
  
  let passedTests = 0;
  
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
      passedTests++;
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
      passedTests++;
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
      passedTests++;
    }
  } catch (error) {
    console.log('❌ Swagger token generation failed');
  }
  
  return passedTests;
}

// Main test function
async function runTests() {
  console.log('🧪 CyberX API - Comprehensive Test Suite');
  console.log('=' .repeat(60));
  
  try {
    // Wait for server to be ready
    await waitForServer();
    
    // Test authentication
    const token = await testAuthentication();
    
    // Test CRUD endpoints
    const crudPassed = await testCrudEndpoints(token);
    
    // Test special endpoints
    const specialPassed = await testSpecialEndpoints(token);
    
    // Summary
    const totalTests = 7; // 4 CRUD + 3 special
    const totalPassed = crudPassed + specialPassed + 1; // +1 for auth
    
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(40));
    console.log(`✅ Tests Passed: ${totalPassed}/${totalTests + 1}`);
    console.log(`❌ Tests Failed: ${(totalTests + 1) - totalPassed}/${totalTests + 1}`);
    console.log(`📈 Success Rate: ${Math.round((totalPassed / (totalTests + 1)) * 100)}%`);
    
    if (totalPassed === totalTests + 1) {
      console.log('\n🎉 All tests passed! API is fully functional!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Please check the API configuration.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();

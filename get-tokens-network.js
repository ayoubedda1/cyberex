const http = require('http');

// Helper function to make HTTP requests
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

// Get API JWT token
async function getApiToken() {
  console.log('🔐 Getting API JWT Token...');
  
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
  if (response.data.success) {
    console.log('✅ API JWT Token obtained successfully');
    return response.data.token;
  }
  throw new Error('Failed to get API JWT token');
}

// Get Swagger JWT token
async function getSwaggerToken() {
  console.log('📖 Getting Swagger JWT Token...');
  
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
  if (response.data.success) {
    console.log('✅ Swagger JWT Token obtained successfully');
    return response.data.token;
  }
  throw new Error('Failed to get Swagger JWT token: ' + JSON.stringify(response.data));
}

// Test Swagger access
async function testSwaggerAccess(swaggerToken) {
  console.log('🧪 Testing Swagger access...');
  
  const options = {
    hostname: '192.168.0.200',
    port: 3000,
    path: '/api/docs',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${swaggerToken}`,
      'Accept': 'text/html'
    }
  };

  const response = await makeRequest(options);
  if (response.status === 200) {
    console.log('✅ Swagger UI accessible');
    return true;
  } else {
    console.log('❌ Swagger UI not accessible:', response.status);
    return false;
  }
}

// Main function
async function getTokens() {
  console.log('🎫 CyberX API - Network Token Generator\n');
  console.log('🌐 API Server: 192.168.0.200:3000');
  console.log('🗄️ Database: 192.168.0.15:5432');
  console.log('=' .repeat(60));

  try {
    // Get API JWT Token
    const apiToken = await getApiToken();
    
    // Get Swagger JWT Token
    const swaggerToken = await getSwaggerToken();
    
    // Test Swagger access
    await testSwaggerAccess(swaggerToken);

    console.log('\n🎉 All tokens obtained successfully!\n');
    
    console.log('📋 SUMMARY:');
    console.log('=' .repeat(60));
    
    console.log('\n🔑 API JWT TOKEN (for API endpoints):');
    console.log('-' .repeat(50));
    console.log(apiToken);
    
    console.log('\n📖 SWAGGER JWT TOKEN (for Swagger UI):');
    console.log('-' .repeat(50));
    console.log(swaggerToken);
    
    console.log('\n📖 HOW TO ACCESS SWAGGER UI:');
    console.log('-' .repeat(50));
    console.log('1. Open your browser');
    console.log('2. Go to: http://192.168.0.200:3000/api/docs');
    console.log('3. Click "Authorize" button in Swagger UI');
    console.log('4. Enter: Bearer ' + swaggerToken);
    console.log('5. Click "Authorize" and "Close"');
    console.log('6. Now you can test all API endpoints in Swagger!');
    
    console.log('\n🔧 FOR API TESTING (Postman, curl, etc.):');
    console.log('-' .repeat(50));
    console.log('Use this header for protected endpoints:');
    console.log('Authorization: Bearer ' + apiToken);
    
    console.log('\n📊 AVAILABLE ENDPOINTS:');
    console.log('-' .repeat(50));
    console.log('• Authentication: http://192.168.0.200:3000/api/auth/*');
    console.log('• Users CRUD: http://192.168.0.200:3000/api/users/*');
    console.log('• Roles CRUD: http://192.168.0.200:3000/api/roles/*');
    console.log('• Tasks CRUD: http://192.168.0.200:3000/api/tasks/*');
    console.log('• Exercises CRUD: http://192.168.0.200:3000/api/exercises/*');
    console.log('• Health Check: http://192.168.0.200:3000/api/db-test');
    console.log('• Swagger Docs: http://192.168.0.200:3000/api/docs (with Swagger token)');
    
    console.log('\n🔧 MODHEADER CONFIGURATION:');
    console.log('-' .repeat(50));
    console.log('Header Name: Authorization');
    console.log('Header Value: Bearer ' + apiToken);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the token generator
getTokens();

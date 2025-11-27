/**
 * Simple test script to verify API routes return JSON responses
 * Run with: node scripts/test-api-routes.js
 */

const BASE_URL = 'http://localhost:3000';

async function testRoute(url, options = {}) {
  try {
    console.log(`\nTesting ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...options
    });
    
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${contentType}`);
    console.log(`Is JSON: ${isJson}`);
    
    if (isJson) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      // Check if response has success property
      if (typeof data.success === 'boolean') {
        console.log(`✓ Success property: ${data.success}`);
      } else {
        console.log('⚠ Response missing success property');
      }
    } else {
      const text = await response.text();
      console.log('Non-JSON response:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      console.log('✗ ERROR: Expected JSON response but got HTML/text');
    }
    
    return isJson;
  } catch (error) {
    console.error(`Error testing ${url}:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('API Route JSON Response Tester');
  console.log('=============================');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test existing routes
  const tests = [
    // Test the example route we created
    { url: '/api/example', method: 'GET' },
    
    // Test the improved auth route
    { url: '/api/auth', method: 'POST', body: JSON.stringify({ email: 'test@example.com', password: 'password' }) },
    
    // Test the users route
    { url: '/api/users', method: 'GET' },
    
    // Test the test-json route
    { url: '/api/test-json', method: 'GET' },
    { url: '/api/test-json', method: 'POST', body: JSON.stringify({ action: 'success', email: 'test@example.com', name: 'Test User' }) },
    { url: '/api/test-json', method: 'POST', body: JSON.stringify({ action: 'validation-error' }) },
    
    // Test unsupported methods
    { url: '/api/test-json', method: 'PUT' },
    { url: '/api/test-json', method: 'DELETE' },
  ];
  
  for (const test of tests) {
    totalTests++;
    const options = {
      method: test.method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (test.body) {
      options.body = test.body;
    }
    
    const isJson = await testRoute(test.url, options);
    if (isJson) passedTests++;
  }
  
  console.log('\n=============================');
  console.log(`Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('✓ All tests passed! All API routes return JSON responses.');
  } else {
    console.log('✗ Some tests failed. Check the output above for details.');
  }
}

// Run the tests
runTests().catch(console.error);
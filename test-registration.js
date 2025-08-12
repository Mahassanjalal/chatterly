// Test script to verify registration API
const fetch = require('node-fetch');

async function testRegistration() {
  try {
    console.log('Testing registration API...');
    
    const response = await fetch('http://localhost:4000/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Hassan',
        email: 'hsn121@gmail.com',
        password: '12345678'
      })
    });

    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Registration successful!');
    } else {
      console.log('❌ Registration failed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testLogin() {
  try {
    console.log('\nTesting login API...');
    
    const response = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'hsn121@gmail.com',
        password: '12345678'
      })
    });

    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Login successful!');
    } else {
      console.log('❌ Login failed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run tests
testRegistration().then(() => testLogin());

/**
 * Couple Chat App - Functionality Test Script
 * 
 * This script tests the core functionality of the Couple Chat application:
 * - API health check
 * - User registration
 * - User login
 * - Chat creation
 * - Message sending
 * - CORS functionality
 * 
 * Usage: node test-functionality.js
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';
const FRONTEND_URL = 'http://localhost:3000';

// Test users
const testUser1 = {
  name: 'Test User 1',
  email: `test1_${Date.now()}@example.com`,
  password: 'Password123!'
};

const testUser2 = {
  name: 'Test User 2',
  email: `test2_${Date.now()}@example.com`,
  password: 'Password123!'
};

// Storage for auth tokens and IDs
let user1Token = '';
let user2Token = '';
let user1Id = '';
let user2Id = '';
let chatId = '';

// Utility to create axios instance with auth token
const createAuthClient = (token) => {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
};

// Test functions
async function testHealthCheck() {
  console.log('\n🔍 Testing API Health Check...');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ API Health Check successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ API Health Check failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function testCorsConfiguration() {
  console.log('\n🔍 Testing CORS Configuration...');
  
  // Test allowed origin (frontend URL)
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      headers: {
        'Origin': FRONTEND_URL
      }
    });
    console.log('✅ CORS test with allowed origin successful');
  } catch (error) {
    console.error('❌ CORS test with allowed origin failed:', error.message);
    return false;
  }
  
  // Test localhost with different port (should be allowed in dev)
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:8080'
      }
    });
    console.log('✅ CORS test with localhost different port successful');
  } catch (error) {
    console.error('❌ CORS test with localhost different port failed:', error.message);
    return false;
  }
  
  // Test disallowed origin (should be blocked, but we'll check for the response)
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      headers: {
        'Origin': 'https://malicious-site.com'
      }
    });
    console.log('⚠️ CORS test with disallowed origin returned success (check your CORS config)');
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log('✅ CORS test with disallowed origin correctly blocked');
    } else {
      console.error('❓ CORS test with disallowed origin had unexpected result:', error.message);
    }
  }
  
  return true;
}

async function testUserRegistration() {
  console.log('\n🔍 Testing User Registration...');
  
  // Register first user
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/signup`, testUser1);
    user1Token = response.data.token;
    user1Id = response.data.user._id;
    console.log('✅ User 1 Registration successful:', response.data.user.name);
  } catch (error) {
    console.error('❌ User 1 Registration failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
  
  // Register second user
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/signup`, testUser2);
    user2Token = response.data.token;
    user2Id = response.data.user._id;
    console.log('✅ User 2 Registration successful:', response.data.user.name);
  } catch (error) {
    console.error('❌ User 2 Registration failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
  
  return true;
}

async function testUserLogin() {
  console.log('\n🔍 Testing User Login...');
  
  // Login as first user
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser1.email,
      password: testUser1.password
    });
    user1Token = response.data.token;
    console.log('✅ User 1 Login successful');
  } catch (error) {
    console.error('❌ User 1 Login failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
  
  // Login as second user
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser2.email,
      password: testUser2.password
    });
    user2Token = response.data.token;
    console.log('✅ User 2 Login successful');
  } catch (error) {
    console.error('❌ User 2 Login failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
  
  return true;
}

async function testChatCreation() {
  console.log('\n🔍 Testing Chat Creation...');
  
  const user1Client = createAuthClient(user1Token);
  
  try {
    // User 1 creates a chat with User 2
    const response = await user1Client.post('/chat/create', {
      partnerEmail: testUser2.email,
      chatName: 'Test Chat'
    });
    
    chatId = response.data.chat._id;
    console.log('✅ Chat Creation successful. Chat ID:', chatId);
    return true;
  } catch (error) {
    console.error('❌ Chat Creation failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function testMessageSending() {
  console.log('\n🔍 Testing Message Sending...');
  
  if (!chatId) {
    console.error('❌ Cannot test message sending without a valid chat ID');
    return false;
  }
  
  const user1Client = createAuthClient(user1Token);
  const user2Client = createAuthClient(user2Token);
  
  // User 1 sends a message
  try {
    const response = await user1Client.post('/chat/message', {
      chatId,
      text: 'Hello from User 1!',
      type: 'text'
    });
    console.log('✅ User 1 Message sending successful');
  } catch (error) {
    console.error('❌ User 1 Message sending failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
  
  // User 2 sends a message
  try {
    const response = await user2Client.post('/chat/message', {
      chatId,
      text: 'Hello from User 2!',
      type: 'text'
    });
    console.log('✅ User 2 Message sending successful');
  } catch (error) {
    console.error('❌ User 2 Message sending failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
  
  // Verify messages are retrievable
  try {
    const response = await user1Client.get(`/chat/${chatId}/messages`);
    const messages = response.data.messages;
    
    if (messages.length >= 2) {
      console.log('✅ Message retrieval successful. Found', messages.length, 'messages');
      return true;
    } else {
      console.error('❌ Message retrieval failed: Expected at least 2 messages, got', messages.length);
      return false;
    }
  } catch (error) {
    console.error('❌ Message retrieval failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Couple Chat App Functionality Tests');
  console.log('==============================================');
  
  const tests = [
    { name: 'API Health Check', fn: testHealthCheck },
    { name: 'CORS Configuration', fn: testCorsConfiguration },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Chat Creation', fn: testChatCreation },
    { name: 'Message Sending', fn: testMessageSending }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const success = await test.fn();
      results.push({ name: test.name, success });
    } catch (error) {
      console.error(`Unexpected error in ${test.name}:`, error);
      results.push({ name: test.name, success: false, error });
    }
  }
  
  // Print summary
  console.log('\n\n📊 Test Results Summary');
  console.log('======================');
  
  let allPassed = true;
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.name}: PASSED`);
    } else {
      console.log(`❌ ${result.name}: FAILED`);
      allPassed = false;
    }
  });
  
  console.log('\n======================');
  if (allPassed) {
    console.log('🎉 All tests passed! The application appears to be working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the logs above for details.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error during test execution:', error);
  process.exit(1);
});

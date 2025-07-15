// Quick test script to verify Gemini API is working
const GeminiService = require('./services/geminiService');

async function testGeminiAPI() {
  console.log('🤖 Testing Gemini 2.5 Flash API...');
  
  try {
    const geminiService = new GeminiService();
    
    // Check if API key is configured
    if (!geminiService.isConfigured()) {
      console.error('❌ Gemini API key is not configured');
      return;
    }
    
    console.log('✅ API key is configured');
    console.log(`📡 Using model: ${geminiService.model}`);
    console.log(`🔗 API endpoint: ${geminiService.baseUrl}`);
    
    // Test a simple request
    const response = await geminiService.generateContent(
      'Hello Gemini 2.5 Flash! Please respond with "Hello from Gemini 2.5 Flash!" to confirm you are working.',
      'You are a helpful AI assistant for a couple chat app.'
    );
    
    console.log('✅ API Response:', response);
    console.log('🎉 Gemini API is working correctly!');
    
  } catch (error) {
    console.error('❌ Gemini API test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testGeminiAPI();
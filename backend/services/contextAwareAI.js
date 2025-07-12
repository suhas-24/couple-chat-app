/**
 * Context-Aware AI Service
 * 
 * This service analyzes incoming messages to determine if they're AI queries
 * or normal conversation, eliminating the need for a separate sparkles button.
 */

// Import the entire Gemini service to avoid broken destructuring
const geminiService = require('./geminiService');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

// Message intent classification types
const INTENT = {
  AI_QUERY: 'AI_QUERY',          // Definitely an AI query
  NORMAL_CHAT: 'NORMAL_CHAT',    // Regular conversation
  UNCLEAR: 'UNCLEAR'             // Could be either, needs more context
};

// Common AI query patterns
const AI_QUERY_PATTERNS = [
  // Questions about message history
  /how (many|much) .*(say|said|mention|talk|spoke)/i,
  /how (many|much) time.*(say|said|mention|talk|spoke)/i,
  /how often .*(say|said|mention|talk|spoke)/i,
  /what did (we|you|I) (say|talk about|discuss)/i,
  
  // Date-based queries
  /what (happened|did we do|did we talk about|did we say) (on|at|in) .*(day|date|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}|yesterday|last week)/i,
  /when (was|did) .*(last|first|previous|recent|latest)/i,
  
  // Word frequency queries
  /how (many|much) times .*(word|say|said|mention)/i,
  /(what|which) (word|phrase|emoji) .*(most|frequently|often|common)/i,
  
  // Analysis requests
  /analyze our (chat|conversation|messages|communication)/i,
  /what('s| is) our (communication style|tone|pattern)/i,
  /how would you describe our (conversation|communication|chat|messages)/i,
  
  // Direct AI queries
  /can you (tell|show|analyze|summarize)/i,
  /could you (tell|show|analyze|summarize)/i,
  /I('d| would) like to know/i,
  /tell me about/i,
  
  // Help queries
  /what can you (do|help with|tell me)/i,
  /how can you help/i
];

// Keywords that strongly indicate an AI query
const AI_QUERY_KEYWORDS = [
  'analyze', 'summary', 'summarize', 'statistics', 'stats', 'frequency',
  'count', 'how many', 'how often', 'history', 'messages', 'conversation',
  'chat history', 'tell me about', 'insights', 'patterns', 'trends',
  'most common', 'least common', 'average', 'total', 'analytics'
];

/**
 * Analyzes a message to determine if it's an AI query or normal conversation
 * 
 * @param {string} messageText - The text of the message to analyze
 * @param {string} chatId - The ID of the chat the message belongs to
 * @param {string} senderId - The ID of the user who sent the message
 * @returns {Promise<{intent: string, confidence: number, aiResponse?: string}>}
 */
async function analyzeMessageIntent(messageText, chatId, senderId) {
  // Skip empty messages
  if (!messageText || messageText.trim() === '') {
    return { intent: INTENT.NORMAL_CHAT, confidence: 1.0 };
  }
  
  // Quick check for obvious AI queries using patterns
  for (const pattern of AI_QUERY_PATTERNS) {
    if (pattern.test(messageText)) {
      // Get AI response for the query
      const aiResponse = await generateAIResponse(messageText, chatId, senderId);
      return { 
        intent: INTENT.AI_QUERY, 
        confidence: 0.9,
        aiResponse
      };
    }
  }
  
  // Check for AI keywords
  const messageWords = messageText.toLowerCase().split(/\s+/);
  const keywordMatches = messageWords.filter(word => 
    AI_QUERY_KEYWORDS.some(keyword => 
      keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase())
    )
  );
  
  if (keywordMatches.length >= 2) {
    // Multiple keyword matches suggest an AI query
    const aiResponse = await generateAIResponse(messageText, chatId, senderId);
    return { 
      intent: INTENT.AI_QUERY, 
      confidence: 0.8,
      aiResponse
    };
  }
  
  // For messages that end with a question mark and are longer than 5 words,
  // use Gemini to analyze intent more deeply
  if (messageText.trim().endsWith('?') && messageWords.length > 5) {
    try {
      const intentAnalysis = await analyzeWithGemini(messageText, chatId);
      
      if (intentAnalysis.isAIQuery) {
        const aiResponse = await generateAIResponse(messageText, chatId, senderId);
        return {
          intent: INTENT.AI_QUERY,
          confidence: intentAnalysis.confidence,
          aiResponse
        };
      }
      
      return {
        intent: INTENT.NORMAL_CHAT,
        confidence: intentAnalysis.confidence
      };
    } catch (error) {
      console.error('Error analyzing message with Gemini:', error);
      // If Gemini analysis fails, fall back to basic classification
      return determineIntentBasedOnStructure(messageText);
    }
  }
  
  // For all other messages, determine intent based on structure
  return determineIntentBasedOnStructure(messageText);
}

/**
 * Uses Gemini to analyze if a message is an AI query
 * 
 * @param {string} messageText - The message to analyze
 * @param {string} chatId - The chat ID for context
 * @returns {Promise<{isAIQuery: boolean, confidence: number}>}
 */
async function analyzeWithGemini(messageText, chatId) {
  try {
    const prompt = `
      As an AI assistant integrated into a couple's chat app, I need to determine if the following message is directed at me (the AI) or if it's part of a normal conversation between the couple.

      Message: "${messageText}"

      Please analyze this message and determine:
      1. Is this message asking the AI assistant a question about chat history, analytics, or for assistance?
      2. Or is this message likely part of a normal conversation between two people?

      Respond in JSON format with two fields:
      - isAIQuery: boolean (true if the message is directed at the AI, false if it's normal conversation)
      - confidence: number between 0 and 1 (how confident you are in this classification)
      - reasoning: brief explanation of your decision
    `;

    const response = await geminiService.geminiService.generateContent(prompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          isAIQuery: analysis.isAIQuery,
          confidence: analysis.confidence || 0.7
        };
      }
      
      // If JSON parsing fails, check for yes/no indicators
      const isQuery = response.toLowerCase().includes('yes, this is directed at the ai') || 
                     response.toLowerCase().includes('this is an ai query');
      
      return {
        isAIQuery: isQuery,
        confidence: 0.6
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      // Default to treating it as a normal chat message if parsing fails
      return { isAIQuery: false, confidence: 0.5 };
    }
  } catch (error) {
    console.error('Error calling Gemini for intent analysis:', error);
    throw error;
  }
}

/**
 * Determines message intent based on structure and content
 * 
 * @param {string} messageText - The message to analyze
 * @returns {{intent: string, confidence: number}}
 */
function determineIntentBasedOnStructure(messageText) {
  const text = messageText.toLowerCase().trim();
  
  // Short messages are likely normal chat
  if (text.split(/\s+/).length <= 3) {
    return { intent: INTENT.NORMAL_CHAT, confidence: 0.8 };
  }
  
  // Messages with question marks might be queries
  if (text.endsWith('?')) {
    // Personal questions are likely normal chat
    if (text.includes('you') && !text.includes('can you') && !text.includes('could you')) {
      return { intent: INTENT.NORMAL_CHAT, confidence: 0.7 };
    }
    
    // Questions about "we" or "our" might be AI queries about the relationship
    if (text.includes(' we ') || text.includes(' our ')) {
      return { intent: INTENT.UNCLEAR, confidence: 0.5 };
    }
    
    // Other questions are ambiguous
    return { intent: INTENT.UNCLEAR, confidence: 0.6 };
  }
  
  // Default to normal chat
  return { intent: INTENT.NORMAL_CHAT, confidence: 0.7 };
}

/**
 * Generates an AI response to a query about chat history
 * 
 * @param {string} query - The user's query
 * @param {string} chatId - The ID of the chat
 * @param {string} userId - The ID of the user making the query
 * @returns {Promise<string>} - The AI's response
 */
async function generateAIResponse(query, chatId, userId) {
  try {
    // Get chat and participant information
    const chat = await Chat.findById(chatId).populate('participants');
    if (!chat) {
      return "I couldn't find this chat. Please try again later.";
    }
    
    // Get recent messages for context (limit to 100 for performance)
    const messages = await Message.find({ 
      chat: chatId,
      isDeleted: false 
    })
    .sort('-createdAt')
    .limit(100)
    .populate('sender', 'name');
    
    // Create a context object with chat information
    const chatContext = {
      participants: chat.participants.map(p => p.name),
      messageCount: messages.length,
      dateRange: messages.length > 0 ? {
        earliest: messages[messages.length - 1].createdAt,
        latest: messages[0].createdAt
      } : null,
      relationshipContext: chat.metadata || {}
    };
    
    // Format recent messages for the AI
    const formattedMessages = messages.reverse().map(msg => ({
      sender: msg.sender.name,
      text: msg.content.text,
      timestamp: msg.createdAt,
      wasTranslated: msg.metadata?.importedFrom?.wasTranslated || false,
      originalText: msg.metadata?.importedFrom?.originalText || null
    }));
    
    // Create prompt for Gemini
    const prompt = `
      You are an AI assistant in a couple's chat app. You've been asked to help answer a question about their chat history.
      
      CHAT CONTEXT:
      - Participants: ${chatContext.participants.join(', ')}
      - Total messages analyzed: ${chatContext.messageCount}
      ${chatContext.dateRange ? `- Date range: ${new Date(chatContext.dateRange.earliest).toLocaleDateString()} to ${new Date(chatContext.dateRange.latest).toLocaleDateString()}` : ''}
      ${chatContext.relationshipContext.anniversaryDate ? `- Anniversary date: ${chatContext.relationshipContext.anniversaryDate}` : ''}
      ${chatContext.relationshipContext.relationshipStartDate ? `- Relationship start date: ${chatContext.relationshipContext.relationshipStartDate}` : ''}
      
      RECENT MESSAGES (newest last):
      ${formattedMessages.map(m => `${m.sender} (${new Date(m.timestamp).toLocaleString()}): ${m.text}`).join('\n')}
      
      USER QUERY:
      ${query}
      
      Please provide a helpful, warm, and couple-friendly response. Use emoji occasionally for warmth. If you don't have enough information to answer accurately, acknowledge that limitation. Keep your response concise but informative.
    `;
    
    // Generate response using Gemini
    const response = await geminiService.geminiService.generateContent(prompt);
    
    // Add metadata about the analysis
    return response;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return "I'm sorry, I couldn't analyze your chat history right now. Please try again later.";
  }
}

/**
 * Processes an incoming message and returns an AI response if it's a query
 * 
 * @param {string} messageText - The text of the message
 * @param {string} chatId - The ID of the chat
 * @param {string} senderId - The ID of the sender
 * @returns {Promise<{isAIQuery: boolean, aiResponse?: string}>}
 */
async function processIncomingMessage(messageText, chatId, senderId) {
  const analysis = await analyzeMessageIntent(messageText, chatId, senderId);
  
  if (analysis.intent === INTENT.AI_QUERY) {
    return {
      isAIQuery: true,
      aiResponse: analysis.aiResponse
    };
  }
  
  if (analysis.intent === INTENT.UNCLEAR && analysis.confidence < 0.7) {
    // For unclear intents with low confidence, we could:
    // 1. Return nothing and treat as normal chat
    // 2. Generate a response but flag it as uncertain
    // 3. Ask for clarification
    
    // For now, we'll treat unclear low-confidence cases as normal chat
    return { isAIQuery: false };
  }
  
  return { isAIQuery: false };
}

module.exports = {
  analyzeMessageIntent,
  processIncomingMessage,
  INTENT
};

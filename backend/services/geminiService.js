const fetch = require('node-fetch');

class GeminiService {
  constructor(apiKey, model) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    // Use the correct model name for Gemini 2.5 Flash
    this.model =
      model ||
      process.env.GEMINI_MODEL ||
      'gemini-2.5-flash';

    // Official Google AI API endpoint
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }

  // Helper to make API calls with the official Google format
  async generateContent(prompt, systemInstruction = '', chatHistory = []) {
    try {
      // Build the contents array with proper format
      const contents = [];
      
      // Add system instruction as the first user message if provided
      if (systemInstruction) {
        contents.push({
          role: 'user',
          parts: [{ text: systemInstruction }]
        });
        contents.push({
          role: 'model',
          parts: [{ text: "I understand. I'll help you with that." }]
        });
      }
      
      // Add chat history if provided
      chatHistory.forEach(msg => {
        contents.push({
          role: msg.role || 'user',
          parts: [{ text: msg.content }]
        });
      });
      
      // Add the current prompt
      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH', 
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE'
            }
          ]
        })
      });

      // Surface non-2xx HTTP errors early
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `Gemini API HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  // NEW: Conversational AI that can answer questions about chat history
  async askAboutChatHistory(question, chatMessages, chatMetadata) {
    const systemInstruction = `You are a knowledgeable AI assistant for a couple's chat application. 
You have access to their complete chat history and can answer questions about their conversations, patterns, memories, and activities.

Be warm, supportive, and conversational in your responses. Use emojis occasionally to make it feel more personal.
When providing statistics or dates, be specific and accurate.
If you don't have enough information to answer a question, say so politely and suggest what kind of information would help.`;

    // Prepare context from chat history
    const chatContext = this.prepareChatContext(chatMessages, chatMetadata);
    
    const prompt = `Based on the chat history and metadata below, please answer this question: "${question}"

${chatContext}

Please provide a helpful, accurate, and engaging response.`;

    return await this.generateContent(prompt, systemInstruction);
  }

  // Helper to prepare chat context for AI analysis
  prepareChatContext(messages, metadata) {
    const sortedMessages = messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const totalMessages = messages.length;
    
    // Get basic statistics
    const messagesBySender = {};
    const messagesByDate = {};
    const wordCounts = {};
    
    messages.forEach(msg => {
      // Count by sender
      const senderName = msg.sender?.name || 'Unknown';
      messagesBySender[senderName] = (messagesBySender[senderName] || 0) + 1;
      
      // Count by date
      const date = new Date(msg.createdAt).toDateString();
      if (!messagesByDate[date]) messagesByDate[date] = [];
      messagesByDate[date].push(msg);
      
      // Count words
      const words = msg.content.text.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });
    
    // Get recent messages sample
    const recentMessages = sortedMessages.slice(-50).map(msg => {
      return `[${new Date(msg.createdAt).toLocaleDateString()}] ${msg.sender?.name}: ${msg.content.text}`;
    }).join('\n');
    
    // Get first and last message dates
    const firstMessage = sortedMessages[0];
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    
    return `
=== CHAT STATISTICS ===
Total Messages: ${totalMessages}
Participants: ${Object.keys(messagesBySender).join(', ')}
Messages by Sender: ${Object.entries(messagesBySender).map(([name, count]) => `${name}: ${count}`).join(', ')}
First Message: ${firstMessage ? new Date(firstMessage.createdAt).toLocaleDateString() : 'N/A'}
Last Message: ${lastMessage ? new Date(lastMessage.createdAt).toLocaleDateString() : 'N/A'}
Total Days with Messages: ${Object.keys(messagesByDate).length}

=== CHAT METADATA ===
Relationship Start: ${metadata?.relationshipStartDate || 'Not set'}
Anniversary Date: ${metadata?.anniversaryDate || 'Not set'}
Chat Theme: ${metadata?.theme || 'classic'}

=== SAMPLE RECENT MESSAGES ===
${recentMessages}

=== TOP WORDS USED ===
${Object.entries(wordCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([word, count]) => `${word}: ${count}`)
  .join(', ')}

=== MESSAGES BY DATE (last 10 days) ===
${Object.entries(messagesByDate)
  .slice(-10)
  .map(([date, msgs]) => `${date}: ${msgs.length} messages`)
  .join('\n')}
    `;
  }

  // Enhanced method with chat context for better insights
  async analyzeRelationshipHealthWithContext(messages, stats, chatMetadata) {
    const systemInstruction = `You are a relationship counselor AI specializing in analyzing couple communication patterns. 
Be supportive, positive, and constructive in your analysis. Focus on strengths while gently suggesting improvements.
Provide specific insights based on the actual chat data provided.`;

    const chatContext = this.prepareChatContext(messages, chatMetadata);
    
    const prompt = `Analyze this couple's relationship based on their chat data:

${chatContext}

Provide insights in this exact JSON format:
{
  "healthScore": 8,
  "communicationPatterns": ["pattern1", "pattern2"],
  "positiveObservations": ["observation1", "observation2"],
  "areasForGrowth": ["area1", "area2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

    const analysis = await this.generateContent(prompt, systemInstruction);
    return this.parseRelationshipAnalysis(analysis);
  }

  // Analyze chat sentiment and relationship health
  async analyzeRelationshipHealth(messages, stats) {
    const systemInstruction = `You are a relationship counselor AI specializing in analyzing couple communication patterns. 
    Be supportive, positive, and constructive in your analysis. Focus on strengths while gently suggesting improvements.`;

    const prompt = `Analyze this couple's chat data and provide insights:

Total Messages: ${stats.totalMessages}
Average Messages Per Day: ${stats.avgMessagesPerDay}
Message Balance: ${stats.messagesBySender.map(s => `${s.sender.name}: ${s.count} messages`).join(', ')}

Recent message samples:
${messages.slice(0, 20).map(m => `${m.sender}: ${m.content.text}`).join('\n')}

Please provide:
1. Overall relationship health score (1-10)
2. Communication pattern analysis
3. Positive observations
4. Areas for growth
5. Specific suggestions for better communication`;

    const analysis = await this.generateContent(prompt, systemInstruction);
    return this.parseRelationshipAnalysis(analysis);
  }

  // Generate conversation starters
  async generateConversationStarters(chatMetadata, recentTopics) {
    const systemInstruction = `You are a romantic relationship expert who creates meaningful conversation starters for couples. 
    Be creative, thoughtful, and appropriate for couples in committed relationships.`;

    const prompt = `Create 5 unique conversation starters for a couple with these characteristics:
${chatMetadata.anniversaryDate ? `Anniversary: ${chatMetadata.anniversaryDate}` : ''}
${chatMetadata.relationshipStartDate ? `Together since: ${chatMetadata.relationshipStartDate}` : ''}
Recent topics discussed: ${recentTopics.join(', ')}

Create conversation starters that:
- Deepen emotional connection
- Are fun and engaging
- Explore shared dreams and goals
- Celebrate their relationship
- Encourage meaningful dialogue`;

    const response = await this.generateContent(prompt, systemInstruction);
    return this.parseConversationStarters(response);
  }

  // Analyze emoji usage and suggest fun responses
  async analyzeEmojiMeaning(emojiStats, context) {
    const systemInstruction = `You are a playful communication expert who understands emoji usage in romantic relationships. 
    Be fun, lighthearted, and insightful about what emoji patterns reveal about the couple.`;

    const prompt = `Analyze this couple's emoji usage:
Top emojis used: ${emojiStats.topEmojis.slice(0, 10).map(e => `${e.emoji} (${e.count}x)`).join(', ')}
Context: Recent chat about "${context}"

Provide:
1. What their emoji choices say about their relationship
2. Fun observations about their communication style
3. Suggested emojis they might enjoy using
4. A playful "emoji horoscope" for their relationship`;

    const response = await this.generateContent(prompt, systemInstruction);
    return this.parseEmojiAnalysis(response);
  }

  // Generate personalized date ideas
  async generateDateIdeas(chatHistory, interests, location = 'local') {
    const systemInstruction = `You are a romantic date planning expert who creates personalized, creative date ideas for couples. 
    Consider their interests, communication style, and relationship dynamic.`;

    const prompt = `Based on this couple's chat history and interests, suggest 5 unique date ideas:
Interests mentioned: ${interests.join(', ')}
Location preference: ${location}

Create date ideas that are:
- Personalized to their interests
- Mix of romantic, adventurous, and cozy options
- Varying in budget (free to special occasion)
- Detailed with specific suggestions
- Including conversation topics for each date`;

    const response = await this.generateContent(prompt, systemInstruction);
    return this.parseDateIdeas(response);
  }

  // Summarize important moments
  async summarizeMemories(messages, timeframe) {
    const systemInstruction = `You are a thoughtful AI that helps couples cherish their memories. 
    Create beautiful, emotional summaries that capture the essence of their conversations and moments together.`;

    const prompt = `Create a beautiful summary of this couple's memories from ${timeframe}:

Sample messages:
${messages.map(m => `[${new Date(m.createdAt).toLocaleDateString()}] ${m.sender}: ${m.content.text}`).join('\n')}

Write a heartfelt summary that:
- Captures key moments and conversations
- Highlights emotional milestones
- Uses poetic but accessible language
- Celebrates their journey together
- Ends with an inspiring message about their future`;

    const response = await this.generateContent(prompt, systemInstruction);
    return this.parseMemorySummary(response);
  }

  // Helper methods to parse responses
  parseRelationshipAnalysis(response) {
    try {
      // First try to parse as JSON
      return JSON.parse(response);
    } catch (e) {
      // Fall back to simple parsing
      const lines = response.split('\n');
      const analysis = {
        healthScore: 8,
        communicationPatterns: [],
        positiveObservations: [],
        areasForGrowth: [],
        suggestions: []
      };

      let currentSection = '';
      lines.forEach(line => {
        if (line.includes('score') && line.match(/\d+/)) {
          analysis.healthScore = parseInt(line.match(/\d+/)[0]);
        } else if (line.toLowerCase().includes('pattern')) {
          currentSection = 'patterns';
        } else if (line.toLowerCase().includes('positive')) {
          currentSection = 'positive';
        } else if (line.toLowerCase().includes('growth')) {
          currentSection = 'growth';
        } else if (line.toLowerCase().includes('suggestion')) {
          currentSection = 'suggestions';
        } else if (line.trim()) {
          switch (currentSection) {
            case 'patterns':
              analysis.communicationPatterns.push(line.trim());
              break;
            case 'positive':
              analysis.positiveObservations.push(line.trim());
              break;
            case 'growth':
              analysis.areasForGrowth.push(line.trim());
              break;
            case 'suggestions':
              analysis.suggestions.push(line.trim());
              break;
          }
        }
      });

      return analysis;
    }
  }

  parseConversationStarters(response) {
    const lines = response.split('\n').filter(line => line.trim());
    const starters = [];
    
    lines.forEach(line => {
      // Look for numbered items or bullet points
      if (line.match(/^\d+\.|^-|^•/) && line.length > 10) {
        starters.push(line.replace(/^\d+\.|^-|^•/, '').trim());
      }
    });

    return starters.slice(0, 5);
  }

  parseEmojiAnalysis(response) {
    return {
      analysis: response,
      insights: response.split('\n').filter(line => line.trim()).slice(0, 4)
    };
  }

  parseDateIdeas(response) {
    const lines = response.split('\n').filter(line => line.trim());
    const ideas = [];
    let currentIdea = null;

    lines.forEach(line => {
      if (line.match(/^\d+\.|Date Idea/i)) {
        if (currentIdea) ideas.push(currentIdea);
        currentIdea = {
          title: line.replace(/^\d+\.|Date Idea:?/i, '').trim(),
          description: '',
          conversationTopics: []
        };
      } else if (currentIdea) {
        if (line.toLowerCase().includes('conversation') || line.toLowerCase().includes('talk about')) {
          currentIdea.conversationTopics.push(line.trim());
        } else {
          currentIdea.description += line.trim() + ' ';
        }
      }
    });

    if (currentIdea) ideas.push(currentIdea);
    return ideas.slice(0, 5);
  }

  parseMemorySummary(response) {
    return {
      summary: response,
      highlights: response.split('\n')
        .filter(line => line.trim())
        .filter(line => line.includes('❤️') || line.includes('💕') || line.includes('✨'))
    };
  }
}

// Create and export a singleton instance
const geminiService = new GeminiService();

// Export both the class and instance
module.exports = {
  GeminiService,
  geminiService
};

import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextApiRequest, NextApiResponse } from 'next';

// Set the API key as environment variable
process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;

// Allow streaming responses up to 30 seconds
export const config = {
  maxDuration: 30,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  // Validate input
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  try {
    // Enhanced romantic couple chat system prompt
    const systemPrompt = `You are a romantic AI assistant for couples, writing in a tropical vintage journal style. 

    🌴 **Persona**: A wise, warm, and romantic companion who understands the beauty of love and relationships.

    📖 **Style Guidelines**:
    - Write in a vintage journal style with warm, handwritten feel
    - Use romantic, tropical imagery and metaphors
    - Be encouraging, supportive, and understanding
    - Include gentle relationship advice when appropriate
    - Use emojis sparingly but meaningfully
    - Keep responses conversational and intimate

    💕 **Relationship Focus**:
    - Help couples communicate better
    - Suggest romantic date ideas and activities
    - Provide relationship advice and support
    - Help resolve conflicts with love and understanding
    - Celebrate relationship milestones and memories

    🌺 **Tone**: Warm, romantic, wise, supportive, and encouraging with a vintage tropical journal aesthetic.

    Remember: You're writing in their shared digital journal, so make it feel special and personal.`;

    const result = await streamText({
      model: google('gemini-2.0-flash-exp'),
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      maxTokens: 1000,
    });

    // Return the stream response
    return result.toDataStreamResponse();

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
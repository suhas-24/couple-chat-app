import React, { useState } from 'react';
import { api } from '@/services/api';
import { MessageSquare, Bot, Send } from 'lucide-react';

export default function TestAI() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testAI = async () => {
    if (!question.trim()) return;
    
    setLoading(true);
    setError('');
    setResponse('');
    
    try {
      // Test with a dummy chat ID
      const result = await api.ai.askAboutChatHistory('test-chat-id', question);
      
      if (result.success) {
        setResponse(result.answer);
      } else {
        setError('AI request failed: ' + (result.metadata?.error || 'Unknown error'));
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#F3F0E8' }}>
      {/* TropicTalk Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b-2 border-dashed border-[var(--brand-accent)] px-10 py-4 bg-paper">
        <div className="flex items-center gap-4 text-[var(--brand-primary)]">
          <Bot className="h-8 w-8 text-[var(--brand-primary)]" />
          <h1 className="text-[var(--brand-primary)] text-2xl font-bold tracking-wider font-typewriter">
            AI Test Page
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-[var(--brand-text-dark)] tracking-tight font-typewriter">
              Test AI Functionality
            </h2>
            <p className="mt-3 text-lg text-[var(--brand-primary)] font-typewriter">
              Test the AI integration to see if it's working properly.
            </p>
          </div>

          <div className="bg-paper shadow-lg rounded-xl p-8 border-2 border-[var(--brand-accent)]">
            <div className="space-y-6">
              {/* Test Input */}
              <div>
                <label className="block text-sm font-medium text-[var(--brand-text-dark)] mb-2 font-typewriter">
                  Ask AI a Question
                </label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g., Give me romantic date ideas"
                    className="flex-1 px-4 py-3 bg-white/50 border-2 border-dashed border-[var(--brand-accent)] rounded-lg text-[var(--brand-text-dark)] placeholder-[var(--brand-accent)] focus:outline-none focus:border-[var(--brand-primary)] transition font-typewriter"
                  />
                  <button
                    onClick={testAI}
                    disabled={loading || !question.trim()}
                    className="stamp-button px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--brand-text-dark)] border-t-transparent"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Test Buttons */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--brand-text-dark)] font-typewriter">Quick Tests:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setQuestion('Give me romantic date ideas')}
                    className="text-xs px-3 py-1 bg-white/30 border border-dashed border-[var(--brand-accent)] rounded-full text-[var(--brand-primary)] hover:bg-white/50 transition font-typewriter"
                  >
                    Date Ideas
                  </button>
                  <button
                    onClick={() => setQuestion('Give me relationship advice')}
                    className="text-xs px-3 py-1 bg-white/30 border border-dashed border-[var(--brand-accent)] rounded-full text-[var(--brand-primary)] hover:bg-white/50 transition font-typewriter"
                  >
                    Relationship Advice
                  </button>
                  <button
                    onClick={() => setQuestion('Help with communication')}
                    className="text-xs px-3 py-1 bg-white/30 border border-dashed border-[var(--brand-accent)] rounded-full text-[var(--brand-primary)] hover:bg-white/50 transition font-typewriter"
                  >
                    Communication Help
                  </button>
                </div>
              </div>

              {/* Response */}
              {response && (
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-dashed border-purple-300 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Bot className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-600 font-typewriter">TropicTalk AI Response:</span>
                  </div>
                  <p className="text-[var(--brand-text-dark)] font-typewriter whitespace-pre-wrap">{response}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-100 border-2 border-dashed border-red-300 rounded-lg p-4">
                  <p className="text-red-600 font-typewriter">{error}</p>
                </div>
              )}

              {/* Backend Status */}
              <div className="text-center">
                <p className="text-xs text-[var(--brand-accent)] font-typewriter">
                  Backend should be running on http://localhost:5001
                </p>
                <p className="text-xs text-[var(--brand-accent)] font-typewriter">
                  Gemini API Key: {process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'Configured' : 'Not configured'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
import React from 'react';
import { MessageSquare, Heart, Upload, Bot } from 'lucide-react';

export default function TestTheme() {
  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#F3F0E8' }}>
      {/* TropicTalk Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b-2 border-dashed border-[var(--brand-accent)] px-10 py-4 bg-paper">
        <div className="flex items-center gap-4 text-[var(--brand-primary)]">
          <MessageSquare className="h-8 w-8 text-[var(--brand-primary)]" />
          <h1 className="text-[var(--brand-primary)] text-2xl font-bold tracking-wider font-typewriter">
            TropicTalk
          </h1>
        </div>
        
        <nav className="flex items-center gap-8">
          <span className="text-[var(--brand-text-dark)] font-bold border-b-2 border-[var(--brand-primary)] pb-1 text-lg">
            Theme Test
          </span>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-[var(--brand-text-dark)] tracking-tight font-typewriter">
              TropicTalk Theme Test
            </h2>
            <p className="mt-3 text-lg text-[var(--brand-primary)] font-typewriter">
              Testing the beautiful vintage tropical design.
            </p>
          </div>

          <div className="bg-paper shadow-lg rounded-xl p-8 border-2 border-[var(--brand-accent)]">
            <div className="space-y-6">
              {/* Test Buttons */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-[var(--brand-text-dark)] font-typewriter">
                  Stamp Buttons
                </h3>
                <div className="flex flex-wrap gap-4">
                  <button className="stamp-button">
                    <Heart className="w-4 h-4 inline mr-2" />
                    Love Button
                  </button>
                  <button className="stamp-button">
                    <Upload className="w-4 h-4 inline mr-2" />
                    Upload File
                  </button>
                  <button className="stamp-button">
                    <Bot className="w-4 h-4 inline mr-2" />
                    Ask AI
                  </button>
                </div>
              </div>

              {/* Test Form */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-[var(--brand-text-dark)] font-typewriter">
                  Form Elements
                </h3>
                <input
                  type="text"
                  placeholder="Test input field"
                  className="w-full px-4 py-3 bg-white/50 border-2 border-dashed border-[var(--brand-accent)] rounded-lg text-[var(--brand-text-dark)] placeholder-[var(--brand-accent)] focus:outline-none focus:border-[var(--brand-primary)] transition font-typewriter"
                />
                <textarea
                  placeholder="Test textarea"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/50 border-2 border-dashed border-[var(--brand-accent)] rounded-lg text-[var(--brand-text-dark)] placeholder-[var(--brand-accent)] focus:outline-none focus:border-[var(--brand-primary)] transition font-typewriter resize-none"
                />
              </div>

              {/* Test Typography */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-[var(--brand-text-dark)] font-typewriter">
                  Typography
                </h3>
                <p className="text-[var(--brand-text-dark)] font-typewriter">
                  This is Special Elite typewriter font - perfect for the vintage tropical theme.
                </p>
                <p className="text-[var(--brand-primary)]">
                  This is Plus Jakarta Sans in brand primary color.
                </p>
                <p className="text-[var(--brand-accent)]">
                  This is the accent color for subtle elements.
                </p>
              </div>

              {/* Test Colors */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-[var(--brand-text-dark)] font-typewriter">
                  Color Palette
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-lg mb-2" style={{ backgroundColor: 'var(--brand-primary)' }}></div>
                    <p className="text-xs font-typewriter">Primary</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-lg mb-2 border-2 border-[var(--brand-accent)]" style={{ backgroundColor: 'var(--brand-secondary)' }}></div>
                    <p className="text-xs font-typewriter">Secondary</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-lg mb-2" style={{ backgroundColor: 'var(--brand-accent)' }}></div>
                    <p className="text-xs font-typewriter">Accent</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-lg mb-2" style={{ backgroundColor: 'var(--brand-text-dark)' }}></div>
                    <p className="text-xs font-typewriter">Text Dark</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-lg mb-2 border-2 border-[var(--brand-accent)]" style={{ backgroundColor: 'var(--brand-text-light)' }}></div>
                    <p className="text-xs font-typewriter">Text Light</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
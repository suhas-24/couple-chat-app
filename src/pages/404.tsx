import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { MessageSquare, Heart, ArrowLeft, Home } from 'lucide-react';

export default function Custom404() {
  const router = useRouter();

  useEffect(() => {
    // Log 404 errors for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.warn(`404 Error: Page not found - ${router.asPath}`);
    }
  }, [router.asPath]);

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
      </header>

      {/* Main Content */}
      <main className="flex flex-1 justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          <div className="bg-paper shadow-lg rounded-xl p-8 border-2 border-[var(--brand-accent)] text-center">
            <div className="mb-8">
              <h1 className="text-6xl font-bold text-[var(--brand-primary)] mb-4 font-typewriter">
                🌴
              </h1>
              <h2 className="text-3xl font-bold text-[var(--brand-text-dark)] mb-2 font-typewriter">
                Oops! Page Not Found
              </h2>
              <p className="text-[var(--brand-primary)] mb-6 font-typewriter">
                Looks like this page got lost in the tropical breeze. Let's get you back to your conversations!
              </p>
            </div>

            <div className="space-y-4">
              <Link
                href="/chat"
                className="stamp-button inline-block px-8 py-3 text-lg"
              >
                <MessageSquare className="w-5 h-5 inline mr-2" />
                Back to Chat
              </Link>
              
              <div className="flex justify-center space-x-4 text-sm">
                <Link
                  href="/"
                  className="text-[var(--brand-primary)] hover:text-[var(--brand-text-dark)] transition-colors font-typewriter flex items-center space-x-1"
                >
                  <Home className="w-4 h-4" />
                  <span>Go Home</span>
                </Link>
                <span className="text-[var(--brand-accent)]">•</span>
                <button
                  onClick={() => router.back()}
                  className="text-[var(--brand-primary)] hover:text-[var(--brand-text-dark)] transition-colors font-typewriter flex items-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Go Back</span>
                </button>
              </div>
            </div>

            <div className="mt-8 text-xs text-[var(--brand-accent)] font-typewriter">
              Error Code: 404
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
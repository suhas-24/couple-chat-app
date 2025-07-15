import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Heart, Mail, Lock, MessageSquare } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/chat');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

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
            Login
          </span>
          <Link href="/signup" className="text-[var(--brand-primary)] font-semibold hover:text-[var(--brand-text-dark)] transition-colors duration-300 text-lg">
            Sign Up
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-[var(--brand-text-dark)] tracking-tight font-typewriter">
              Welcome Back
            </h2>
            <p className="mt-3 text-lg text-[var(--brand-primary)] font-typewriter">
              Continue your beautiful conversation journey.
            </p>
          </div>

          <div className="bg-paper shadow-lg rounded-xl p-8 border-2 border-[var(--brand-accent)]">

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--brand-text-dark)] mb-2 font-typewriter">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--brand-accent)]" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/50 border-2 border-dashed border-[var(--brand-accent)] rounded-lg text-[var(--brand-text-dark)] placeholder-[var(--brand-accent)] focus:outline-none focus:border-[var(--brand-primary)] transition font-typewriter"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--brand-text-dark)] mb-2 font-typewriter">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--brand-accent)]" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/50 border-2 border-dashed border-[var(--brand-accent)] rounded-lg text-[var(--brand-text-dark)] placeholder-[var(--brand-accent)] focus:outline-none focus:border-[var(--brand-primary)] transition font-typewriter"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400 font-typewriter">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="stamp-button w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Welcome Back'}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-[var(--brand-primary)] font-typewriter">
                Don't have an account?{' '}
                <Link href="/signup" className="text-[var(--brand-text-dark)] hover:text-[var(--brand-primary)] font-semibold transition underline">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

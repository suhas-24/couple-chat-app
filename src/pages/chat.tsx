import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import TropicalVintageChat from '@/components/chat/TropicalVintageChat';
import { Heart, ArrowLeft, Menu, Sparkles } from 'lucide-react';

export default function ChatPage() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F3F0E8' }}>
        <div className="bg-paper rounded-xl p-8 text-center border-2 border-[var(--brand-accent)]">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[var(--brand-text-dark)] font-typewriter">
            Loading TropicTalk...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffeabf] to-[#d2f2ef] relative">
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-[#e0dacd] px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 text-[#3d2b1f] hover:bg-[#fdf6e3] rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#ff6b6b] animate-pulse" />
            <span className="text-[#3d2b1f] font-medium" style={{ fontFamily: 'Caveat, cursive' }}>
              Love Journal
            </span>
          </div>
          
          <button
            onClick={logout}
            className="p-2 text-[#3d2b1f] hover:bg-[#fdf6e3] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:flex lg:flex-col">
        <div className="vintage-paper border-r border-[#e0dacd] h-full flex flex-col">
          {/* Sidebar header */}
          <div className="p-6 border-b border-[#e0dacd]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ff6b6b] to-[#ff922b] rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-[#3d2b1f] font-bold" style={{ fontFamily: 'Caveat, cursive' }}>
                  Love Journal
                </h2>
                <p className="text-[#5f4b32] text-sm opacity-70">
                  AI-powered relationship companion
                </p>
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="p-6 border-b border-[#e0dacd]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#5ca4a9] rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.name?.charAt(0) || user.email?.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-[#3d2b1f] font-medium text-sm" style={{ fontFamily: 'Kalam, cursive' }}>
                  {user.name || 'User'}
                </p>
                <p className="text-[#5f4b32] text-xs opacity-70">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="flex-1 p-6">
            <div className="space-y-3">
              <div className="sticky-note p-3 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#ff6b6b]" />
                  <span className="font-medium text-[#3d2b1f]" style={{ fontFamily: 'Kalam, cursive' }}>
                    AI Features
                  </span>
                </div>
                <ul className="text-[#5f4b32] text-xs space-y-1">
                  <li>• Romantic advice & tips</li>
                  <li>• Relationship guidance</li>
                  <li>• Date idea suggestions</li>
                  <li>• Communication help</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Logout button */}
          <div className="p-6 border-t border-[#e0dacd]">
            <button
              onClick={logout}
              className="vintage-button secondary w-full"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobileMenu(false)}>
          <div className="w-64 h-full bg-[#fdf6e3] border-r border-[#e0dacd] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ff6b6b] to-[#ff922b] rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-[#3d2b1f] font-bold" style={{ fontFamily: 'Caveat, cursive' }}>
                  Love Journal
                </h2>
                <p className="text-[#5f4b32] text-sm opacity-70">
                  {user.name || user.email}
                </p>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="vintage-button secondary w-full"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        <TropicalVintageChat />
      </div>
    </div>
  );
}

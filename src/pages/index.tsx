import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { Heart, Coffee, Sparkles } from 'lucide-react';

const IndexPage: React.FC = () => {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/chat');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffeabf] to-[#d2f2ef] flex items-center justify-center relative overflow-hidden">
      {/* Tropical background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-16 h-16 bg-[#51cf66] rounded-full opacity-20 blur-xl animate-pulse"></div>
        <div className="absolute top-32 right-20 w-12 h-12 bg-[#ff6b6b] rounded-full opacity-20 blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/3 w-20 h-20 bg-[#4299e1] rounded-full opacity-20 blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="text-center relative z-10">
        <div className="vintage-paper rounded-xl p-8 shadow-lg">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Heart className="w-8 h-8 text-[#ff6b6b] animate-pulse" />
            <h1 className="text-3xl font-bold text-[#3d2b1f]" style={{ fontFamily: 'Caveat, cursive' }}>
              Tropical Love Journal
            </h1>
            <Sparkles className="w-8 h-8 text-[#51cf66] animate-pulse" />
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-6">
            <Coffee className="w-5 h-5 text-[#5ca4a9] animate-bounce" />
            <p className="text-[#5f4b32] opacity-70" style={{ fontFamily: 'Kalam, cursive' }}>
              {loading ? 'Brewing your love story...' : 'Redirecting to your journal...'}
            </p>
          </div>
          
          <div className="animate-spin w-8 h-8 border-2 border-[#5ca4a9] border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default IndexPage;

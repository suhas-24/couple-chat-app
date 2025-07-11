import React from 'react';
import LoginForm from '../components/auth/LoginForm';
import SignupForm from '../components/auth/SignupForm';

const IndexPage: React.FC = () => {
  const [isLogin, setIsLogin] = React.useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-pink-600 flex items-center gap-2">
              💕 Couple Chat
            </h1>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-600 hover:text-pink-600 transition-colors">
                Features
              </a>
              <a href="#" className="text-gray-600 hover:text-pink-600 transition-colors">
                About
              </a>
              <a href="#" className="text-gray-600 hover:text-pink-600 transition-colors">
                Contact
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        {/* Left Side - Hero Section */}
        <div className="lg:w-1/2 flex items-center justify-center p-8">
          <div className="max-w-md text-center lg:text-left">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
              Share Your Love Story
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              A charming chat app designed for couples to share precious moments, 
              upload chat history, and get AI-powered insights about your relationship.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/70 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">💬</div>
                <div className="text-sm font-medium text-gray-700">CSV Upload</div>
              </div>
              <div className="bg-white/70 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">🤖</div>
                <div className="text-sm font-medium text-gray-700">AI Insights</div>
              </div>
              <div className="bg-white/70 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">🌍</div>
                <div className="text-sm font-medium text-gray-700">Multi-Language</div>
              </div>
              <div className="bg-white/70 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm font-medium text-gray-700">Analytics</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <div className="lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8">
              {/* Form Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    isLogin
                      ? 'bg-white text-pink-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    !isLogin
                      ? 'bg-white text-pink-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Form Content */}
              {isLogin ? <LoginForm /> : <SignupForm />}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-600">
            <p>© 2025 Couple Chat App. Made with 💕 for couples everywhere.</p>
            <p className="text-sm mt-2">Created with Comet Assistant</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IndexPage;

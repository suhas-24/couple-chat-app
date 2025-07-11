import React, { useState } from 'react';

interface SignupFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  partnerCode?: string;
}

interface SignupFormProps {
  onSubmit: (data: SignupFormData) => void;
  isLoading?: boolean;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSubmit, isLoading = false }) => {
  const [formData, setFormData] = useState<SignupFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    partnerCode: ''
  });

  const [errors, setErrors] = useState<Partial<SignupFormData>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<SignupFormData> = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof SignupFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <span className="text-4xl">💕</span>
            <h1 className="text-3xl font-bold text-gray-800 mx-2">CoupleChat</h1>
            <span className="text-4xl">💕</span>
          </div>
          <p className="text-gray-600">Join our loving community</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-pink-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center">
                  <span className="mr-2">👤</span>
                  Username
                </span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none ${
                  errors.username 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-200 bg-white hover:border-pink-300'
                }`}
                placeholder="Choose a lovely username"
                disabled={isLoading}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {errors.username}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center">
                  <span className="mr-2">📧</span>
                  Email
                </span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none ${
                  errors.email 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-200 bg-white hover:border-pink-300'
                }`}
                placeholder="your.email@example.com"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center">
                  <span className="mr-2">🔒</span>
                  Password
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none ${
                    errors.password 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200 bg-white hover:border-pink-300'
                  }`}
                  placeholder="Create a secure password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-pink-500 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center">
                  <span className="mr-2">🔐</span>
                  Confirm Password
                </span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none ${
                    errors.confirmPassword 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200 bg-white hover:border-pink-300'
                  }`}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-pink-500 transition-colors"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Partner Code Field (Optional) */}
            <div>
              <label htmlFor="partnerCode" className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center">
                  <span className="mr-2">💑</span>
                  Partner Code <span className="text-gray-400 text-xs">(Optional)</span>
                </span>
              </label>
              <input
                type="text"
                id="partnerCode"
                name="partnerCode"
                value={formData.partnerCode}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-pink-300 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all duration-200"
                placeholder="Enter your partner's invite code"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">Connect with your partner instantly!</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <span className="mr-2">💖</span>
                  Create Account
                  <span className="ml-2">💖</span>
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <a href="/login" className="text-pink-500 hover:text-pink-600 font-medium transition-colors">
                Sign in here 💕
              </a>
            </p>
          </div>
        </div>

        {/* Bottom Message */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            <span className="mr-1">🌟</span>
            Start your beautiful journey together
            <span className="ml-1">🌟</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;

// Created with Comet Assistant

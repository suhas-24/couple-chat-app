import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import {
  Menu,
  X,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Heart,
  User,
  Upload,
  Bot,
  Home,
  ChevronDown,
  Bell,
  Search,
} from 'lucide-react';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  active?: boolean;
}

interface ResponsiveNavigationProps {
  className?: string;
}

const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({ className = '' }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { chats, unreadCount } = useChat();
  const router = useRouter();

  // Navigation items
  const navigationItems: NavigationItem[] = [
    {
      label: 'Home',
      href: '/',
      icon: Home,
      active: router.pathname === '/',
    },
    {
      label: 'Chat',
      href: '/chat',
      icon: MessageSquare,
      badge: unreadCount,
      active: router.pathname === '/chat',
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      active: router.pathname === '/analytics',
    },
  ];

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [router.pathname]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.mobile-menu') && !target.closest('.mobile-menu-button')) {
        setIsMobileMenuOpen(false);
      }
      if (!target.closest('.profile-menu') && !target.closest('.profile-menu-button')) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={`hidden lg:flex items-center justify-between bg-sidebar-bg border-b border-border-color px-6 py-4 ${className}`}>
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-pink-600 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-text-primary">CoupleChat</span>
        </div>

        {/* Navigation Items */}
        <div className="flex items-center space-x-1">
          {navigationItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                item.active
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-input-bg'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="profile-menu-button flex items-center space-x-3 p-2 rounded-lg hover:bg-input-bg transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-text-primary font-medium text-sm">{user?.name}</p>
              <p className="text-text-secondary text-xs">{user?.email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </button>

          {/* Profile Dropdown */}
          {isProfileMenuOpen && (
            <div className="profile-menu absolute right-0 top-full mt-2 w-64 bg-sidebar-bg border border-border-color rounded-lg shadow-lg py-2 z-50">
              <div className="px-4 py-3 border-b border-border-color">
                <p className="text-text-primary font-medium">{user?.name}</p>
                <p className="text-text-secondary text-sm">{user?.email}</p>
              </div>
              <button
                onClick={() => handleNavigation('/settings')}
                className="w-full flex items-center space-x-3 px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-input-bg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-input-bg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Navigation Header */}
      <nav className="lg:hidden flex items-center justify-between bg-sidebar-bg border-b border-border-color px-4 py-3">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="mobile-menu-button p-2 rounded-lg hover:bg-input-bg transition-colors"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-text-primary" />
          ) : (
            <Menu className="w-6 h-6 text-text-primary" />
          )}
        </button>

        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-gradient-to-br from-primary to-pink-600 rounded-lg flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-text-primary">CoupleChat</span>
        </div>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-input-bg transition-colors relative">
          <Bell className="w-5 h-5 text-text-secondary" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="mobile-menu bg-sidebar-bg w-80 h-full shadow-xl">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-color">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-text-primary font-medium">{user?.name}</p>
                  <p className="text-text-secondary text-sm">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-input-bg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="py-4">
              {navigationItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className={`w-full flex items-center space-x-3 px-6 py-3 transition-colors ${
                    item.active
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:text-text-primary hover:bg-input-bg'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Menu Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border-color">
              <button
                onClick={() => handleNavigation('/settings')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-input-bg rounded-lg transition-colors mb-2"
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-input-bg rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation (Mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-sidebar-bg border-t border-border-color px-4 py-2 pb-safe-bottom z-40">
        <div className="flex items-center justify-around">
          {navigationItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={`relative flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                item.active
                  ? 'text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default ResponsiveNavigation;
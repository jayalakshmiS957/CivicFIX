import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useLanguage } from '../hooks/useLanguage.jsx';
import NotificationBell from './NotificationBell.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import {
  ShieldAlert,
  Home,
  PlusCircle,
  MapPin,
  Building2,
  FolderOpen,
  LayoutDashboard,
  LogIn,
  LogOut,
  User,
  Menu,
  X,
  UserPlus,
  HelpCircle,
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : 'Citizen';

  // Navigation links available when logged in
  const navLinks = [
    { name: t('navHome'), path: '/', icon: Home },
    ...(!isAdmin
      ? [{ name: t('navReport'), path: '/report', icon: PlusCircle }]
      : []),
    { name: t('navMap'), path: '/map', icon: MapPin },
    { name: t('navDepartments'), path: '/departments', icon: Building2 },
    ...(!isAdmin
      ? [{ name: t('navMyComplaints'), path: '/my-complaints', icon: FolderOpen }]
      : []),
    ...(isAdmin
      ? [{ name: t('navAdmin'), path: '/admin', icon: LayoutDashboard }]
      : []),
    { name: t('navHelp'), path: '/help', icon: HelpCircle },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#DADCE0] shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <Link
            to={isAuthenticated ? '/' : '/login'}
            className="flex items-center gap-2.5 text-[#202124] group focus:rounded-md"
            aria-label="CivicResolve Home"
          >
            <div className="w-10 h-10 rounded-lg bg-[#188038] flex items-center justify-center text-white shadow-sm group-hover:bg-[#137333] transition-colors shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-heading font-medium text-xl tracking-tight text-[#202124]">
                Civic<span className="text-[#188038]">Resolve</span>
              </span>
              <span className="hidden sm:block text-[12px] font-normal text-[#5F6368] tracking-tight truncate max-w-[280px] lg:max-w-none">
                {t('brandSubtitle')}
              </span>
            </div>
          </Link>

          {/* Logged-In Desktop Navigation */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const active = isActive(link.path);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-control text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#E6F4EA] text-[#188038]'
                        : 'text-[#202124] hover:bg-[#F8FAF8]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Auth & Language Controls (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher size="sm" />
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F1F3F4] text-xs text-[#202124] border border-[#DADCE0]">
                  <User className="w-3.5 h-3.5 text-[#188038]" />
                  <span className="font-medium max-w-[120px] truncate">{firstName}</span>
                  {isAdmin && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D93025] text-white">
                      ADMIN
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-control text-sm font-medium text-[#5F6368] hover:text-[#D93025] hover:bg-[#FCE8E6] transition-colors"
                  aria-label="Sign out of account"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('navLogout')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/help"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium text-[#5F6368] hover:text-[#188038] hover:bg-[#F8FAF8] transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#188038]" />
                  <span>{t('navHelp')}</span>
                </Link>
                {location.pathname === '/login' ? (
                  <Link
                    to="/register"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-control text-xs font-medium text-[#188038] bg-[#E6F4EA] hover:bg-[#CDE8D4] transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{t('navRegister')}</span>
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-control text-xs font-medium text-[#188038] bg-[#E6F4EA] hover:bg-[#CDE8D4] transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{t('navSignIn')}</span>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Mobile Header Controls */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher size="sm" />
            <Link
              to="/help"
              className="p-1.5 text-[#5F6368] hover:text-[#188038]"
              aria-label="Help & FAQ"
            >
              <HelpCircle className="w-4 h-4 text-[#188038]" />
            </Link>
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-md text-[#5F6368] hover:text-[#202124]"
                  aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            ) : (
              location.pathname === '/login' ? (
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-control text-xs font-medium text-[#188038] bg-[#E6F4EA]"
                >
                  {t('navRegister')}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-control text-xs font-medium text-[#188038] bg-[#E6F4EA]"
                >
                  {t('navSignIn')}
                </Link>
              )
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown (Only when authenticated) */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="md:hidden border-t border-[#DADCE0] bg-white px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium ${
                  active
                    ? 'bg-[#E6F4EA] text-[#188038]'
                    : 'text-[#202124] hover:bg-[#F8FAF8]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.name}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-[#DADCE0]">
            <div className="space-y-2">
              <div className="px-3 py-1.5 text-xs text-[#5F6368]">
                Signed in as <strong className="text-[#202124]">{firstName}</strong> ({user?.role})
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#D93025] bg-[#FCE8E6]"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('navLogout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

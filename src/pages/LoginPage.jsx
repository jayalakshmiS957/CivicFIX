import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { useLanguage } from '../hooks/useLanguage.jsx';
import { authApi } from '../lib/api.js';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { LogIn, Lock, Mail, ShieldCheck, Loader2, Sparkles, UserCheck, AlertCircle } from 'lucide-react';

const FALLBACK_DEMO_ACCOUNTS = [
  {
    name: 'Kavitha S.',
    email: 'citizen1@civicresolve.gov',
    password: 'Password@123',
    role: 'citizen',
    description: 'Active community reporter with multiple logged complaints',
  },
  {
    name: 'Ramesh K.',
    email: 'citizen2@civicresolve.gov',
    password: 'Password@123',
    role: 'citizen',
    description: 'Local neighborhood watch member in Saibaba Colony & RS Puram',
  },
  {
    name: 'City Admin',
    email: 'admin@civicresolve.gov',
    password: 'Admin@Civic2026!',
    role: 'admin',
    description: 'Full municipal triage & administrative override authority',
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoAccounts, setDemoAccounts] = useState(FALLBACK_DEMO_ACCOUNTS);

  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const messageParam = searchParams.get('message');

  const { user, login, sessionExpiredMessage, clearSessionExpired } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // If already authenticated, redirect to destination or home/admin
  useEffect(() => {
    if (user) {
      if (returnTo && returnTo !== '/' && returnTo !== '/login') {
        navigate(returnTo, { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, returnTo, navigate]);

  // Fetch demo accounts from backend single source of truth
  useEffect(() => {
    let isMounted = true;
    async function loadDemoAccounts() {
      try {
        const res = await authApi.getDemoAccounts();
        if (isMounted && res?.accounts?.length) {
          setDemoAccounts(res.accounts);
        }
      } catch {
        // Retain fallback accounts if request fails
      }
    }
    loadDemoAccounts();
    return () => {
      isMounted = false;
    };
  }, []);

  const fillCredentials = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
    if (clearSessionExpired) clearSessionExpired();
    showToast(`Loaded ${acc.name} (${acc.role}) credentials`, 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (clearSessionExpired) clearSessionExpired();
    setLoading(true);

    const result = await login({ email, password });
    setLoading(false);

    if (result.success) {
      showToast(`Welcome back, ${result.user.name}!`, 'success');
      if (returnTo && returnTo !== '/' && returnTo !== '/login') {
        navigate(returnTo);
      } else if (result.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } else {
      let rawErr = result?.error;
      let errMsg = 'Sign in failed, please try again';
      if (typeof rawErr === 'string' && rawErr.trim() && rawErr !== '[object Object]') {
        errMsg = rawErr;
      } else if (rawErr && typeof rawErr.message === 'string' && rawErr.message.trim() && rawErr.message !== '[object Object]') {
        errMsg = rawErr.message;
      }
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const sessionNotice = sessionExpiredMessage || messageParam;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 sm:py-12 overflow-hidden bg-gradient-to-b from-[#F1F8F3] to-[#FFFFFF]">
      {/* Decorative Hero Background Image (Cover, Bottom-aligned) */}
      <picture className="absolute inset-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <source srcSet="/images/civic-hero.webp" media="(min-width: 640px)" type="image/webp" />
        <source srcSet="/images/civic-hero-mobile.webp" type="image/webp" />
        <img
          src="/images/civic-hero.png"
          alt=""
          className="w-full h-full object-cover object-bottom opacity-25 sm:opacity-30"
          style={{ backgroundAttachment: 'scroll' }}
        />
      </picture>

      {/* Skyline Silhouette Gradient Fallback Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/70 to-transparent pointer-events-none -z-10" />

      {/* Main Sign-In Card on White Surface with 12px Radius and Soft Shadow */}
      <div className="bg-white rounded-[12px] p-6 sm:p-8 border border-[#DADCE0] shadow-card max-w-xl w-full relative z-10">
        {/* Language Switcher Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#DADCE0]">
          <span className="text-xs text-[#5F6368] font-medium">Select Language / மொழி:</span>
          <LanguageSwitcher size="sm" />
        </div>

        {/* Bilingual Brand Block */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#E6F4EA] text-[#188038] flex items-center justify-center mx-auto shadow-xs">
            <LogIn className="w-6 h-6" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-medium font-heading text-[#202124]">
            Civic<span className="text-[#188038]">Resolve</span>
          </h1>

          {/* Subtitles: Always visible in BOTH languages */}
          <div className="space-y-1 pt-1">
            <p className="text-[16px] sm:text-[17px] text-[#5F6368] font-normal leading-snug">
              Transforming Civic Complaints into Real-World Solutions
            </p>
            <p className="text-[15px] sm:text-[16px] text-[#5F6368] font-tamil font-normal leading-snug">
              குடிமக்கள் புகார்களை நிஜ உலகத் தீர்வுகளாக மாற்றுதல்
            </p>
          </div>

          <p className="text-xs font-semibold text-[#188038] uppercase tracking-wider pt-1">
            "Your City. Your Voice. Your Impact."
          </p>

          <p className="text-xs text-[#5F6368] italic">
            {t('stepTowardsBetterCity')}
          </p>
        </div>

        {/* Session Expired / Info Banner */}
        {sessionNotice && (
          <div
            role="alert"
            className="mb-6 p-3 rounded-lg bg-[#FEF7E0] border border-[#B06000]/30 text-xs text-[#B06000] font-medium flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-[#B06000]" />
            <span>{sessionNotice}</span>
          </div>
        )}

        {/* Demo Accounts Strip */}
        <div className="mb-6 p-4 rounded-xl bg-[#F8FAF8] border border-[#DADCE0]">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#188038] uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#188038]" />
            <span>{t('demoQuickFill')}</span>
          </div>
          <p className="text-xs text-[#5F6368] mb-3">
            {t('demoQuickFillDesc')}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillCredentials(acc)}
                className="w-full text-left p-2.5 rounded-lg border border-[#DADCE0] bg-white hover:border-[#188038] hover:bg-[#F1F8F3] transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="text-xs font-medium text-[#202124] flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-[#188038]" />
                    <span>{acc.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        acc.role === 'admin' ? 'bg-[#D93025] text-white' : 'bg-[#E6F4EA] text-[#188038]'
                      }`}
                    >
                      {acc.role.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#5F6368] font-mono-numbers mt-0.5">
                    {acc.email} • {acc.password}
                  </div>
                </div>
                <span className="text-[11px] font-medium text-[#188038] opacity-0 group-hover:opacity-100 transition-opacity">
                  Use &rarr;
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 p-3 rounded-lg bg-[#FCE8E6] border border-[#D93025]/30 text-xs text-[#D93025] font-medium"
          >
            {typeof error === 'string' && error !== '[object Object]' ? error : 'Sign in failed, please try again'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-medium text-[#202124] mb-1"
            >
              {t('emailAddress')}
            </label>
            <div className="relative">
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. citizen1@civicresolve.gov"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none"
              />
              <Mail className="w-4 h-4 text-[#5F6368] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label
              htmlFor="password-input"
              className="block text-xs font-medium text-[#202124] mb-1"
            >
              {t('password')}
            </label>
            <div className="relative">
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••••••"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none"
              />
              <Lock className="w-4 h-4 text-[#5F6368] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-control text-sm font-medium text-white bg-[#188038] hover:bg-[#137333] shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{t('signInButton')}</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#DADCE0] text-center text-xs text-[#5F6368]">
          {t('dontHaveAccount')}{' '}
          <Link to="/register" className="font-medium text-[#188038] hover:underline">
            {t('registerAsCitizen')}
          </Link>
        </div>
      </div>
    </div>
  );
}

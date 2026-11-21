import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { useLanguage } from '../hooks/useLanguage.jsx';
import { authApi } from '../lib/api.js';
import OtpVerificationCard from '../components/OtpVerificationCard.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { LogIn, Lock, Mail, ShieldCheck, Loader2, Sparkles, UserCheck, AlertCircle, Shield } from 'lucide-react';

const FALLBACK_CITIZEN_ACCOUNTS = [
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
];

/**
 * Validates and sanitizes returnTo redirect target to prevent open redirect vulnerabilities.
 * Target must be a safe local path (e.g. '/issues/123').
 */
function getSafeReturnTo(target, fallback = null) {
  if (!target || typeof target !== 'string') return fallback;
  const trimmed = target.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
    if (
      trimmed === '/login' ||
      trimmed.startsWith('/login?') ||
      trimmed === '/admin/login' ||
      trimmed.startsWith('/admin/login?')
    ) {
      return fallback;
    }
    return trimmed;
  }
  return fallback;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdminAccount, setIsAdminAccount] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState(FALLBACK_CITIZEN_ACCOUNTS);

  // OTP step state (for regular citizens)
  const [mobileMasked, setMobileMasked] = useState('98XXXXX210');
  const [demoCode, setDemoCode] = useState('123456');

  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const safeReturnTo = getSafeReturnTo(returnTo, null);
  const messageParam = searchParams.get('message');

  const { user, login, sessionExpiredMessage, clearSessionExpired } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // If already authenticated, redirect to destination or home/admin
  useEffect(() => {
    if (user) {
      if (safeReturnTo && safeReturnTo !== '/') {
        navigate(safeReturnTo, { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, safeReturnTo, navigate]);

  // Fetch demo accounts from backend and keep ONLY citizen accounts
  useEffect(() => {
    let isMounted = true;
    async function loadDemoAccounts() {
      try {
        const res = await authApi.getDemoAccounts();
        if (isMounted && res?.accounts?.length) {
          const citizensOnly = res.accounts.filter((a) => a.role === 'citizen');
          if (citizensOnly.length) {
            setDemoAccounts(citizensOnly);
          }
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
    setIsAdminAccount(false);
    if (clearSessionExpired) clearSessionExpired();
    showToast(`Loaded ${acc.name} credentials (1-step demo sign in)`, 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsAdminAccount(false);
    if (clearSessionExpired) clearSessionExpired();
    setLoading(true);

    const result = await login({ email, password });
    setLoading(false);

    if (result.success && !result.requiresOtp) {
      showToast(`Welcome back, ${result.user.name}!`, 'success');
      if (safeReturnTo && safeReturnTo !== '/') {
        navigate(safeReturnTo);
      } else {
        navigate('/');
      }
    } else if (result.requiresOtp) {
      // Regular citizen login requiring OTP step
      setMobileMasked(result.mobileMasked || '98XXXXX210');
      setDemoCode(result.demoCode || '123456');
      setStep('otp');
      showToast('Please enter the OTP sent to your registered mobile', 'info');
    } else {
      let rawErr = result?.error;
      let errMsg = 'Sign in failed, please try again';
      if (typeof rawErr === 'string' && rawErr.trim() && rawErr !== '[object Object]') {
        errMsg = rawErr;
      }

      if (result.isAdminAccount || errMsg.toLowerCase().includes('administrator account')) {
        setIsAdminAccount(true);
      }
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleVerifyOtp = async (code) => {
    setError('');
    setLoading(true);

    const result = await login({ email, password, otp: code });
    setLoading(false);

    if (result.success && !result.requiresOtp) {
      showToast(`Welcome back, ${result.user.name}!`, 'success');
      if (safeReturnTo && safeReturnTo !== '/') {
        navigate(safeReturnTo);
      } else {
        navigate('/');
      }
    } else {
      setError(result.error || 'Invalid OTP code.');
    }
  };

  const sessionNotice = sessionExpiredMessage || messageParam;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 sm:py-12 overflow-hidden bg-gradient-to-b from-[#F1F8F3] to-[#FFFFFF]">
      {/* Decorative Hero Background Image */}
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

      <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/70 to-transparent pointer-events-none -z-10" />

      {/* Main Sign-In Card */}
      <div className="bg-white rounded-[12px] p-6 sm:p-8 border border-[#DADCE0] shadow-card max-w-xl w-full relative z-10">
        {/* Language Switcher Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#DADCE0]">
          <span className="text-xs text-[#5F6368] font-medium">Select Language / மொழி:</span>
          <LanguageSwitcher size="sm" />
        </div>

        {step === 'form' ? (
          <>
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
            </div>

            {/* Session Notice Banner */}
            {sessionNotice && (
              <div
                role="alert"
                className="mb-6 p-3 rounded-lg bg-[#FEF7E0] border border-[#B06000]/30 text-xs text-[#B06000] font-medium flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-[#B06000]" />
                <span>{sessionNotice}</span>
              </div>
            )}

            {/* Citizen Demo Accounts Quick Fill */}
            <div className="mb-6 p-4 rounded-xl bg-[#F8FAF8] border border-[#DADCE0]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#188038] uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-[#188038]" />
                  <span>Citizen Demo Accounts</span>
                </div>
                <span className="text-[10px] bg-[#E6F4EA] text-[#188038] px-2 py-0.5 rounded-full font-bold">
                  1-STEP LOGIN
                </span>
              </div>
              <p className="text-xs text-[#5F6368] mb-3">
                Click a citizen below to sign in instantly without SMS.
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
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E6F4EA] text-[#188038]">
                          CITIZEN
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

            {/* Admin Redirection Notice if Admin tries to log in here */}
            {isAdminAccount && (
              <div className="mb-6 p-4 rounded-xl bg-[#E6F4EA] border border-[#188038] text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#188038]">
                  <Shield className="w-4 h-4 text-[#188038]" />
                  <span>Administrator Account Detected</span>
                </div>
                <p className="text-xs text-[#5F6368]">
                  Municipal triage and override tools are available on the dedicated Administrator Portal.
                </p>
                <div>
                  <Link
                    to="/admin/login"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control text-xs font-medium text-white bg-[#188038] hover:bg-[#137333] transition-colors shadow-sm"
                  >
                    <span>Open Administrator Portal</span>
                    &rarr;
                  </Link>
                </div>
              </div>
            )}

            {error && !isAdminAccount && (
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
                      setIsAdminAccount(false);
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
                      setIsAdminAccount(false);
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

            <div className="mt-6 pt-4 border-t border-[#DADCE0] flex flex-col sm:flex-row items-center justify-between text-xs text-[#5F6368] gap-2">
              <div>
                {t('dontHaveAccount')}{' '}
                <Link to="/register" className="font-medium text-[#188038] hover:underline">
                  {t('registerAsCitizen')}
                </Link>
              </div>
              <Link to="/admin/login" className="font-medium text-[#5F6368] hover:text-[#188038] hover:underline">
                Municipal Admin Portal &rarr;
              </Link>
            </div>
          </>
        ) : (
          <OtpVerificationCard
            title="Citizen Sign In Verification"
            subtitle="Please enter the 6-digit OTP sent to"
            mobileMasked={mobileMasked}
            demoCode={demoCode}
            loading={loading}
            error={error}
            onVerify={handleVerifyOtp}
            onResend={async () => {
              showToast('Demo OTP 123456 ready', 'info');
            }}
            onBack={() => {
              setStep('form');
              setError('');
            }}
          />
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { useLanguage } from '../hooks/useLanguage.jsx';
import { authApi } from '../lib/api.js';
import OtpVerificationCard from '../components/OtpVerificationCard.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { Shield, ShieldAlert, Lock, Mail, Loader2, Sparkles, UserCheck, AlertCircle, ArrowLeft } from 'lucide-react';

const ADMIN_DEMO_ACCOUNT = {
  name: 'City Admin',
  email: 'admin@civicresolve.gov',
  password: 'Admin@Civic2026!',
  role: 'admin',
  description: 'Full municipal triage & administrative override authority',
};

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCitizenAccount, setIsCitizenAccount] = useState(false);
  const [adminDemo, setAdminDemo] = useState(ADMIN_DEMO_ACCOUNT);

  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const { user, adminLogin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // If already authenticated as admin, redirect to /admin
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      }
    }
  }, [user, navigate]);

  // Load admin demo credentials if available
  useEffect(() => {
    let isMounted = true;
    async function loadDemo() {
      try {
        const res = await authApi.getDemoAccounts();
        const admin = res?.accounts?.find((a) => a.role === 'admin');
        if (isMounted && admin) {
          setAdminDemo(admin);
        }
      } catch {
        // Retain fallback
      }
    }
    loadDemo();
    return () => {
      isMounted = false;
    };
  }, []);

  const fillCredentials = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
    setIsCitizenAccount(false);
    showToast('Loaded Administrator credentials', 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsCitizenAccount(false);
    setLoading(true);

    const result = await adminLogin({ email, password });
    setLoading(false);

    if (result.success && !result.requiresOtp) {
      showToast(`Welcome, Administrator ${result.user.name}!`, 'success');
      navigate(returnTo || '/admin');
    } else if (result.requiresOtp) {
      setStep('otp');
      showToast('Admin 2-step verification required. OTP: 123456', 'info');
    } else {
      const errMsg = result.error || 'Administrator authentication failed.';
      setError(errMsg);
      if (result.status === 403 || errMsg.toLowerCase().includes('citizens please')) {
        setIsCitizenAccount(true);
      }
      showToast(errMsg, 'error');
    }
  };

  const handleVerifyOtp = async (code) => {
    setError('');
    setLoading(true);

    const result = await adminLogin({ email, password, otp: code });
    setLoading(false);

    if (result.success && !result.requiresOtp) {
      showToast(`Welcome, Administrator ${result.user.name}!`, 'success');
      navigate(returnTo || '/admin');
    } else {
      setError(result.error || 'Invalid admin verification code.');
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 sm:py-12 bg-gradient-to-b from-[#F1F8F3] to-[#FFFFFF]">
      {/* Decorative Hero Background */}
      <picture className="absolute inset-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <source srcSet="/images/civic-hero.webp" media="(min-width: 640px)" type="image/webp" />
        <source srcSet="/images/civic-hero-mobile.webp" type="image/webp" />
        <img
          src="/images/civic-hero.png"
          alt=""
          className="w-full h-full object-cover object-bottom opacity-20"
        />
      </picture>

      <div className="bg-white rounded-[12px] p-6 sm:p-8 border border-[#DADCE0] shadow-card max-w-lg w-full relative z-10">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#DADCE0]">
          <span className="text-xs text-[#5F6368] font-medium">Administrator Access Portal</span>
          <LanguageSwitcher size="sm" />
        </div>

        {step === 'form' ? (
          <>
            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#E6F4EA] text-[#188038] flex items-center justify-center mx-auto shadow-xs">
                <Shield className="w-6 h-6 text-[#188038]" />
              </div>

              <h1 className="text-2xl font-medium font-heading text-[#202124]">
                Municipal Command Center
              </h1>
              <p className="text-xs text-[#5F6368]">
                Authorized officers and departmental triage staff only.
              </p>
            </div>

            {/* Admin Demo Credentials Quick Fill */}
            <div className="mb-6 p-4 rounded-xl bg-[#F8FAF8] border border-[#DADCE0]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#188038] uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-[#188038]" />
                  <span>Admin Demo Credentials</span>
                </div>
                <span className="text-[10px] bg-[#E6F4EA] text-[#188038] px-2 py-0.5 rounded-full font-bold">
                  2-STEP OTP
                </span>
              </div>
              <p className="text-xs text-[#5F6368] mb-3">
                Click below to load municipal admin credentials. Code <strong className="font-mono text-[#188038]">123456</strong> is used for OTP verification.
              </p>

              <button
                type="button"
                onClick={() => fillCredentials(adminDemo)}
                className="w-full text-left p-2.5 rounded-lg border border-[#DADCE0] bg-white hover:border-[#188038] hover:bg-[#F1F8F3] transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="text-xs font-medium text-[#202124] flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-[#188038]" />
                    <span>{adminDemo.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D93025] text-white">
                      ADMIN
                    </span>
                  </div>
                  <div className="text-[11px] text-[#5F6368] font-mono-numbers mt-0.5">
                    {adminDemo.email} • {adminDemo.password}
                  </div>
                </div>
                <span className="text-[11px] font-medium text-[#188038] opacity-0 group-hover:opacity-100 transition-opacity">
                  Use &rarr;
                </span>
              </button>
            </div>

            {isCitizenAccount && (
              <div className="mb-6 p-3 rounded-lg bg-[#FEF7E0] border border-[#B06000]/30 text-xs text-[#B06000] space-y-2">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#B06000]" />
                  <span>Citizen Account Detected</span>
                </div>
                <p>
                  This portal is reserved for municipal administration. Please use citizen sign in to report and track complaints.
                </p>
                <Link
                  to="/login"
                  className="inline-block px-3 py-1.5 bg-[#B06000] text-white rounded text-[11px] font-medium hover:bg-[#924e00]"
                >
                  Go to Citizen Sign In
                </Link>
              </div>
            )}

            {error && !isCitizenAccount && (
              <div
                role="alert"
                className="mb-6 p-3 rounded-lg bg-[#FCE8E6] border border-[#D93025]/30 text-xs text-[#D93025] font-medium flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 text-[#D93025]" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-xs font-medium text-[#202124] mb-1"
                >
                  Administrator Email
                </label>
                <div className="relative">
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="admin@civicresolve.gov"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none"
                  />
                  <Mail className="w-4 h-4 text-[#5F6368] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-pass"
                  className="block text-xs font-medium text-[#202124] mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-pass"
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
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                <span>Continue to 2-Step OTP</span>
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#DADCE0] text-center text-xs text-[#5F6368]">
              Are you a citizen?{' '}
              <Link to="/login" className="font-medium text-[#188038] hover:underline">
                Citizen Sign In here
              </Link>
            </div>
          </>
        ) : (
          <OtpVerificationCard
            title="Administrator 2-Step Verification"
            subtitle="Security protocol requires OTP verification for"
            mobileMasked={email}
            demoCode="123456"
            loading={loading}
            error={error}
            onVerify={handleVerifyOtp}
            onResend={async () => {
              showToast('Demo OTP 123456 is active', 'info');
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

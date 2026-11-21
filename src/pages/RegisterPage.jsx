import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { UserPlus, User, Mail, Lock, Loader2, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const user = await register({ name, email, password });
      showToast(`Welcome to CivicResolve, ${user.name}!`, 'success');
      navigate('/report');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white rounded-card p-6 sm:p-8 border border-[#DADCE0] shadow-card">
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#E6F4EA] text-[#188038] flex items-center justify-center mx-auto shadow-xs">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-medium font-heading text-[#202124]">
            Create Citizen Account
          </h1>
          <p className="text-xs text-[#5F6368]">
            Join thousands of active citizens tracking civic issues to resolution.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-lg bg-[#FCE8E6] border border-[#D93025]/30 text-xs text-[#D93025] font-medium"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reg-name"
              className="block text-xs font-medium text-[#202124] mb-1"
            >
              Full Name
            </label>
            <div className="relative">
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Karthik Sundaram"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none"
              />
              <User className="w-4 h-4 text-[#5F6368] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-email"
              className="block text-xs font-medium text-[#202124] mb-1"
            >
              Email Address
            </label>
            <div className="relative">
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. karthik@example.com"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none"
              />
              <Mail className="w-4 h-4 text-[#5F6368] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-pass"
              className="block text-xs font-medium text-[#202124] mb-1"
            >
              Password (min. 6 characters)
            </label>
            <div className="relative">
              <input
                id="reg-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none"
              />
              <Lock className="w-4 h-4 text-[#5F6368] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-confirm"
              className="block text-xs font-medium text-[#202124] mb-1"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="reg-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none"
              />
              <CheckCircle2 className="w-4 h-4 text-[#5F6368] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-control text-sm font-medium text-white bg-[#188038] hover:bg-[#137333] shadow-sm transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span>Register Account</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#DADCE0] text-center text-xs text-[#5F6368]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#188038] hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}

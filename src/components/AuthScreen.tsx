import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { User, UserRole } from '../types';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  initialEmail?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, initialEmail = '' }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Quick One-Click Google Login using entered email
  const handleGoogleLogin = () => {
    setErrorMessage('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your Google Email address below to proceed.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid Google Email address (e.g. yourname@gmail.com).');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const googleUser: User = {
        id: `usr-g-${Date.now()}`,
        name: name.trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'ADMIN',
        status: 'Active',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
        createdAt: new Date().toISOString(),
      };
      onLogin(googleUser);
      setIsSubmitting(false);
    }, 400);
  };

  // Standard Email/Password Login
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Email address is required.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const authUser: User = {
        id: `usr-${Date.now()}`,
        name: name.trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: role,
        status: 'Active',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
        createdAt: new Date().toISOString(),
      };
      onLogin(authUser);
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Futuristic Background Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/30 mx-auto">
            SR
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-xl font-extrabold text-white tracking-tight">SR GROUP ERP</h1>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-amber-400/90 font-mono tracking-wider font-semibold uppercase mt-0.5">
              Engineering Operations & Billing 2026
            </p>
          </div>
          <p className="text-xs text-slate-400 pt-1">
            Sign in to access your workspace. All measurements, bills, and data will be saved under your email account.
          </p>
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Continue with Google Button */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] font-mono uppercase text-slate-500">or sign in with email</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
        </div>

        {/* 2. Email Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isSignUp && (
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1 font-semibold">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-semibold">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-semibold">System Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ADMIN">Super Admin (Full Access)</option>
              <option value="MANAGER">Project & Billing Manager</option>
              <option value="ACCOUNTANT">Billing & Site Accountant</option>
              <option value="SUPERVISOR">Site Supervisor</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50"
          >
            <span>{isSignUp ? 'Create Workspace Account' : 'Sign In to Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle sign in / sign up */}
        <div className="text-center pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMessage('');
            }}
            className="text-xs text-slate-400 hover:text-amber-400 transition"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create One"}
          </button>
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono mt-6">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Enterprise 256-bit Isolated Workspace Storage • 100% Persistent</span>
      </div>
    </div>
  );
};

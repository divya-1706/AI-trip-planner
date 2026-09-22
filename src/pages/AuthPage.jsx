import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plane, Lock, Mail, User, ArrowRight, ShieldCheck, UserPlus, LogIn, AlertCircle } from 'lucide-react';

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);

    if (isSignUp) {
      // Sign Up validation
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please try again.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }

      try {
        const result = await signUp(name, email, password);
        alert(result.message);
        setIsSignUp(false); // Switch to login screen after successful signup
      } catch (err) {
        setError(err.message);
      }
    } else {
      // Sign In validation
      try {
        await signIn(email, password);
        navigate('/plan');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const switchTab = (toSignUp) => {
    setIsSignUp(toSignUp);
    setError(null);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 font-sans overflow-x-hidden">
      {/* Clear Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80")',
        }}
      >
        <div className="absolute inset-0 bg-black/25"></div>
      </div>

      <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden p-8 animate-fade-in-down">
        {/* Logo Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="p-3.5 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-2xl shadow-xl shadow-amber-500/30">
              <Plane className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight drop-shadow-md mb-1">
            AI Trip Planner
          </h1>
          <p className="text-amber-100/90 font-serif italic text-xs">
            {isSignUp ? 'Create your account to start planning' : 'Sign in to access your travel itineraries'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-black/30 rounded-2xl mb-6 border border-white/10">
          <button
            type="button"
            onClick={() => switchTab(false)}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isSignUp
                ? 'bg-amber-500 text-white shadow-lg'
                : 'text-amber-100 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
          <button
            type="button"
            onClick={() => switchTab(true)}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isSignUp
                ? 'bg-amber-500 text-white shadow-lg'
                : 'text-amber-100 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/90 border border-red-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-200" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-amber-100 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/15 border border-white/20 rounded-xl text-white placeholder-amber-100/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white/25 transition-all text-sm"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-amber-100 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/15 border border-white/20 rounded-xl text-white placeholder-amber-100/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white/25 transition-all text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-amber-100 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/15 border border-white/20 rounded-xl text-white placeholder-amber-100/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white/25 transition-all text-sm"
            />
          </div>

          {isSignUp && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-amber-100 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Confirm Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/15 border border-white/20 rounded-xl text-white placeholder-amber-100/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white/25 transition-all text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 px-6 mt-2 rounded-xl text-white font-bold text-base bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            {isSignUp ? 'Create Account & Plan Journey' : 'Sign In & Plan Journey'} <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-amber-100/70 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Account saved locally for future sign ins
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

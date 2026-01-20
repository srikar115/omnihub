import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X, Mail } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

// Google Icon SVG component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function AuthModal({ onClose, onSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(null);

  useEffect(() => {
    // Fetch Google Client ID from settings
    fetchGoogleClientId();
  }, []);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  const fetchGoogleClientId = async () => {
    try {
      const response = await axios.get(`${API_BASE}/settings/google-client-id`);
      if (response.data.clientId) {
        setGoogleClientId(response.data.clientId);
        loadGoogleScript(response.data.clientId);
      }
    } catch (err) {
      // Google auth not configured, hide the button
      console.log('Google OAuth not configured');
    }
  };

  const loadGoogleScript = (clientId) => {
    // Check if script already loaded
    if (document.getElementById('google-signin-script')) return;

    const script = document.createElement('script');
    script.id = 'google-signin-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCallback
      });
    };
    document.body.appendChild(script);
  };

  const handleGoogleCallback = async (response) => {
    setGoogleLoading(true);
    setError('');

    try {
      const result = await axios.post(`${API_BASE}/auth/google`, {
        credential: response.credential
      });
      onSuccess(result.data.user, result.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Google authentication failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (window.google?.accounts.id) {
      window.google.accounts.id.prompt();
    } else {
      setError('Google Sign-In is not available');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login'
        ? { email, password }
        : { email, password, name };

      const response = await axios.post(`${API_BASE}${endpoint}`, payload);
      onSuccess(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-8 w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-2">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="text-[var(--text-muted)] mb-6">
          {mode === 'login' ? 'Sign in to continue' : 'Get started with free credits'}
        </p>

        {/* Google Sign In Button */}
        {googleClientId && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-3 bg-white text-gray-800 rounded-xl font-medium flex items-center justify-center gap-3 hover:bg-gray-100 transition-all disabled:opacity-50 mb-4"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <GoogleIcon />
                  Continue with Google
                </>
              )}
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-[#1a1c25]"></div>
              <span className="text-[var(--text-muted)] text-sm">or</span>
              <div className="flex-1 h-px bg-[#1a1c25]"></div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm text-[#9ca3af] mb-2">Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm text-[#9ca3af] mb-2">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm text-[#9ca3af] mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-medium flex items-center justify-center gap-2 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Mail className="w-4 h-4" />
                {mode === 'login' ? 'Sign In with Email' : 'Create Account'}
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-[var(--text-muted)]">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="text-cyan-400 hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </motion.div>
    </motion.div>
  );
}

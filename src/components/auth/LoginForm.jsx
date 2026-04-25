/**
 * LoginForm — Email/password login with animated glassmorphism card.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function LoginForm({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      className="auth-form"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="auth-form-header">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to your NovaDash</p>
      </div>

      {error && (
        <motion.div
          className="auth-error"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </motion.div>
      )}

      <div className="nd-form-group">
        <label className="nd-label" htmlFor="login-email">Email</label>
        <div className="nd-input-wrap">
          <Mail size={16} className="nd-input-icon" />
          <input
            id="login-email"
            className="nd-input nd-input-icon-pad"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div className="nd-form-group">
        <label className="nd-label" htmlFor="login-password">Password</label>
        <div className="nd-input-wrap">
          <Lock size={16} className="nd-input-icon" />
          <input
            id="login-password"
            className="nd-input nd-input-icon-pad"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
      </div>

      <button
        className="btn-nd btn-nd-primary btn-nd-full"
        type="submit"
        disabled={loading}
        id="login-submit-btn"
      >
        {loading ? (
          <span className="btn-loading">Signing in…</span>
        ) : (
          <>
            <LogIn size={16} />
            <span>Sign In</span>
          </>
        )}
      </button>

      <p className="auth-switch-text">
        Don't have an account?{' '}
        <button type="button" className="auth-switch-link" onClick={onSwitchToRegister}>
          Create one
        </button>
      </p>
    </motion.form>
  );
}

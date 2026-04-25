/**
 * RegisterForm — Email/password registration.
 * Checks registration lock before allowing signup.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, UserPlus, AlertCircle, ShieldAlert } from 'lucide-react';

export default function RegisterForm({ onRegister, onSwitchToLogin, registrationLocked }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onRegister(email, password);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (registrationLocked) {
    return (
      <motion.div
        className="auth-form"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="auth-form-header">
          <div className="auth-locked-icon">
            <ShieldAlert size={48} />
          </div>
          <h1 className="auth-title">Registration Closed</h1>
          <p className="auth-subtitle">
            This is a single-user application. An account already exists.
          </p>
        </div>

        <button
          className="btn-nd btn-nd-secondary btn-nd-full"
          type="button"
          onClick={onSwitchToLogin}
        >
          ← Back to Sign In
        </button>
      </motion.div>
    );
  }

  return (
    <motion.form
      className="auth-form"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="auth-form-header">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Set up your personal NovaDash</p>
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
        <label className="nd-label" htmlFor="reg-email">Email</label>
        <div className="nd-input-wrap">
          <Mail size={16} className="nd-input-icon" />
          <input
            id="reg-email"
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
        <label className="nd-label" htmlFor="reg-password">Password</label>
        <div className="nd-input-wrap">
          <Lock size={16} className="nd-input-icon" />
          <input
            id="reg-password"
            className="nd-input nd-input-icon-pad"
            type="password"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>
      </div>

      <div className="nd-form-group">
        <label className="nd-label" htmlFor="reg-confirm">Confirm Password</label>
        <div className="nd-input-wrap">
          <Lock size={16} className="nd-input-icon" />
          <input
            id="reg-confirm"
            className="nd-input nd-input-icon-pad"
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      <button
        className="btn-nd btn-nd-primary btn-nd-full"
        type="submit"
        disabled={loading}
        id="register-submit-btn"
      >
        {loading ? (
          <span className="btn-loading">Creating account…</span>
        ) : (
          <>
            <UserPlus size={16} />
            <span>Create Account</span>
          </>
        )}
      </button>

      <p className="auth-switch-text">
        Already have an account?{' '}
        <button type="button" className="auth-switch-link" onClick={onSwitchToLogin}>
          Sign in
        </button>
      </p>
    </motion.form>
  );
}

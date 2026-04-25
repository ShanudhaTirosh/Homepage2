/**
 * LoginPage — Full-screen login/register page with particle background.
 */
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import ParticleBackground from '../components/layout/ParticleBackground';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function LoginPage() {
  const { user, loading, login, register, registrationLocked } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  if (loading) return <LoadingSpinner />;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="auth-page">
      <ParticleBackground particleCount={60} />

      <div className="auth-container">
        <div className="auth-logo-section">
          <div className="auth-logo-mark">🌌</div>
          <h2 className="auth-logo-title">
            Nova<span>Dash</span>
          </h2>
          <p className="auth-logo-tagline">
            Your personal browser start page
          </p>
        </div>

        <div className="auth-card">
          {isRegister ? (
            <RegisterForm
              onRegister={register}
              onSwitchToLogin={() => setIsRegister(false)}
              registrationLocked={registrationLocked}
            />
          ) : (
            <LoginForm
              onLogin={login}
              onSwitchToRegister={() => setIsRegister(true)}
            />
          )}
        </div>

        <p className="auth-footer-text">
          Cloud-synced · AI-powered · Infinitely customizable
        </p>
      </div>
    </div>
  );
}

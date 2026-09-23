import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff, Wrench, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('driver@garageai.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const { loginUser } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    const success = await loginUser(email, password);
    if (success) navigate('/diagnosis');
  };

  return (
    <div
      className="auth-page-wrapper"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 150px)',
        padding: '2rem 1rem',
        background: 'radial-gradient(circle at 50% 30%, #eff6ff 0%, #f8fafc 100%)'
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--primary-blue), var(--primary-blue-mid))',
              color: 'white',
              boxShadow: '0 8px 20px rgba(30, 58, 138, 0.25)',
              marginBottom: '0.8rem'
            }}
          >
            <Wrench size={28} />
          </div>
          <h2 className="auth-title" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
            Welcome Back
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Sign in to access your garage & diagnostic assistant
          </p>
        </div>

        {/* Styled Card with shadow and rounded corners */}
        <div className="card auth-card" style={{ padding: '2.2rem 2rem', border: '1px solid #e2e8f0' }}>
          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group" style={{ marginBottom: '1.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>
                  Password
                </label>
                <a href="#forgot" onClick={(e) => e.preventDefault()} style={{ fontSize: '0.82rem', color: 'var(--primary-blue-mid)', fontWeight: 600, textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="btn btn-blue"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem' }}
            >
              <LogIn size={20} />
              <span>Login</span>
            </button>
          </form>

          {/* Quick Demo Login Auto-fill helper */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '0.8rem',
              background: 'var(--primary-blue-light)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'var(--primary-blue)'
            }}
          >
            💡Click <strong>Login</strong> to proceed!
          </div>

          {/* Redirect to Register Page Link */}
          <div style={{ textAlign: 'center', marginTop: '1.6rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.2rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Don't have an account?{' '}
            </span>
            <Link
              to="/register"
              style={{
                color: 'var(--accent-orange)',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              Register here <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-logo">💬</div>
          <h1>Welcome Back!</h1>
          <p>Sign in to continue your conversations and stay connected with your community.</p>
          
          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">🚀</div>
              <div className="auth-feature-text">
                <h3>Real-time Chat</h3>
                <p>Instant messaging with live updates</p>
              </div>
            </div>
            
            <div className="auth-feature">
              <div className="auth-feature-icon">🏷️</div>
              <div className="auth-feature-text">
                <h3>Topic-based</h3>
                <p>Organized conversations by topics</p>
              </div>
            </div>
            
            <div className="auth-feature">
              <div className="auth-feature-icon">🔒</div>
              <div className="auth-feature-text">
                <h3>Secure & Private</h3>
                <p>Your data is protected and encrypted</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="auth-right">
        <div className="auth-form">
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
            </div>
          )}
          
          <h2>Sign In</h2>
          <p>Enter your credentials to access your account</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Enter your email"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Enter your password"
              />
            </div>
            
            <button type="submit" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          
          <p className="auth-link">
            Don't have an account? <Link to="/register">Create one here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plane, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const { login }                 = useAuth();
  const navigate                  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.success) navigate('/');
    else setError(result.error || 'Invalid credentials. Please try again.');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundImage: 'url("/a380_sky.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      fontFamily: 'Plus Jakarta Sans, sans-serif'
    }}>
      {/* Light Glassmorphism Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(rgba(255, 255, 255, 0.1), rgba(226, 232, 240, 0.3))',
        zIndex: 1
      }} />

      <div style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: '460px',
        padding: '24px'
      }}>
        {/* Centered Login Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(16px)',
          borderRadius: 24,
          padding: '48px 40px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-accent)', marginBottom: 8, letterSpacing: '-0.03em' }}>
              AeroFuel
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>
              Fueling the future of aviation.
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <AlertCircle size={16} />
              <span style={{ fontSize: '0.875rem' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input
                  id="login-username"
                  className="form-input"
                  style={{ paddingLeft: 42, height: 48, background: '#f8fafc' }}
                  placeholder="admin"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: 42, paddingRight: 44, height: 48, background: '#f8fafc' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)'
                }}>
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn-primary"
              style={{ width: '100%', height: 50, justifyContent: 'center', fontSize: '1rem', marginTop: 12, borderRadius: 12 }}
              disabled={loading}
            >
              {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : 'Log In'}
            </button>
          </form>

          {/* Demo Credits */}
          <div style={{ marginTop: 24, fontSize: '0.8rem', textAlign: 'center', color: 'var(--text-muted)' }}>
             admin / admin123 | operator / operator123
          </div>
        </div>

        {/* Branding & Features Below Panel */}
        <div style={{ marginTop: 32, textAlign: 'center', color: 'var(--text-main)' }}>
           <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>AeroFuel Manager</h2>
           <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 24, color: 'var(--text-muted)' }}>Production-grade aviation fuel operations management.</p>
           
           <div className="marquee-container">
             <div className="marquee-content">
               {[
                 { icon: '📊', text: 'Real-time Dashboards' },
                 { icon: '🤖', text: 'Price Predictions' },
                 { icon: '📄', text: 'One-click Reports' },
                 { icon: '📊', text: 'Real-time Dashboards' },
                 { icon: '🤖', text: 'Price Predictions' },
                 { icon: '📄', text: 'One-click Reports' },
                 { icon: '📊', text: 'Real-time Dashboards' },
                 { icon: '🤖', text: 'Price Predictions' },
                 { icon: '📄', text: 'One-click Reports' },
                 { icon: '📊', text: 'Real-time Dashboards' },
                 { icon: '🤖', text: 'Price Predictions' },
                 { icon: '📄', text: 'One-click Reports' }
               ].map((f, i) => (
                 <div key={i} style={{ 
                   padding: '12px 24px', 
                   background: 'rgba(255, 255, 255, 0.1)', 
                   backdropFilter: 'blur(8px)', 
                   borderRadius: 12, 
                   border: '1px solid rgba(255, 255, 255, 0.15)',
                   whiteSpace: 'nowrap',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '10px'
                 }}>
                   <span style={{ fontSize: '18px' }}>{f.icon}</span>
                   <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.text}</span>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

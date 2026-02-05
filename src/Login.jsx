// src/Login.js - Login and Register component
import React, { useState } from 'react';
import { NorthlightLogo } from './NorthlightLogo';
import { auth } from './api';

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isRegister) {
        result = await auth.register(email, password, name);
      } else {
        result = await auth.login(email, password);
      }
      console.log('Login result:', result);
      console.log('Token:', result.token);
      
      auth.saveSession(result.user, result.token);
      
      console.log('Saved token:', localStorage.getItem('plm_token'));

      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: '#2c3e50',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '400px'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <NorthlightLogo size={60} animated={true} />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#e74c3c',
            color: 'white',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} action="#">
          {isRegister && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#bdc3c7', marginBottom: '6px', fontSize: '13px' }}>
                Name
              </label>
              <input
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#34495e',
                  border: '1px solid #4a5f7f',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="Your name"
              />
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#bdc3c7', marginBottom: '6px', fontSize: '13px' }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: '#34495e',
                border: '1px solid #4a5f7f',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="your@email.com"
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', color: '#bdc3c7', marginBottom: '6px', fontSize: '13px' }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '12px',
                background: '#34495e',
                border: '1px solid #4a5f7f',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#7f8c8d' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {loading ? '...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {/* Toggle */}
        <div style={{ textAlign: 'center', marginTop: '25px' }}>
          <span style={{ color: '#7f8c8d', fontSize: '14px' }}>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#3498db',
              cursor: 'pointer',
              fontSize: '14px',
              marginLeft: '6px',
              textDecoration: 'underline'
            }}
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
// src/NorthlightLogo.js - Northlight PLM Logo and Splash Screen
import React, { useState, useEffect } from 'react';

// Logo Component (can be used standalone)
export function NorthlightLogo({ size = 60, showText = true, animated = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100"
        style={{ filter: 'drop-shadow(0 0 10px rgba(0, 255, 170, 0.5))' }}
      >
        {/* Background circle */}
        <defs>
          <linearGradient id="auroraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ffaa">
              {animated && <animate attributeName="stop-color" values="#00ffaa;#00aaff;#aa00ff;#00ffaa" dur="4s" repeatCount="indefinite" />}
            </stop>
            <stop offset="50%" stopColor="#00aaff">
              {animated && <animate attributeName="stop-color" values="#00aaff;#aa00ff;#00ffaa;#00aaff" dur="4s" repeatCount="indefinite" />}
            </stop>
            <stop offset="100%" stopColor="#aa00ff">
              {animated && <animate attributeName="stop-color" values="#aa00ff;#00ffaa;#00aaff;#aa00ff" dur="4s" repeatCount="indefinite" />}
            </stop>
          </linearGradient>
          <linearGradient id="starGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#0d0d1a" />
          </linearGradient>
        </defs>
        
        {/* Dark background */}
        <circle cx="50" cy="50" r="48" fill="url(#starGradient)" stroke="url(#auroraGradient)" strokeWidth="2" />
        
        {/* Stars */}
        <circle cx="25" cy="25" r="1.5" fill="white" opacity="0.8">
          {animated && <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />}
        </circle>
        <circle cx="75" cy="20" r="1" fill="white" opacity="0.6">
          {animated && <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite" />}
        </circle>
        <circle cx="70" cy="35" r="1.5" fill="white" opacity="0.7">
          {animated && <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.8s" repeatCount="indefinite" />}
        </circle>
        <circle cx="30" cy="40" r="1" fill="white" opacity="0.5">
          {animated && <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3s" repeatCount="indefinite" />}
        </circle>
        <circle cx="20" cy="60" r="1" fill="white" opacity="0.6">
          {animated && <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.2s" repeatCount="indefinite" />}
        </circle>
        
        {/* North Star (Polaris) - larger and brighter */}
        <polygon 
          points="50,15 52,22 59,22 53,27 55,35 50,30 45,35 47,27 41,22 48,22" 
          fill="url(#auroraGradient)"
        >
          {animated && <animateTransform attributeName="transform" type="rotate" from="0 50 25" to="360 50 25" dur="20s" repeatCount="indefinite" />}
        </polygon>
        
        {/* Aurora waves */}
        <path 
          d="M 15 70 Q 30 55 50 65 Q 70 75 85 60" 
          stroke="url(#auroraGradient)" 
          strokeWidth="3" 
          fill="none" 
          opacity="0.8"
          strokeLinecap="round"
        >
          {animated && <animate attributeName="d" values="M 15 70 Q 30 55 50 65 Q 70 75 85 60;M 15 68 Q 30 58 50 63 Q 70 72 85 62;M 15 70 Q 30 55 50 65 Q 70 75 85 60" dur="3s" repeatCount="indefinite" />}
        </path>
        <path 
          d="M 20 78 Q 40 65 55 72 Q 75 80 80 70" 
          stroke="url(#auroraGradient)" 
          strokeWidth="2" 
          fill="none" 
          opacity="0.5"
          strokeLinecap="round"
        >
          {animated && <animate attributeName="d" values="M 20 78 Q 40 65 55 72 Q 75 80 80 70;M 20 75 Q 40 68 55 70 Q 75 77 80 72;M 20 78 Q 40 65 55 72 Q 75 80 80 70" dur="2.5s" repeatCount="indefinite" />}
        </path>
        <path 
          d="M 25 85 Q 45 75 60 80 Q 75 85 78 78" 
          stroke="url(#auroraGradient)" 
          strokeWidth="1.5" 
          fill="none" 
          opacity="0.3"
          strokeLinecap="round"
        >
          {animated && <animate attributeName="d" values="M 25 85 Q 45 75 60 80 Q 75 85 78 78;M 25 82 Q 45 78 60 78 Q 75 82 78 80;M 25 85 Q 45 75 60 80 Q 75 85 78 78" dur="3.5s" repeatCount="indefinite" />}
        </path>
      </svg>
      
      {showText && (
        <div>
          <div style={{ 
            fontSize: size * 0.4, 
            fontWeight: 'bold', 
            background: 'linear-gradient(90deg, #00ffaa, #00aaff, #aa00ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '1px'
          }}>
            NORTHLIGHT
          </div>
          <div style={{ 
            fontSize: size * 0.18, 
            color: '#7f8c8d',
            letterSpacing: '3px',
            marginTop: '2px'
          }}>
            PLM SYSTEM
          </div>
        </div>
      )}
    </div>
  );
}

// Splash Screen Component
export function NorthlightSplash({ onComplete, duration = 3000 }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setFadeOut(true);
          setTimeout(() => onComplete?.(), 500);
          return 100;
        }
        return p + 2;
      });
    }, duration / 50);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.5s ease-out'
    }}>
      {/* Animated background stars */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none'
      }}>
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              background: 'white',
              borderRadius: '50%',
              opacity: Math.random() * 0.7 + 0.3,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`
            }}
          />
        ))}
      </div>

      {/* Aurora effect at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        background: 'linear-gradient(to top, rgba(0, 255, 170, 0.1), rgba(0, 170, 255, 0.05), transparent)',
        filter: 'blur(30px)',
        animation: 'aurora 4s ease-in-out infinite'
      }} />

      {/* Logo */}
      <NorthlightLogo size={120} animated={true} />

      {/* Tagline */}
      <p style={{
        color: '#7f8c8d',
        marginTop: '30px',
        fontSize: '16px',
        letterSpacing: '2px'
      }}>
        Illuminate Your Product Lifecycle
      </p>

      {/* Progress bar */}
      <div style={{
        width: '300px',
        height: '4px',
        background: '#2c3e50',
        borderRadius: '2px',
        marginTop: '40px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #00ffaa, #00aaff, #aa00ff)',
          borderRadius: '2px',
          transition: 'width 0.1s ease-out'
        }} />
      </div>

      {/* Loading text */}
      <p style={{
        color: '#4a5f7f',
        marginTop: '15px',
        fontSize: '12px'
      }}>
        {progress < 30 ? 'Initializing...' : 
         progress < 60 ? 'Loading components...' : 
         progress < 90 ? 'Almost ready...' : 
         'Welcome!'}
      </p>

      {/* CSS animations */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes aurora {
          0%, 100% { transform: translateX(-10%) scaleY(1); }
          50% { transform: translateX(10%) scaleY(1.2); }
        }
      `}</style>
    </div>
  );
}

export default NorthlightLogo;
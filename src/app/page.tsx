'use client'

import { useState, useEffect } from 'react'
import HabitTracker from '@/components/HabitTracker'

export default function Home() {
  const [username, setUsername] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('habit-username')
    if (stored) setUsername(stored)
    setLoaded(true)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!trimmed) return
    localStorage.setItem('habit-username', trimmed)
    setUsername(trimmed)
  }

  function handleLogout() {
    localStorage.removeItem('habit-username')
    setUsername(null)
    setInput('')
  }

  if (!loaded) return null
  if (username) return <HabitTracker username={username} onLogout={handleLogout} />

  return (
    <main className="login-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          background: #0a0a0f;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .orb-1 { width: 400px; height: 400px; background: #f97316; opacity: 0.12; top: -100px; right: -80px; }
        .orb-2 { width: 300px; height: 300px; background: #ec4899; opacity: 0.08; bottom: -80px; left: -60px; }
        .orb-3 { width: 200px; height: 200px; background: #f59e0b; opacity: 0.06; top: 50%; left: 50%; transform: translate(-50%, -50%); }

        .login-card {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 28px;
          padding: 2.5rem;
          backdrop-filter: blur(20px);
        }

        .flame-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .flame-icon {
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, #f97316, #ef4444);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          box-shadow: 0 0 40px rgba(249,115,22,0.35);
          animation: pulse-glow 2.5s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 30px rgba(249,115,22,0.3); }
          50% { box-shadow: 0 0 60px rgba(249,115,22,0.6); }
        }

        .login-title {
          font-family: 'Syne', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
          text-align: center;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }

        .login-sub {
          color: rgba(255,255,255,0.35);
          font-size: 0.875rem;
          text-align: center;
          margin-top: 0.5rem;
          font-weight: 400;
          letter-spacing: 0.01em;
        }

        .stats-row {
          display: flex;
          gap: 1px;
          background: rgba(255,255,255,0.06);
          border-radius: 14px;
          overflow: hidden;
          margin: 1.75rem 0;
        }

        .stat-box {
          flex: 1;
          padding: 0.875rem 0.5rem;
          text-align: center;
          background: rgba(255,255,255,0.02);
        }

        .stat-num {
          font-family: 'Syne', sans-serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: #f97316;
        }

        .stat-label {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .input-group {
          margin-bottom: 1rem;
        }

        .input-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: rgba(255,255,255,0.4);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .input-wrap {
          position: relative;
        }

        .input-at {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.2);
          font-size: 1rem;
          pointer-events: none;
          transition: color 0.2s;
        }

        .input-wrap.focused .input-at { color: #f97316; }

        .login-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 0.875rem 1rem 0.875rem 2.25rem;
          color: #fff;
          font-size: 1rem;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: all 0.2s;
        }

        .login-input:focus {
          border-color: rgba(249,115,22,0.5);
          background: rgba(249,115,22,0.05);
          box-shadow: 0 0 0 3px rgba(249,115,22,0.1);
        }

        .login-input::placeholder { color: rgba(255,255,255,0.2); }

        .login-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #f97316, #ef4444);
          border: none;
          border-radius: 14px;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(249,115,22,0.3);
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(249,115,22,0.45);
        }

        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .login-hint {
          text-align: center;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.2);
          margin-top: 1rem;
          line-height: 1.6;
        }
      `}</style>

      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="login-card">
        <div className="flame-wrap">
          <div className="flame-icon">🔥</div>
        </div>

        <h1 className="login-title">Streak Master</h1>
        <p className="login-sub">Build legendary habits. One day at a time.</p>

        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-num">21</div>
            <div className="stat-label">Day average</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">∞</div>
            <div className="stat-label">Potential</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">1</div>
            <div className="stat-label">Start today</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Your username</label>
            <div className={`input-wrap ${focused ? 'focused' : ''}`}>
              <span className="input-at">@</span>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="choose a username"
                autoFocus
                maxLength={30}
                className="login-input"
              />
            </div>
          </div>

          <button type="submit" disabled={!input.trim()} className="login-btn">
            Start My Journey →
          </button>
        </form>

        <p className="login-hint">
          Same username on any device syncs your data automatically
        </p>
      </div>
    </main>
  )
}

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
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .login-root {
          min-height: 100vh;
          background: #edeae2;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          font-family: 'DM Sans', sans-serif;
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          background: #faf8f4;
          border: 1px solid #ddd9d0;
          border-radius: 24px;
          padding: 2.5rem 2rem;
          box-shadow: 0 2px 24px rgba(0,0,0,0.07);
        }
        .login-icon {
          width: 64px; height: 64px;
          background: #2d4a2d;
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px;
          margin: 0 auto 1.5rem;
        }
        .login-title {
          font-family: 'Lora', serif;
          font-size: 1.875rem; font-weight: 700;
          color: #1a2e1a;
          text-align: center;
          letter-spacing: -0.02em; line-height: 1.15;
        }
        .login-sub {
          color: #8a9e8a; font-size: 0.875rem;
          text-align: center; margin-top: 0.5rem;
        }
        .divider { height: 1px; background: #e5e1d8; margin: 1.75rem 0; }
        .stats-row {
          display: flex;
          border: 1px solid #e0ddd5; border-radius: 14px;
          overflow: hidden; margin-bottom: 1.75rem;
        }
        .stat-box {
          flex: 1; padding: 0.875rem 0.5rem; text-align: center;
          background: #fff; border-right: 1px solid #e0ddd5;
        }
        .stat-box:last-child { border-right: none; }
        .stat-num { font-family: 'Lora', serif; font-size: 1.4rem; font-weight: 700; color: #2d4a2d; }
        .stat-label { font-size: 0.65rem; color: #9c9688; margin-top: 2px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 500; }
        .input-label { display: block; font-size: 0.7rem; font-weight: 600; color: #9c9688; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.08em; }
        .input-wrap { position: relative; margin-bottom: 1rem; }
        .input-at { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #b8b4aa; font-size: 1rem; pointer-events: none; transition: color 0.2s; }
        .input-wrap.focused .input-at { color: #2d4a2d; }
        .login-input {
          width: 100%; background: #fff;
          border: 1.5px solid #ddd9d0; border-radius: 12px;
          padding: 0.875rem 1rem 0.875rem 2.25rem;
          color: #1a2e1a; font-size: 1rem; font-family: 'DM Sans', sans-serif;
          outline: none; transition: all 0.2s;
        }
        .login-input:focus { border-color: #3a6b3a; box-shadow: 0 0 0 3px rgba(58,107,58,0.1); }
        .login-input::placeholder { color: #c8c4ba; }
        .login-btn {
          width: 100%; padding: 0.9rem;
          background: #2d4a2d; border: none; border-radius: 12px;
          color: #e8f0e8; font-family: 'Lora', serif;
          font-size: 1rem; font-weight: 600; letter-spacing: 0.01em;
          cursor: pointer; transition: all 0.2s;
        }
        .login-btn:hover:not(:disabled) { background: #3a6b3a; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(45,74,45,0.2); }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .login-hint { text-align: center; font-size: 0.75rem; color: #b0ac9e; margin-top: 1rem; line-height: 1.6; }
      `}</style>

      <div className="login-card">
        <div className="login-icon">🌿</div>
        <h1 className="login-title">Streak Master</h1>
        <p className="login-sub">Build legendary habits. One day at a time.</p>
        <div className="divider" />
        <div className="stats-row">
          <div className="stat-box"><div className="stat-num">21</div><div className="stat-label">Avg days</div></div>
          <div className="stat-box"><div className="stat-num">∞</div><div className="stat-label">Potential</div></div>
          <div className="stat-box"><div className="stat-num">1</div><div className="stat-label">Start now</div></div>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="input-label">Your username</label>
          <div className={`input-wrap ${focused ? 'focused' : ''}`}>
            <span className="input-at">@</span>
            <input
              type="text" value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="choose a username"
              autoFocus maxLength={30} className="login-input"
            />
          </div>
          <button type="submit" disabled={!input.trim()} className="login-btn">Begin my journey →</button>
        </form>
        <p className="login-hint">Same username on any device syncs your data automatically</p>
      </div>
    </main>
  )
}

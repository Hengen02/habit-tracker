'use client'

import { useState, useEffect } from 'react'
import HabitTracker from '@/components/HabitTracker'

export default function Home() {
  const [username, setUsername] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loaded, setLoaded] = useState(false)

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

  if (username) {
    return <HabitTracker username={username} onLogout={handleLogout} />
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white/5 border border-white/10 backdrop-blur rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔥</div>
            <h1 className="text-3xl font-bold text-white">Habit Streak</h1>
            <p className="text-white/50 mt-2 text-sm">Build better habits, one day at a time</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Choose a username
              </label>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="e.g. john or myhabits"
                autoFocus
                maxLength={30}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Start Tracking →
            </button>
          </form>

          <p className="text-center text-white/30 text-xs mt-5 leading-relaxed">
            Use the same username on any device to sync your habits
          </p>
        </div>
      </div>
    </main>
  )
}

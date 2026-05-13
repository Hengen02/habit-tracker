'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  type Habit, type Completion, type Routine, type RoutineCompletion,
  formatDate, calculateStreak, isTodayComplete, getWeekStatus, getRoutinesForDay,
} from '@/lib/habitUtils'
import { Plus, Trash2, LogOut, Check, Loader2, CalendarDays, RefreshCw, Flame, Trophy, Zap, Star } from 'lucide-react'

type Tab = 'today' | 'routines'

interface Props {
  username: string
  onLogout: () => void
}

// XP and level system
function getLevel(streak: number) {
  if (streak >= 365) return { level: 10, title: 'Legendary', color: '#f59e0b', next: Infinity }
  if (streak >= 180) return { level: 9, title: 'Grandmaster', color: '#ef4444', next: 365 }
  if (streak >= 90)  return { level: 8, title: 'Diamond', color: '#06b6d4', next: 180 }
  if (streak >= 60)  return { level: 7, title: 'Platinum', color: '#8b5cf6', next: 90 }
  if (streak >= 30)  return { level: 6, title: 'Gold', color: '#f97316', next: 60 }
  if (streak >= 21)  return { level: 5, title: 'Silver', color: '#6b7280', next: 30 }
  if (streak >= 14)  return { level: 4, title: 'Bronze', color: '#92400e', next: 21 }
  if (streak >= 7)   return { level: 3, title: 'Iron', color: '#64748b', next: 14 }
  if (streak >= 3)   return { level: 2, title: 'Rookie', color: '#10b981', next: 7 }
  return { level: 1, title: 'Beginner', color: '#94a3b8', next: 3 }
}

function getMilestoneMessage(streak: number): string | null {
  const milestones: Record<number, string> = {
    1: '🎉 First day! The journey begins!',
    3: '🔥 3-day streak! You\'re building momentum!',
    7: '⚡ One full week! You\'re on fire!',
    14: '💪 2 weeks strong! Habit forming!',
    21: '🏆 21 days! Science says it\'s a habit now!',
    30: '👑 30 days! One month legend!',
    60: '💎 60 days! You\'re unstoppable!',
    90: '🌟 90 days! Elite tier achieved!',
    180: '🚀 180 days! Half a year of greatness!',
    365: '🦁 365 days! LEGENDARY STATUS!',
  }
  return milestones[streak] ?? null
}

export default function HabitTracker({ username, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('today')
  const [userId, setUserId] = useState<string | null>(null)
  const [allHabits, setAllHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [routines, setRoutines] = useState<Routine[]>([])
  const [routineCompletions, setRoutineCompletions] = useState<RoutineCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [newHabitName, setNewHabitName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [celebration, setCelebration] = useState<string | null>(null)
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([])

  const today = formatDate(new Date())
  const todayDOW = new Date().getDay()

  const initUser = useCallback(async () => {
    const { data: existing } = await supabase.from('users').select('id').eq('username', username).maybeSingle()
    if (existing) return existing.id
    const { data: created, error } = await supabase.from('users').insert({ username }).select('id').single()
    if (error) throw error
    return created.id
  }, [username])

  const loadData = useCallback(async (uid: string) => {
    const cutoff = formatDate(new Date(Date.now() - 60 * 86400000))
    const { data: habits } = await supabase.from('habits').select('*').eq('user_id', uid).order('created_at', { ascending: true })
    const habitIds = (habits ?? []).map(h => h.id)
    const { data: comps } = habitIds.length > 0
      ? await supabase.from('completions').select('habit_id, completed_date').in('habit_id', habitIds).gte('completed_date', cutoff)
      : { data: [] }
    const { data: rts } = await supabase.from('routines').select('*').eq('user_id', uid).order('created_at', { ascending: true })
    const routineIds = (rts ?? []).map(r => r.id)
    const { data: rtComps } = routineIds.length > 0
      ? await supabase.from('routine_completions').select('routine_id, completed_date').in('routine_id', routineIds).gte('completed_date', cutoff)
      : { data: [] }
    setAllHabits(habits ?? [])
    setCompletions(comps ?? [])
    setRoutines(rts ?? [])
    setRoutineCompletions(rtComps ?? [])
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const uid = await initUser()
        if (cancelled) return
        setUserId(uid)
        await loadData(uid)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [initUser, loadData])

  const activeHabits = allHabits.filter(h => !h.deleted_at)
  const todayHabitDone = new Set(completions.filter(c => c.completed_date === today).map(c => c.habit_id))
  const streak = calculateStreak(allHabits, completions)
  const todayComplete = isTodayComplete(allHabits, completions)
  const weekDays = getWeekStatus(allHabits, completions)
  const activeRoutines = routines.filter(r => !r.deleted_at)
  const todayRoutines = getRoutinesForDay(activeRoutines, todayDOW)
  const todayRoutineDone = new Set(routineCompletions.filter(c => c.completed_date === today).map(c => c.routine_id))
  const totalToday = activeHabits.length + todayRoutines.length
  const doneToday = [...activeHabits].filter(h => todayHabitDone.has(h.id)).length + todayRoutines.filter(r => todayRoutineDone.has(r.id)).length
  const progressPct = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0
  const { level, title: levelTitle, color: levelColor, next: nextLevel } = getLevel(streak)
  const milestoneMsg = getMilestoneMessage(streak)

  function spawnParticles() {
    const colors = ['#f97316', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6']
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))
    setParticles(newParticles)
    setTimeout(() => setParticles([]), 1200)
  }

  async function toggleHabit(habitId: string) {
    if (toggling.has(habitId)) return
    setToggling(prev => new Set(prev).add(habitId))
    const isDone = todayHabitDone.has(habitId)
    if (isDone) {
      setCompletions(prev => prev.filter(c => !(c.habit_id === habitId && c.completed_date === today)))
      await supabase.from('completions').delete().eq('habit_id', habitId).eq('completed_date', today)
    } else {
      setCompletions(prev => [...prev, { habit_id: habitId, completed_date: today }])
      await supabase.from('completions').upsert({ habit_id: habitId, completed_date: today })
      spawnParticles()
      const newDone = doneToday + 1
      if (newDone === totalToday && totalToday > 0) {
        setCelebration('🎯 Perfect Day! All tasks complete!')
        setTimeout(() => setCelebration(null), 3000)
      }
    }
    setToggling(prev => { const s = new Set(prev); s.delete(habitId); return s })
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault()
    const name = newHabitName.trim()
    if (!name || !userId) return
    setAdding(true)
    const { data, error } = await supabase.from('habits').insert({ user_id: userId, name }).select('*').single()
    if (!error && data) { setAllHabits(prev => [...prev, data]); setNewHabitName(''); setShowAdd(false) }
    setAdding(false)
  }

  async function deleteHabit(habitId: string) {
    if (deleting.has(habitId)) return
    setDeleting(prev => new Set(prev).add(habitId))
    const now = new Date().toISOString()
    setAllHabits(prev => prev.map(h => h.id === habitId ? { ...h, deleted_at: now } : h))
    await supabase.from('habits').update({ deleted_at: now }).eq('id', habitId)
    setDeleting(prev => { const s = new Set(prev); s.delete(habitId); return s })
  }

  async function toggleRoutine(routineId: string) {
    if (toggling.has(routineId)) return
    setToggling(prev => new Set(prev).add(routineId))
    const isDone = todayRoutineDone.has(routineId)
    if (isDone) {
      setRoutineCompletions(prev => prev.filter(c => !(c.routine_id === routineId && c.completed_date === today)))
      await supabase.from('routine_completions').delete().eq('routine_id', routineId).eq('completed_date', today)
    } else {
      setRoutineCompletions(prev => [...prev, { routine_id: routineId, completed_date: today }])
      await supabase.from('routine_completions').upsert({ routine_id: routineId, completed_date: today })
      spawnParticles()
    }
    setToggling(prev => { const s = new Set(prev); s.delete(routineId); return s })
  }

  async function addRoutine(name: string, days: number[]) {
    if (!userId) return
    const { data, error } = await supabase.from('routines').insert({ user_id: userId, name, days }).select('*').single()
    if (!error && data) setRoutines(prev => [...prev, data])
  }

  async function deleteRoutine(routineId: string) {
    const now = new Date().toISOString()
    setRoutines(prev => prev.map(r => r.id === routineId ? { ...r, deleted_at: now } : r))
    await supabase.from('routines').update({ deleted_at: now }).eq('id', routineId)
  }

  if (loading) {
    return (
      <div className="ht-loading">
        <style>{htStyles}</style>
        <div className="loading-inner">
          <div className="loading-flame">🔥</div>
          <p className="loading-text">Loading your streak...</p>
        </div>
      </div>
    )
  }

  const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const todayDOWIdx = new Date().getDay()

  return (
    <div className="ht-root">
      <style>{htStyles}</style>

      {/* Particle effects */}
      {particles.map(p => (
        <div key={p.id} className="particle" style={{ left: `${p.x}%`, top: `${p.y}%`, background: p.color }} />
      ))}

      {/* Celebration banner */}
      {celebration && (
        <div className="celebration-banner">{celebration}</div>
      )}

      <div className="ht-inner">

        {/* ── HEADER ── */}
        <div className="ht-header">
          <div className="header-left">
            <span className="header-flame">🔥</span>
            <div>
              <div className="header-name">@{username}</div>
              <div className="header-level" style={{ color: levelColor }}>
                <Star style={{ width: 10, height: 10, display: 'inline', marginRight: 3 }} />
                Lvl {level} · {levelTitle}
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="logout-btn">
            <LogOut style={{ width: 14, height: 14 }} />
            <span>Switch</span>
          </button>
        </div>

        {/* ── STREAK HERO ── */}
        <div className="streak-hero">
          <div className="streak-bg-orb" />
          <div className="streak-content">
            <div className="streak-number-wrap">
              <div className="streak-number">{streak}</div>
              <div className="streak-fire">🔥</div>
            </div>
            <div className="streak-label">day streak</div>

            {/* Level progress bar */}
            <div className="level-section">
              <div className="level-row">
                <span className="level-badge" style={{ background: levelColor + '25', color: levelColor, border: `1px solid ${levelColor}40` }}>
                  ★ {levelTitle}
                </span>
                {nextLevel !== Infinity && (
                  <span className="level-next">→ {nextLevel - streak} days to next level</span>
                )}
              </div>
              {nextLevel !== Infinity && (
                <div className="level-bar-bg">
                  <div className="level-bar-fill" style={{
                    width: `${Math.round((streak / nextLevel) * 100)}%`,
                    background: `linear-gradient(90deg, ${levelColor}, ${levelColor}aa)`,
                  }} />
                </div>
              )}
            </div>

            {/* Milestone message */}
            {milestoneMsg && (
              <div className="milestone-msg">{milestoneMsg}</div>
            )}

            {/* Week view */}
            <div className="week-row">
              {weekDays.map((day, i) => (
                <div key={i} className={`week-dot-wrap ${i === todayDOWIdx ? 'week-today' : ''}`}>
                  <div className={`week-dot ${day.status === 'complete' ? 'week-dot-done' : day.status === 'empty' ? 'week-dot-empty' : 'week-dot-miss'}`} />
                  <span className="week-label">{DOW_LABELS[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── QUICK STATS ROW ── */}
        <div className="stats-row">
          <div className="stat-card">
            <Flame style={{ width: 16, height: 16, color: '#f97316' }} />
            <div className="stat-val">{streak}</div>
            <div className="stat-key">Streak</div>
          </div>
          <div className="stat-card">
            <Trophy style={{ width: 16, height: 16, color: '#f59e0b' }} />
            <div className="stat-val">{Math.max(streak, 0)}</div>
            <div className="stat-key">Best</div>
          </div>
          <div className="stat-card">
            <Zap style={{ width: 16, height: 16, color: '#8b5cf6' }} />
            <div className="stat-val">{progressPct}%</div>
            <div className="stat-key">Today</div>
          </div>
          <div className="stat-card">
            <Star style={{ width: 16, height: 16, color: levelColor }} />
            <div className="stat-val">{level}</div>
            <div className="stat-key">Level</div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="tab-bar">
          <button className={`tab-btn ${tab === 'today' ? 'tab-active' : ''}`} onClick={() => setTab('today')}>
            <CalendarDays style={{ width: 15, height: 15 }} />
            Daily Tasks
          </button>
          <button className={`tab-btn ${tab === 'routines' ? 'tab-active' : ''}`} onClick={() => setTab('routines')}>
            <RefreshCw style={{ width: 15, height: 15 }} />
            Routines
          </button>
        </div>

        {/* ── TODAY TAB ── */}
        {tab === 'today' && (
          <div className="tasks-panel">
            {/* Progress */}
            <div className="progress-header">
              <div className="progress-info">
                <span className="progress-title">Today&apos;s Progress</span>
                <span className="progress-count">{doneToday}/{totalToday}</span>
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${progressPct}%`,
                    background: progressPct === 100
                      ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                      : 'linear-gradient(90deg, #f97316, #ef4444)',
                  }}
                />
              </div>
              {progressPct === 100 && totalToday > 0 && (
                <div className="perfect-badge">✨ Perfect Day!</div>
              )}
            </div>

            {/* Add habit button */}
            <button className="add-habit-btn" onClick={() => setShowAdd(v => !v)}>
              <Plus style={{ width: 16, height: 16 }} />
              Add Habit
            </button>

            {showAdd && (
              <form onSubmit={addHabit} className="add-form">
                <input
                  type="text"
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  placeholder="New habit name…"
                  autoFocus
                  maxLength={60}
                  className="add-input"
                />
                <button type="submit" disabled={adding || !newHabitName.trim()} className="add-save-btn">
                  {adding ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : 'Save'}
                </button>
              </form>
            )}

            {/* Daily habits */}
            {activeHabits.length > 0 && (
              <div className="task-section">
                <div className="section-label">Daily Habits</div>
                <div className="task-list">
                  {activeHabits.map(habit => (
                    <TaskRow
                      key={habit.id}
                      label={habit.name}
                      done={todayHabitDone.has(habit.id)}
                      toggling={toggling.has(habit.id)}
                      onToggle={() => toggleHabit(habit.id)}
                      onDelete={() => deleteHabit(habit.id)}
                      deleting={deleting.has(habit.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Today's routines */}
            {todayRoutines.length > 0 && (
              <div className="task-section">
                <div className="section-label">Today&apos;s Routines</div>
                <div className="task-list">
                  {todayRoutines.map(routine => (
                    <TaskRow
                      key={routine.id}
                      label={routine.name}
                      done={todayRoutineDone.has(routine.id)}
                      toggling={toggling.has(routine.id)}
                      onToggle={() => toggleRoutine(routine.id)}
                      badge="routine"
                    />
                  ))}
                </div>
              </div>
            )}

            {activeHabits.length === 0 && todayRoutines.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p className="empty-text">No habits yet. Add your first one!</p>
              </div>
            )}
          </div>
        )}

        {/* ── ROUTINES TAB ── */}
        {tab === 'routines' && (
          <RoutinesPanel
            routines={activeRoutines}
            onAdd={addRoutine}
            onDelete={deleteRoutine}
          />
        )}

        <div className="footer-text">Streak Master · synced via @{username}</div>
      </div>
    </div>
  )
}

// ── Task Row ──
function TaskRow({ label, done, toggling, onToggle, onDelete, deleting, badge }: {
  label: string; done: boolean; toggling: boolean; onToggle: () => void;
  onDelete?: () => void; deleting?: boolean; badge?: string;
}) {
  return (
    <div className={`task-row ${done ? 'task-done' : ''}`}>
      <button onClick={onToggle} disabled={toggling} className={`task-check ${done ? 'task-check-done' : ''}`}>
        {toggling
          ? <Loader2 style={{ width: 13, height: 13 }} className="spin" />
          : done
          ? <Check style={{ width: 13, height: 13 }} strokeWidth={3} />
          : null}
      </button>
      <span className={`task-label ${done ? 'task-label-done' : ''}`}>{label}</span>
      {badge && <span className="task-badge">{badge}</span>}
      {done && <span className="task-xp">+1 XP</span>}
      {onDelete && (
        <button onClick={onDelete} disabled={deleting} className="task-delete">
          {deleting ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <Trash2 style={{ width: 14, height: 14 }} />}
        </button>
      )}
    </div>
  )
}

// ── Routines Panel ──
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function RoutinesPanel({ routines, onAdd, onDelete }: {
  routines: Routine[]; onAdd: (name: string, days: number[]) => void; onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [days, setDays] = useState<number[]>([])

  function toggleDay(d: number) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || days.length === 0) return
    onAdd(name.trim(), days)
    setName(''); setDays([]); setShowForm(false)
  }

  return (
    <div className="tasks-panel">
      <button className="add-habit-btn" onClick={() => setShowForm(v => !v)}>
        <Plus style={{ width: 16, height: 16 }} />
        New Routine
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="routine-form">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Routine name…"
            autoFocus
            maxLength={60}
            className="add-input"
          />
          <div className="day-picker">
            {DAY_NAMES.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`day-btn ${days.includes(i) ? 'day-btn-active' : ''}`}
              >
                {d}
              </button>
            ))}
          </div>
          <button type="submit" disabled={!name.trim() || days.length === 0} className="add-save-btn" style={{ width: '100%' }}>
            Save Routine
          </button>
        </form>
      )}

      {routines.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔄</div>
          <p className="empty-text">No routines yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="task-list">
          {routines.map(r => (
            <div key={r.id} className="routine-card">
              <div className="routine-top">
                <span className="routine-name">{r.name}</span>
                <button onClick={() => onDelete(r.id)} className="task-delete">
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>
              <div className="routine-days">
                {DAY_NAMES.map((d, i) => (
                  <span key={i} className={`routine-day ${r.days?.includes(i) ? 'routine-day-active' : ''}`}>{d}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── All styles ──
const htStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  * { box-sizing: border-box; }

  .ht-loading {
    min-height: 100vh;
    background: #0a0a0f;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Sans', sans-serif;
  }

  .loading-inner { text-align: center; }
  .loading-flame { font-size: 3rem; animation: pulse-glow 1.5s ease-in-out infinite; }
  .loading-text { color: rgba(255,255,255,0.4); margin-top: 1rem; font-size: 0.875rem; }

  .ht-root {
    min-height: 100vh;
    background: #0a0a0f;
    font-family: 'DM Sans', sans-serif;
    color: #fff;
    position: relative;
    overflow-x: hidden;
  }

  .particle {
    position: fixed;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    pointer-events: none;
    animation: particle-fly 1.2s ease-out forwards;
    z-index: 999;
  }

  @keyframes particle-fly {
    0% { transform: translate(0, 0) scale(1); opacity: 1; }
    100% { transform: translate(calc(-50px + ${Math.random() * 100}px), -80px) scale(0); opacity: 0; }
  }

  .celebration-banner {
    position: fixed;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #f97316, #ef4444);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 100px;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 0.875rem;
    z-index: 1000;
    white-space: nowrap;
    animation: banner-in 0.4s ease-out, banner-out 0.4s ease-in 2.6s forwards;
    box-shadow: 0 8px 32px rgba(249,115,22,0.4);
  }

  @keyframes banner-in {
    from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  @keyframes banner-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  .ht-inner {
    max-width: 430px;
    margin: 0 auto;
    padding: 1rem 1rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  /* Header */
  .ht-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;
  }

  .header-left { display: flex; align-items: center; gap: 0.625rem; }

  .header-flame {
    font-size: 1.5rem;
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%, 100% { filter: drop-shadow(0 0 4px rgba(249,115,22,0.5)); }
    50% { filter: drop-shadow(0 0 12px rgba(249,115,22,0.9)); }
  }

  .header-name { font-size: 0.875rem; font-weight: 500; color: rgba(255,255,255,0.8); }
  .header-level { font-size: 0.7rem; margin-top: 1px; font-weight: 500; }

  .logout-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.4);
    padding: 0.4rem 0.75rem;
    border-radius: 100px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .logout-btn:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.08); }

  /* Streak Hero */
  .streak-hero {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px;
    padding: 1.75rem 1.5rem 1.5rem;
    position: relative;
    overflow: hidden;
  }

  .streak-bg-orb {
    position: absolute;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(249,115,22,0.15), transparent 70%);
    top: -50px;
    right: -50px;
    border-radius: 50%;
    pointer-events: none;
  }

  .streak-content { position: relative; }

  .streak-number-wrap {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    justify-content: center;
  }

  .streak-number {
    font-family: 'Syne', sans-serif;
    font-size: 5rem;
    font-weight: 800;
    line-height: 1;
    background: linear-gradient(135deg, #f97316, #ef4444);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .streak-fire { font-size: 2.5rem; margin-top: 0.75rem; animation: pulse-glow 2s ease-in-out infinite; }

  .streak-label {
    text-align: center;
    font-size: 0.75rem;
    color: rgba(255,255,255,0.3);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-top: 0.25rem;
    font-weight: 500;
  }

  .level-section { margin-top: 1.25rem; }

  .level-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .level-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.625rem;
    border-radius: 100px;
    letter-spacing: 0.05em;
  }

  .level-next { font-size: 0.7rem; color: rgba(255,255,255,0.25); }

  .level-bar-bg {
    height: 4px;
    background: rgba(255,255,255,0.08);
    border-radius: 100px;
    overflow: hidden;
  }

  .level-bar-fill {
    height: 100%;
    border-radius: 100px;
    transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .milestone-msg {
    margin-top: 0.875rem;
    background: rgba(249,115,22,0.1);
    border: 1px solid rgba(249,115,22,0.2);
    border-radius: 12px;
    padding: 0.625rem 1rem;
    font-size: 0.8rem;
    color: #fdba74;
    text-align: center;
    font-weight: 500;
  }

  .week-row {
    display: flex;
    justify-content: space-between;
    margin-top: 1.25rem;
  }

  .week-dot-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .week-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    transition: all 0.3s;
  }

  .week-dot-done { background: linear-gradient(135deg, #10b981, #06b6d4); }
  .week-dot-miss { background: rgba(239,68,68,0.3); border: 1px solid rgba(239,68,68,0.4); }
  .week-dot-empty { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); }
  .week-today .week-dot { box-shadow: 0 0 0 2px rgba(249,115,22,0.6); }

  .week-label { font-size: 0.6rem; color: rgba(255,255,255,0.25); font-weight: 500; letter-spacing: 0.05em; }
  .week-today .week-label { color: #f97316; }

  /* Stats Row */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  .stat-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    padding: 0.875rem 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .stat-val {
    font-family: 'Syne', sans-serif;
    font-size: 1.2rem;
    font-weight: 700;
    color: #fff;
  }

  .stat-key { font-size: 0.65rem; color: rgba(255,255,255,0.25); letter-spacing: 0.05em; text-transform: uppercase; }

  /* Tabs */
  .tab-bar {
    display: flex;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 4px;
    gap: 4px;
  }

  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0.6rem;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.35);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn:hover { color: rgba(255,255,255,0.6); }

  .tab-active {
    background: rgba(249,115,22,0.15) !important;
    color: #f97316 !important;
    border: 1px solid rgba(249,115,22,0.25) !important;
  }

  /* Tasks Panel */
  .tasks-panel {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 20px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  /* Progress */
  .progress-header { display: flex; flex-direction: column; gap: 0.5rem; }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .progress-title { font-size: 0.8rem; color: rgba(255,255,255,0.4); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; }
  .progress-count { font-family: 'Syne', sans-serif; font-size: 0.9rem; font-weight: 700; color: rgba(255,255,255,0.8); }

  .progress-bar-bg {
    height: 6px;
    background: rgba(255,255,255,0.06);
    border-radius: 100px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: 100px;
    transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .perfect-badge {
    text-align: center;
    font-size: 0.75rem;
    color: #34d399;
    font-weight: 600;
    animation: fade-in 0.4s ease-out;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Add button */
  .add-habit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 0.75rem;
    background: rgba(249,115,22,0.1);
    border: 1px dashed rgba(249,115,22,0.3);
    border-radius: 12px;
    color: #f97316;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .add-habit-btn:hover { background: rgba(249,115,22,0.15); border-style: solid; }

  /* Add form */
  .add-form {
    display: flex;
    gap: 0.5rem;
    animation: fade-in 0.2s ease-out;
  }

  .add-input {
    flex: 1;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 0.625rem 0.875rem;
    color: #fff;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s;
  }

  .add-input:focus { border-color: rgba(249,115,22,0.5); box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
  .add-input::placeholder { color: rgba(255,255,255,0.2); }

  .add-save-btn {
    background: linear-gradient(135deg, #f97316, #ef4444);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-family: 'Syne', sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.625rem 1rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-save-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .add-save-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Section */
  .task-section { display: flex; flex-direction: column; gap: 0.5rem; }

  .section-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: rgba(255,255,255,0.2);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .task-list { display: flex; flex-direction: column; gap: 0.5rem; }

  /* Task Row */
  .task-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.875rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    transition: all 0.25s;
  }

  .task-done {
    background: rgba(16,185,129,0.08) !important;
    border-color: rgba(16,185,129,0.2) !important;
  }

  .task-check {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.2);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: pointer;
    transition: all 0.2s;
    color: #fff;
  }

  .task-check:hover:not(:disabled) { border-color: rgba(249,115,22,0.6); background: rgba(249,115,22,0.1); }

  .task-check-done {
    background: linear-gradient(135deg, #10b981, #06b6d4) !important;
    border-color: transparent !important;
  }

  .task-label { flex: 1; font-size: 0.9rem; font-weight: 400; color: rgba(255,255,255,0.85); transition: all 0.2s; }
  .task-label-done { color: rgba(16,185,129,0.7) !important; text-decoration: line-through; }

  .task-badge {
    font-size: 0.65rem;
    background: rgba(139,92,246,0.2);
    color: #a78bfa;
    padding: 2px 8px;
    border-radius: 100px;
    border: 1px solid rgba(139,92,246,0.3);
    font-weight: 500;
  }

  .task-xp {
    font-size: 0.65rem;
    color: #f97316;
    font-weight: 700;
    font-family: 'Syne', sans-serif;
    animation: fade-in 0.3s ease-out;
  }

  .task-delete {
    color: rgba(255,255,255,0.15);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    transition: color 0.2s;
    flex-shrink: 0;
  }

  .task-delete:hover:not(:disabled) { color: #ef4444; }

  /* Routines */
  .routine-form { display: flex; flex-direction: column; gap: 0.75rem; animation: fade-in 0.2s ease-out; }

  .day-picker { display: flex; gap: 4px; flex-wrap: wrap; }

  .day-btn {
    padding: 0.3rem 0.5rem;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.4);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    flex: 1;
    min-width: 40px;
  }

  .day-btn:hover { border-color: rgba(249,115,22,0.4); color: rgba(255,255,255,0.7); }

  .day-btn-active {
    background: rgba(249,115,22,0.15) !important;
    border-color: rgba(249,115,22,0.5) !important;
    color: #f97316 !important;
  }

  .routine-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 0.875rem;
  }

  .routine-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.625rem; }
  .routine-name { font-size: 0.9rem; font-weight: 500; color: rgba(255,255,255,0.85); }

  .routine-days { display: flex; gap: 4px; }

  .routine-day {
    font-size: 0.65rem;
    padding: 2px 6px;
    border-radius: 6px;
    background: rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.2);
    font-weight: 500;
  }

  .routine-day-active {
    background: rgba(249,115,22,0.15) !important;
    color: #f97316 !important;
  }

  /* Empty state */
  .empty-state { text-align: center; padding: 2rem 1rem; }
  .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
  .empty-text { color: rgba(255,255,255,0.2); font-size: 0.875rem; }

  .footer-text { text-align: center; color: rgba(255,255,255,0.1); font-size: 0.7rem; padding-top: 0.5rem; }

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`

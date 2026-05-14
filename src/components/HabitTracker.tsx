'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  type Routine, type RoutineCompletion,
  formatDate, getRoutinesForDay,
} from '@/lib/habitUtils'
import { Plus, Trash2, LogOut, Check, Loader2, RefreshCw, Flame, Trophy, Zap, Star, BarChart3, Gift, Target, HelpCircle } from 'lucide-react'
import Heatmap from './Heatmap'
import RewardVault, { type Reward } from './RewardVault'
import ReminderSettings from './ReminderSettings'
import PlanTab, { type Plan, type PlanActivity, type DailyToss, type UserPoints } from './PlanTab'
import HelpModal from './HelpModal'
import { type PlanInput } from './PlanSetup'

type Tab = 'plan' | 'routines' | 'stats' | 'rewards'
interface Props { username: string; onLogout: () => void }

// Compute streak from daily tosses across all plans
function computeTossStreak(tosses: DailyToss[]): number {
  if (tosses.length === 0) return 0
  // Group by date — a day "counts" if ANY toss that day is completed OR a rest day was completed
  const byDate = new Map<string, { hasActive: boolean; hasCompletedActive: boolean; hasRest: boolean; hasCompletedRest: boolean }>()
  tosses.forEach(t => {
    const e = byDate.get(t.toss_date) ?? { hasActive: false, hasCompletedActive: false, hasRest: false, hasCompletedRest: false }
    if (t.is_rest_day) {
      e.hasRest = true
      if (t.completed) e.hasCompletedRest = true
    } else {
      e.hasActive = true
      if (t.completed) e.hasCompletedActive = true
    }
    byDate.set(t.toss_date, e)
  })
  // Walk backwards from today
  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (let i = 0; i < 365; i++) {
    const key = formatDate(cursor)
    const e = byDate.get(key)
    if (!e) {
      // No toss this day → break (but allow today if no toss yet)
      if (i === 0) { cursor.setDate(cursor.getDate() - 1); continue }
      break
    }
    // Counts as streak if: completed an active OR it was a rest day (rest day doesn't break streak)
    if (e.hasCompletedActive || (e.hasRest && !e.hasActive)) {
      streak++
    } else {
      if (i === 0) { cursor.setDate(cursor.getDate() - 1); continue } // today not done yet
      break
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function getLevel(streak: number) {
  if (streak >= 365) return { level: 10, title: 'Legendary', color: '#b45309', next: Infinity }
  if (streak >= 180) return { level: 9, title: 'Grandmaster', color: '#dc2626', next: 365 }
  if (streak >= 90)  return { level: 8, title: 'Diamond', color: '#0369a1', next: 180 }
  if (streak >= 60)  return { level: 7, title: 'Platinum', color: '#7c3aed', next: 90 }
  if (streak >= 30)  return { level: 6, title: 'Gold', color: '#d97706', next: 60 }
  if (streak >= 21)  return { level: 5, title: 'Silver', color: '#4b5563', next: 30 }
  if (streak >= 14)  return { level: 4, title: 'Bronze', color: '#92400e', next: 21 }
  if (streak >= 7)   return { level: 3, title: 'Iron', color: '#374151', next: 14 }
  if (streak >= 3)   return { level: 2, title: 'Rookie', color: '#2d4a2d', next: 7 }
  return { level: 1, title: 'Beginner', color: '#6b7280', next: 3 }
}

function getMilestone(streak: number): string | null {
  const m: Record<number, string> = {
    1: '🎉 First day! The journey begins!',
    3: '🌱 3-day streak! Seeds are sprouting!',
    7: '⚡ One full week! Well done!',
    14: '💪 2 weeks strong! Habit forming!',
    21: '🏆 21 days! Science says it\'s a habit!',
    30: '👑 30 days! One month of consistency!',
    60: '🌳 60 days! Deep roots growing!',
    90: '🌟 90 days! Elite level reached!',
    180: '🚀 180 days! Half a year of greatness!',
    365: '🦁 365 days! Truly legendary!',
  }
  return m[streak] ?? null
}

export default function HabitTracker({ username, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('plan')
  const [userId, setUserId] = useState<string | null>(null)
  const [routines, setRoutines] = useState<Routine[]>([])
  const [routineCompletions, setRoutineCompletions] = useState<RoutineCompletion[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [activities, setActivities] = useState<PlanActivity[]>([])
  const [tosses, setTosses] = useState<DailyToss[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [points, setPoints] = useState<UserPoints>({ points: 0, rest_day_credits: 0 })
  const [reminderTime, setReminderTime] = useState('21:00')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [celebration, setCelebration] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const prevStreakRef = useRef<number>(0)

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
    // Routines
    const { data: rts } = await supabase.from('routines').select('*').eq('user_id', uid).order('created_at', { ascending: true })
    const routineIds = (rts ?? []).map(r => r.id)
    const cutoff = formatDate(new Date(Date.now() - 200 * 86400000))
    const { data: rtComps } = routineIds.length > 0
      ? await supabase.from('routine_completions').select('routine_id, completed_date').in('routine_id', routineIds).gte('completed_date', cutoff)
      : { data: [] }

    // Plans + activities + tosses
    const { data: pls } = await supabase.from('plans').select('*').eq('user_id', uid).is('deleted_at', null).order('created_at', { ascending: true })
    const planIds = (pls ?? []).map(p => p.id)
    const { data: acts } = planIds.length > 0
      ? await supabase.from('plan_activities').select('*').in('plan_id', planIds)
      : { data: [] }
    const { data: tss } = planIds.length > 0
      ? await supabase.from('daily_tosses').select('*').in('plan_id', planIds).gte('toss_date', cutoff)
      : { data: [] }

    // Rewards + points + settings
    const { data: rwds } = await supabase.from('rewards').select('*').eq('user_id', uid).order('milestone', { ascending: true })
    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle()
    const { data: pts } = await supabase.from('user_points').select('*').eq('user_id', uid).maybeSingle()

    setRoutines(rts ?? [])
    setRoutineCompletions(rtComps ?? [])
    setPlans(pls ?? [])
    setActivities(acts ?? [])
    setTosses(tss ?? [])
    setRewards(rwds ?? [])
    if (settings) {
      setReminderTime(settings.reminder_time ?? '21:00')
      setReminderEnabled(settings.reminder_enabled ?? false)
    }
    if (pts) setPoints({ points: pts.points ?? 0, rest_day_credits: pts.rest_day_credits ?? 0 })
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

  const activeRoutines = routines.filter(r => !r.deleted_at)
  const todayRoutines = getRoutinesForDay(activeRoutines, todayDOW)
  const todayRoutineDone = new Set(routineCompletions.filter(c => c.completed_date === today).map(c => c.routine_id))

  const todayTosses = tosses.filter(t => t.toss_date === today)
  const recentTosses = tosses // last 200 days already loaded
  const streak = computeTossStreak(tosses)
  const { level, title: levelTitle, color: levelColor, next: nextLevel } = getLevel(streak)
  const milestoneMsg = getMilestone(streak)

  // Stats data
  const totalCompletions = tosses.filter(t => t.completed).length + routineCompletions.length
  const last30Cutoff = new Date(); last30Cutoff.setDate(last30Cutoff.getDate() - 30)
  const last30Key = formatDate(last30Cutoff)
  const last30Tosses = tosses.filter(t => t.toss_date >= last30Key)
  const last30Done = last30Tosses.filter(t => t.completed || (t.is_rest_day && !t.completed)).length
  const last30Rate = last30Tosses.length > 0 ? Math.round((last30Done / last30Tosses.length) * 100) : 0

  // Check newly unlocked rewards
  useEffect(() => {
    if (loading) return
    if (prevStreakRef.current === 0) {
      prevStreakRef.current = streak
      return
    }
    if (streak > prevStreakRef.current) {
      const newlyUnlocked = rewards.find(r =>
        !r.claimed && r.milestone > prevStreakRef.current && r.milestone <= streak
      )
      if (newlyUnlocked) {
        setCelebration(`🎁 Reward unlocked: ${newlyUnlocked.title}!`)
        setTimeout(() => setCelebration(null), 4000)
      }
    }
    prevStreakRef.current = streak
  }, [streak, rewards, loading])

  // Reminder logic
  useEffect(() => {
    if (!reminderEnabled || typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    const checkInterval = setInterval(() => {
      const now = new Date()
      const [h, m] = reminderTime.split(':').map(Number)
      if (now.getHours() === h && now.getMinutes() === m) {
        const todayKey = formatDate(now)
        const lastNotified = localStorage.getItem('last-reminder-date')
        if (lastNotified === todayKey) return
        const incompletePlans = plans.filter(p => {
          const t = todayTosses.find(tt => tt.plan_id === p.id)
          return !t || (!t.is_rest_day && !t.completed)
        })
        if (incompletePlans.length > 0) {
          new Notification('🌿 Streak Master', {
            body: `Don't break your streak! ${incompletePlans.length} plan${incompletePlans.length === 1 ? '' : 's'} pending today.`,
            icon: '/icon-192.png',
          })
          localStorage.setItem('last-reminder-date', todayKey)
        }
      }
    }, 30000)
    return () => clearInterval(checkInterval)
  }, [reminderEnabled, reminderTime, plans, todayTosses])

  // ─── Routine actions ───
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

  // ─── Plan actions ───
  async function addPlan(input: PlanInput) {
    if (!userId) return
    const { data: planRow, error } = await supabase.from('plans').insert({
      user_id: userId,
      name: input.name,
      frequency: input.frequency,
      custom_days_per_week: input.custom_days_per_week ?? null,
      rest_days_per_week: input.rest_days_per_week,
      final_goal: input.final_goal ?? null,
      session_length: input.session_length,
    }).select('*').single()
    if (error || !planRow) return
    // Insert activities
    if (input.activities.length > 0) {
      const { data: actsRows } = await supabase.from('plan_activities').insert(
        input.activities.map(a => ({
          plan_id: planRow.id,
          detail: a.detail,
          difficulty: a.difficulty,
          repeatable: a.repeatable,
        }))
      ).select('*')
      if (actsRows) setActivities(prev => [...prev, ...actsRows])
    }
    setPlans(prev => [...prev, planRow])
    setCelebration(`✨ Plan "${input.name}" created!`)
    setTimeout(() => setCelebration(null), 2500)
  }

  async function deletePlan(planId: string) {
    setPlans(prev => prev.filter(p => p.id !== planId))
    await supabase.from('plans').update({ deleted_at: new Date().toISOString() }).eq('id', planId)
  }

  async function toss(planId: string, activityId: string | null, isRest: boolean) {
    const { data, error } = await supabase.from('daily_tosses').insert({
      plan_id: planId,
      activity_id: activityId,
      toss_date: today,
      is_rest_day: isRest,
    }).select('*').single()
    if (!error && data) {
      setTosses(prev => [...prev, data])
      setCelebration(isRest ? '💤 Rest day! Enjoy.' : '🎲 New activity tossed!')
      setTimeout(() => setCelebration(null), 2500)
    }
  }

  async function completeToss(tossId: string, isRest: boolean) {
    const now = new Date().toISOString()
    const reward = isRest ? 20 : 10
    setTosses(prev => prev.map(t => t.id === tossId ? { ...t, completed: true, completed_at: now } : t))
    await supabase.from('daily_tosses').update({ completed: true, completed_at: now }).eq('id', tossId)
    // Add points
    if (!userId) return
    const newPoints = points.points + reward
    setPoints(p => ({ ...p, points: newPoints }))
    await supabase.from('user_points').upsert({
      user_id: userId, points: newPoints, rest_day_credits: points.rest_day_credits, updated_at: now,
    })
    setCelebration(`+${reward} points! 🎉`)
    setTimeout(() => setCelebration(null), 2500)
  }

  async function buyRestDay() {
    if (points.points < 50 || !userId) return
    const newPts = { points: points.points - 50, rest_day_credits: points.rest_day_credits + 1 }
    setPoints(newPts)
    await supabase.from('user_points').upsert({
      user_id: userId, points: newPts.points, rest_day_credits: newPts.rest_day_credits,
      updated_at: new Date().toISOString(),
    })
    setCelebration('🛏️ Rest day credit purchased!')
    setTimeout(() => setCelebration(null), 2500)
  }

  // ─── Reward actions ───
  async function addReward(milestone: number, title: string) {
    if (!userId) return
    const { data, error } = await supabase.from('rewards').insert({ user_id: userId, milestone, title }).select('*').single()
    if (!error && data) setRewards(prev => [...prev, data])
  }
  async function deleteReward(id: string) {
    setRewards(prev => prev.filter(r => r.id !== id))
    await supabase.from('rewards').delete().eq('id', id)
  }
  async function claimReward(id: string) {
    const now = new Date().toISOString()
    setRewards(prev => prev.map(r => r.id === id ? { ...r, claimed: true, claimed_at: now } : r))
    await supabase.from('rewards').update({ claimed: true, claimed_at: now }).eq('id', id)
    setCelebration('🎉 Reward claimed! Enjoy it!')
    setTimeout(() => setCelebration(null), 3000)
  }

  async function saveReminderSettings(enabled: boolean, time: string) {
    setReminderEnabled(enabled); setReminderTime(time)
    if (!userId) return
    await supabase.from('user_settings').upsert({
      user_id: userId, reminder_enabled: enabled, reminder_time: time,
    })
  }

  if (loading) {
    return (
      <div className="ht-loading">
        <style>{htStyles}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌿</div>
          <p style={{ color: '#8a9e8a', fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem' }}>Loading your streak…</p>
        </div>
      </div>
    )
  }

  // build heatmap-compatible data from tosses (so the heatmap still works)
  const heatmapHabits = plans.map(p => ({
    id: p.id, name: p.name, user_id: '', deleted_at: p.deleted_at ?? null,
    created_at: new Date(Date.now() - 100 * 86400000).toISOString(),
  }))
  const heatmapCompletions = tosses.filter(t => t.completed || (t.is_rest_day && !t.completed))
    .map(t => ({ habit_id: t.plan_id, completed_date: t.toss_date }))

  return (
    <div className="ht-root">
      <style>{htStyles}</style>

      {celebration && <div className="celebration-banner">{celebration}</div>}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      <div className="ht-inner">

        <div className="ht-header">
          <div className="header-left">
            <span style={{ fontSize: '1.25rem' }}>🌿</span>
            <div>
              <div className="header-name">@{username}</div>
              <div className="header-level" style={{ color: levelColor }}>★ Lvl {level} · {levelTitle}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => setShowHelp(true)} className="help-btn" aria-label="Help">
              <HelpCircle style={{ width: 16, height: 16 }} />
            </button>
            <button onClick={onLogout} className="logout-btn">
              <LogOut style={{ width: 13, height: 13 }} /> Switch
            </button>
          </div>
        </div>

        <div className="streak-hero">
          <div className="streak-top">
            <div>
              <div className="streak-number">{streak}</div>
              <div className="streak-label">day streak</div>
            </div>
            <div className="streak-right">
              <div className="streak-badge" style={{ background: levelColor + '18', color: levelColor, border: `1px solid ${levelColor}30` }}>
                ★ {levelTitle}
              </div>
              {nextLevel !== Infinity && <div className="streak-next">{nextLevel - streak} days to next level</div>}
              {nextLevel !== Infinity && (
                <div className="level-bar-bg">
                  <div className="level-bar-fill" style={{ width: `${Math.round((streak / nextLevel) * 100)}%`, background: levelColor }} />
                </div>
              )}
            </div>
          </div>

          {milestoneMsg && <div className="milestone-msg">{milestoneMsg}</div>}
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <Flame style={{ width: 14, height: 14, color: '#d97706' }} />
            <div className="stat-val">{streak}</div>
            <div className="stat-key">Streak</div>
          </div>
          <div className="stat-card">
            <Trophy style={{ width: 14, height: 14, color: '#92400e' }} />
            <div className="stat-val">{points.points}</div>
            <div className="stat-key">Points</div>
          </div>
          <div className="stat-card">
            <Zap style={{ width: 14, height: 14, color: '#2d4a2d' }} />
            <div className="stat-val">{plans.length}</div>
            <div className="stat-key">Plans</div>
          </div>
          <div className="stat-card">
            <Star style={{ width: 14, height: 14, color: levelColor }} />
            <div className="stat-val">{level}</div>
            <div className="stat-key">Level</div>
          </div>
        </div>

        <div className="tab-bar">
          <button className={`tab-btn ${tab === 'plan' ? 'tab-active' : ''}`} onClick={() => setTab('plan')}>
            <Target style={{ width: 13, height: 13 }} /> Plan
          </button>
          <button className={`tab-btn ${tab === 'routines' ? 'tab-active' : ''}`} onClick={() => setTab('routines')}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Routines
          </button>
          <button className={`tab-btn ${tab === 'rewards' ? 'tab-active' : ''}`} onClick={() => setTab('rewards')}>
            <Gift style={{ width: 13, height: 13 }} /> Rewards
          </button>
          <button className={`tab-btn ${tab === 'stats' ? 'tab-active' : ''}`} onClick={() => setTab('stats')}>
            <BarChart3 style={{ width: 13, height: 13 }} /> Stats
          </button>
        </div>

        {tab === 'plan' && (
          <PlanTab
            plans={plans}
            activities={activities}
            todayTosses={todayTosses}
            recentTosses={recentTosses}
            todayDate={today}
            points={points}
            onAddPlan={addPlan}
            onDeletePlan={deletePlan}
            onToss={toss}
            onCompleteToss={completeToss}
            onBuyRestDay={buyRestDay}
          />
        )}

        {tab === 'routines' && (
          <>
            {todayRoutines.length > 0 && (
              <div className="tasks-panel">
                <div className="section-label">Today&apos;s routines</div>
                <div className="task-list">
                  {todayRoutines.map(routine => (
                    <div key={routine.id} className={`task-row ${todayRoutineDone.has(routine.id) ? 'task-done' : ''}`}>
                      <button onClick={() => toggleRoutine(routine.id)} disabled={toggling.has(routine.id)}
                        className={`task-check ${todayRoutineDone.has(routine.id) ? 'task-check-done' : ''}`}>
                        {toggling.has(routine.id)
                          ? <Loader2 style={{ width: 12, height: 12 }} className="spin" />
                          : todayRoutineDone.has(routine.id) ? <Check style={{ width: 12, height: 12 }} strokeWidth={3} /> : null}
                      </button>
                      <span className={`task-label ${todayRoutineDone.has(routine.id) ? 'task-label-done' : ''}`}>{routine.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <RoutinesPanel routines={activeRoutines} onAdd={addRoutine} onDelete={deleteRoutine} />
          </>
        )}

        {tab === 'rewards' && (
          <RewardVault rewards={rewards} currentStreak={streak} onAdd={addReward} onDelete={deleteReward} onClaim={claimReward} />
        )}

        {tab === 'stats' && (
          <>
            <div className="stats-panel">
              <h3 className="stats-panel-title">📊 Your stats</h3>
              <div className="big-stats">
                <div className="big-stat">
                  <div className="big-stat-val">{totalCompletions}</div>
                  <div className="big-stat-key">Total check-ins</div>
                </div>
                <div className="big-stat">
                  <div className="big-stat-val">{last30Rate}%</div>
                  <div className="big-stat-key">Last 30 days</div>
                </div>
                <div className="big-stat">
                  <div className="big-stat-val">{points.points}</div>
                  <div className="big-stat-key">Points</div>
                </div>
              </div>
            </div>
            <div className="heatmap-panel">
              <h3 className="stats-panel-title">📅 Activity heatmap</h3>
              <Heatmap habits={heatmapHabits} completions={heatmapCompletions} />
            </div>
            <ReminderSettings enabled={reminderEnabled} time={reminderTime} onChange={saveReminderSettings} />
          </>
        )}

        <div className="footer-text">Streak Master · synced via @{username}</div>
      </div>
    </div>
  )
}

// ─── Routines Panel (kept simple) ───
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function RoutinesPanel({ routines, onAdd, onDelete }: {
  routines: Routine[]; onAdd: (name: string, days: number[]) => void; onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [days, setDays] = useState<number[]>([])

  function toggleDay(d: number) { setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]) }
  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || days.length === 0) return
    onAdd(name.trim(), days)
    setName(''); setDays([]); setShowForm(false)
  }

  return (
    <div className="tasks-panel">
      <button className="add-habit-btn" onClick={() => setShowForm(v => !v)}>
        <Plus style={{ width: 15, height: 15 }} /> New routine
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="routine-form">
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Routine name…" autoFocus maxLength={60} className="add-input" />
          <div className="day-picker">
            {DAY_NAMES.map((d, i) => (
              <button key={i} type="button" onClick={() => toggleDay(i)}
                className={`day-btn ${days.includes(i) ? 'day-btn-active' : ''}`}>{d}</button>
            ))}
          </div>
          <button type="submit" disabled={!name.trim() || days.length === 0}
            className="add-save-btn" style={{ width: '100%' }}>Save routine</button>
        </form>
      )}

      {routines.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔄</div>
          <p className="empty-text">No routines yet — create one above!</p>
        </div>
      ) : (
        <div className="task-list">
          {routines.map(r => (
            <div key={r.id} className="routine-card">
              <div className="routine-top">
                <span className="routine-name">{r.name}</span>
                <button onClick={() => onDelete(r.id)} className="task-delete"><Trash2 style={{ width: 13, height: 13 }} /></button>
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

const htStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; }

  .ht-loading {
    min-height: 100vh; background: #edeae2;
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', sans-serif;
  }

  .ht-root {
    min-height: 100vh; background: #edeae2;
    font-family: 'DM Sans', sans-serif; color: #1a2e1a;
  }

  .celebration-banner {
    position: fixed; top: 1rem; left: 50%; transform: translateX(-50%);
    background: #2d4a2d; color: #e8f0e8;
    padding: 0.625rem 1.25rem; border-radius: 100px;
    font-family: 'Lora', serif; font-weight: 600; font-size: 0.875rem;
    z-index: 200; white-space: nowrap; max-width: 90%;
    animation: banner-in 0.3s ease-out, banner-out 0.3s ease-in 3.7s forwards;
    box-shadow: 0 4px 20px rgba(45,74,45,0.25);
  }
  @keyframes banner-in { from { opacity:0; transform:translateX(-50%) translateY(-12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
  @keyframes banner-out { from { opacity:1; } to { opacity:0; } }

  .ht-inner {
    max-width: 430px; margin: 0 auto;
    padding: 1rem 1rem 3rem;
    display: flex; flex-direction: column; gap: 0.75rem;
  }

  .ht-header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; }
  .header-left { display: flex; align-items: center; gap: 0.625rem; }
  .header-name { font-size: 0.875rem; font-weight: 500; color: #1a2e1a; }
  .header-level { font-size: 0.7rem; margin-top: 1px; font-weight: 500; }

  .help-btn, .logout-btn {
    display: flex; align-items: center; gap: 0.375rem;
    background: #fff; border: 1px solid #ddd9d0;
    color: #8a9e8a; padding: 0.4rem 0.65rem;
    border-radius: 100px; font-size: 0.72rem;
    cursor: pointer; transition: all 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .help-btn { padding: 0.4rem 0.5rem; }
  .help-btn:hover, .logout-btn:hover { color: #2d4a2d; border-color: #b8b4aa; }

  .streak-hero {
    background: #faf8f4; border: 1px solid #ddd9d0;
    border-radius: 20px; padding: 1.5rem;
  }
  .streak-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .streak-number { font-family: 'Lora', serif; font-size: 4.5rem; font-weight: 700; line-height: 1; color: #1a2e1a; }
  .streak-label { font-size: 0.7rem; color: #9c9688; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 500; margin-top: 4px; }
  .streak-right { flex: 1; display: flex; flex-direction: column; gap: 6px; align-items: flex-end; padding-top: 6px; }
  .streak-badge { font-size: 0.7rem; font-weight: 600; padding: 3px 10px; border-radius: 100px; letter-spacing: 0.04em; }
  .streak-next { font-size: 0.65rem; color: #9c9688; }
  .level-bar-bg { width: 100%; height: 4px; background: #e5e1d8; border-radius: 99px; overflow: hidden; }
  .level-bar-fill { height: 100%; border-radius: 99px; transition: width 0.8s ease; }

  .milestone-msg {
    margin-top: 1rem;
    background: #f0f4ee; border: 1px solid #c8d8c8;
    border-radius: 10px; padding: 0.625rem 0.875rem;
    font-size: 0.8rem; color: #3a6b3a; font-weight: 500;
    font-family: 'Lora', serif; font-style: italic;
  }

  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
  .stat-card {
    background: #faf8f4; border: 1px solid #e0ddd5;
    border-radius: 14px; padding: 0.875rem 0.5rem;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
  }
  .stat-val { font-family: 'Lora', serif; font-size: 1.15rem; font-weight: 700; color: #1a2e1a; }
  .stat-key { font-size: 0.6rem; color: #9c9688; text-transform: uppercase; letter-spacing: 0.06em; }

  .tab-bar {
    display: grid; grid-template-columns: repeat(4, 1fr);
    background: #faf8f4; border: 1px solid #ddd9d0;
    border-radius: 12px; padding: 3px; gap: 3px;
  }
  .tab-btn {
    display: flex; align-items: center; justify-content: center; gap: 4px;
    padding: 0.5rem 0.25rem; border-radius: 9px; border: none;
    background: transparent; color: #9c9688;
    font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 500;
    cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .tab-btn:hover { color: #2d4a2d; }
  .tab-active { background: #2d4a2d !important; color: #e8f0e8 !important; }

  .tasks-panel, .stats-panel, .heatmap-panel {
    background: #faf8f4; border: 1px solid #ddd9d0;
    border-radius: 20px; padding: 1.25rem;
    display: flex; flex-direction: column; gap: 0.875rem;
  }

  .stats-panel-title { font-family: 'Lora', serif; font-size: 1rem; font-weight: 700; color: #1a2e1a; margin: 0; }

  .big-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
  .big-stat { background: #fff; border: 1px solid #e5e1d8; border-radius: 12px; padding: 0.875rem 0.5rem; display: flex; flex-direction: column; align-items: center; }
  .big-stat-val { font-family: 'Lora', serif; font-size: 1.5rem; font-weight: 700; color: #2d4a2d; }
  .big-stat-key { font-size: 0.65rem; color: #9c9688; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; text-align: center; }

  .add-habit-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    width: 100%; padding: 0.7rem;
    background: transparent; border: 1.5px dashed #b8d4b8;
    border-radius: 10px; color: #3a6b3a;
    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
  }
  .add-habit-btn:hover { background: #f0f4ee; border-style: solid; }

  .add-input {
    flex: 1; background: #fff; border: 1.5px solid #ddd9d0;
    border-radius: 10px; padding: 0.6rem 0.875rem;
    color: #1a2e1a; font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
    outline: none; transition: all 0.2s;
  }
  .add-input:focus { border-color: #3a6b3a; box-shadow: 0 0 0 3px rgba(58,107,58,0.1); }
  .add-input::placeholder { color: #c8c4ba; }

  .add-save-btn {
    background: #2d4a2d; border: none; border-radius: 10px;
    color: #e8f0e8; font-family: 'Lora', serif;
    font-size: 0.85rem; font-weight: 600; padding: 0.6rem 1rem;
    cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; justify-content: center;
  }
  .add-save-btn:hover:not(:disabled) { background: #3a6b3a; }
  .add-save-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .section-label { font-size: 0.65rem; font-weight: 600; color: #9c9688; text-transform: uppercase; letter-spacing: 0.1em; }
  .task-list { display: flex; flex-direction: column; gap: 0.4rem; }

  .task-row {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem 0.875rem;
    background: #fff; border: 1px solid #e5e1d8;
    border-radius: 12px; transition: all 0.2s;
  }
  .task-done { background: #f0f4ee !important; border-color: #c8d8c8 !important; }
  .task-check {
    width: 24px; height: 24px; border-radius: 6px;
    border: 1.5px solid #c8c4ba; background: transparent;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; cursor: pointer; transition: all 0.15s; color: #fff;
  }
  .task-check:hover:not(:disabled) { border-color: #3a6b3a; background: #f0f4ee; }
  .task-check-done { background: #2d4a2d !important; border-color: #2d4a2d !important; }
  .task-label { flex: 1; font-size: 0.9rem; color: #2c3e2c; transition: all 0.2s; }
  .task-label-done { color: #8a9e8a !important; text-decoration: line-through; }
  .task-delete { color: #c8c4ba; background: transparent; border: none; cursor: pointer; padding: 3px; border-radius: 5px; display: flex; align-items: center; transition: color 0.15s; flex-shrink: 0; }
  .task-delete:hover:not(:disabled) { color: #dc2626; }

  .routine-form { display: flex; flex-direction: column; gap: 0.625rem; }
  .day-picker { display: flex; gap: 4px; }
  .day-btn {
    flex: 1; padding: 0.35rem 0; border-radius: 8px;
    border: 1px solid #e0ddd5; background: #fff;
    color: #9c9688; font-family: 'DM Sans', sans-serif;
    font-size: 0.7rem; font-weight: 500; cursor: pointer; transition: all 0.15s;
  }
  .day-btn:hover { border-color: #3a6b3a; color: #2d4a2d; }
  .day-btn-active { background: #2d4a2d !important; border-color: #2d4a2d !important; color: #e8f0e8 !important; }

  .routine-card { background: #fff; border: 1px solid #e5e1d8; border-radius: 12px; padding: 0.875rem; }
  .routine-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .routine-name { font-size: 0.9rem; font-weight: 500; color: #2c3e2c; }
  .routine-days { display: flex; gap: 3px; }
  .routine-day { font-size: 0.65rem; padding: 2px 5px; border-radius: 5px; background: #f5f3ef; color: #9c9688; font-weight: 500; }
  .routine-day-active { background: #2d4a2d !important; color: #e8f0e8 !important; }

  .empty-state { text-align: center; padding: 2rem 1rem; }
  .empty-text { color: #9c9688; font-size: 0.875rem; font-family: 'Lora', serif; font-style: italic; }

  .footer-text { text-align: center; color: #9c9688; font-size: 0.7rem; padding-top: 0.5rem; }

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`

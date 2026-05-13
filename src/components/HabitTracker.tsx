'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  type Habit,
  type Completion,
  formatDate,
  calculateStreak,
  isTodayComplete,
  getWeekStatus,
} from '@/lib/habitUtils'
import StreakDisplay from './StreakDisplay'
import WeekView from './WeekView'
import { Plus, Trash2, LogOut, Check, Loader2 } from 'lucide-react'

interface Props {
  username: string
  onLogout: () => void
}

export default function HabitTracker({ username, onLogout }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [allHabits, setAllHabits] = useState<Habit[]>([])   // includes deleted (for streak history)
  const [completions, setCompletions] = useState<Completion[]>([])
  const [newHabitName, setNewHabitName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  const today = formatDate(new Date())

  // Get or create user row
  const initUser = useCallback(async () => {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) return existing.id

    const { data: created, error } = await supabase
      .from('users')
      .insert({ username })
      .select('id')
      .single()

    if (error) throw error
    return created.id
  }, [username])

  const loadData = useCallback(async (uid: string) => {
    // Fetch all habits (including deleted, for streak history)
    const { data: habits } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true })

    const habitIds = (habits ?? []).map(h => h.id)

    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const { data: comps } = habitIds.length > 0
      ? await supabase
          .from('completions')
          .select('habit_id, completed_date')
          .in('habit_id', habitIds)
          .gte('completed_date', formatDate(sixtyDaysAgo))
      : { data: [] }

    setAllHabits(habits ?? [])
    setCompletions(comps ?? [])
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

  const todayCompletionIds = new Set(
    completions.filter(c => c.completed_date === today).map(c => c.habit_id)
  )

  const streak = calculateStreak(allHabits, completions)
  const todayComplete = isTodayComplete(allHabits, completions)
  const weekDays = getWeekStatus(allHabits, completions)

  async function toggleCompletion(habitId: string) {
    if (toggling.has(habitId)) return
    setToggling(prev => new Set(prev).add(habitId))

    const isDone = todayCompletionIds.has(habitId)
    // Optimistic update
    if (isDone) {
      setCompletions(prev => prev.filter(c => !(c.habit_id === habitId && c.completed_date === today)))
    } else {
      setCompletions(prev => [...prev, { habit_id: habitId, completed_date: today }])
    }

    if (isDone) {
      await supabase
        .from('completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('completed_date', today)
    } else {
      await supabase
        .from('completions')
        .upsert({ habit_id: habitId, completed_date: today })
    }

    setToggling(prev => { const s = new Set(prev); s.delete(habitId); return s })
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault()
    const name = newHabitName.trim()
    if (!name || !userId) return
    setAdding(true)

    const { data, error } = await supabase
      .from('habits')
      .insert({ user_id: userId, name })
      .select('*')
      .single()

    if (!error && data) {
      setAllHabits(prev => [...prev, data])
      setNewHabitName('')
      setShowAdd(false)
    }
    setAdding(false)
  }

  async function deleteHabit(habitId: string) {
    if (deleting.has(habitId)) return
    setDeleting(prev => new Set(prev).add(habitId))

    // Soft delete: mark deleted_at so streak history is preserved
    const now = new Date().toISOString()
    setAllHabits(prev => prev.map(h => h.id === habitId ? { ...h, deleted_at: now } : h))

    await supabase
      .from('habits')
      .update({ deleted_at: now })
      .eq('id', habitId)

    setDeleting(prev => { const s = new Set(prev); s.delete(habitId); return s })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between pt-2 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm font-medium">@{username}</span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Switch user
          </button>
        </div>

        {/* Streak card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
          <StreakDisplay streak={streak} todayComplete={todayComplete} />
        </div>

        {/* Week view */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
          <WeekView days={weekDays} />
        </div>

        {/* Today's habits */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold">Today's Habits</h2>
              <p className="text-white/40 text-xs mt-0.5">
                {todayCompletionIds.size} / {activeHabits.length} complete
              </p>
            </div>
            <button
              onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Add habit form */}
          {showAdd && (
            <form onSubmit={addHabit} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newHabitName}
                onChange={e => setNewHabitName(e.target.value)}
                placeholder="New habit name…"
                autoFocus
                maxLength={60}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={adding || !newHabitName.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            </form>
          )}

          {/* Habit list */}
          {activeHabits.length === 0 ? (
            <div className="text-center py-8 text-white/30">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">No habits yet. Add one above!</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {activeHabits.map(habit => {
                const done = todayCompletionIds.has(habit.id)
                const isToggling = toggling.has(habit.id)
                const isDeleting = deleting.has(habit.id)

                return (
                  <li
                    key={habit.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                      done
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <button
                      onClick={() => toggleCompletion(habit.id)}
                      disabled={isToggling}
                      className={`
                        w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        transition-all duration-200
                        ${done
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-white/30 hover:border-white/60 bg-transparent'
                        }
                        ${isToggling ? 'opacity-50' : ''}
                      `}
                    >
                      {isToggling
                        ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                        : done
                        ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        : null
                      }
                    </button>

                    <span className={`flex-1 text-sm font-medium transition-all duration-200 ${
                      done ? 'text-emerald-300 line-through decoration-emerald-500/50' : 'text-white'
                    }`}>
                      {habit.name}
                    </span>

                    <button
                      onClick={() => deleteHabit(habit.id)}
                      disabled={isDeleting}
                      className="text-white/20 hover:text-red-400 transition-colors p-1 rounded"
                    >
                      {isDeleting
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <p className="text-center text-white/20 text-xs pb-4">
          Habit Streak • Data syncs across devices via your username
        </p>
      </div>
    </div>
  )
}

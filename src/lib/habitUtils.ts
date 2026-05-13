export interface Habit {
  id: string
  user_id: string
  name: string
  created_at: string
  deleted_at: string | null
}

export interface Completion {
  habit_id: string
  completed_date: string
}

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Returns habits active (created ≤ date, not yet deleted) on a given date. */
function habitsActiveOn(allHabits: Habit[], date: Date): Habit[] {
  const day = startOfDay(date)
  return allHabits.filter(h => {
    const created = startOfDay(new Date(h.created_at))
    if (created > day) return false
    if (h.deleted_at) {
      const deleted = startOfDay(new Date(h.deleted_at))
      if (deleted <= day) return false
    }
    return true
  })
}

/**
 * Calculates the streak: consecutive completed days ending at today or yesterday.
 * A day counts if every habit active that day was completed.
 * Today is skipped if not all done yet (the streak is "as of yesterday").
 */
export function calculateStreak(allHabits: Habit[], completions: Completion[]): number {
  if (allHabits.length === 0) return 0

  const byDate = new Map<string, Set<string>>()
  for (const c of completions) {
    if (!byDate.has(c.completed_date)) byDate.set(c.completed_date, new Set())
    byDate.get(c.completed_date)!.add(c.habit_id)
  }

  const today = startOfDay(new Date())
  let streak = 0

  for (let i = 0; i < 365; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateStr = formatDate(date)

    const active = habitsActiveOn(allHabits, date)
    if (active.length === 0) {
      // No habits existed yet — stop looking back
      if (streak > 0) break
      continue
    }

    const done = byDate.get(dateStr) ?? new Set()
    const allDone = active.every(h => done.has(h.id))

    if (!allDone) {
      if (i === 0) continue // Today not done yet — check yesterday
      break
    }

    streak++
  }

  return streak
}

/**
 * Returns true if all active habits for today are completed.
 */
export function isTodayComplete(allHabits: Habit[], completions: Completion[]): boolean {
  const today = startOfDay(new Date())
  const active = habitsActiveOn(allHabits, today)
  if (active.length === 0) return false
  const todayStr = formatDate(today)
  const done = new Set(completions.filter(c => c.completed_date === todayStr).map(c => c.habit_id))
  return active.every(h => done.has(h.id))
}

/**
 * Returns status for each of the last 7 days (index 0 = 6 days ago, index 6 = today).
 */
export function getWeekStatus(allHabits: Habit[], completions: Completion[]): Array<{
  date: Date
  dateStr: string
  label: string
  status: 'complete' | 'incomplete' | 'future' | 'empty'
}> {
  const byDate = new Map<string, Set<string>>()
  for (const c of completions) {
    if (!byDate.has(c.completed_date)) byDate.set(c.completed_date, new Set())
    byDate.get(c.completed_date)!.add(c.habit_id)
  }

  const today = startOfDay(new Date())
  const labels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - i))
    const dateStr = formatDate(date)
    const label = labels[date.getDay()]

    const active = habitsActiveOn(allHabits, date)
    if (active.length === 0) return { date, dateStr, label, status: 'empty' as const }

    if (date > today) return { date, dateStr, label, status: 'future' as const }

    const done = byDate.get(dateStr) ?? new Set()
    const allDone = active.every(h => done.has(h.id))
    return { date, dateStr, label, status: allDone ? 'complete' : 'incomplete' as const }
  })
}

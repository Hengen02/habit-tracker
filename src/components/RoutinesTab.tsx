'use client'

import { useState } from 'react'
import { type Routine, DAY_LABELS } from '@/lib/habitUtils'
import { Plus, Trash2, Loader2, RefreshCw } from 'lucide-react'

interface Props {
  routines: Routine[]
  onAdd: (name: string, days: number[]) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function RoutinesTab({ routines, onAdd, onDelete }: Props) {
  const [name, setName] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)

  const todayDOW = new Date().getDay()

  function toggleDay(d: number) {
    setSelectedDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b)
    )
  }

  // Quick-select presets
  function selectWeekdays() { setSelectedDays([1, 2, 3, 4, 5]) }
  function selectWeekend() { setSelectedDays([0, 6]) }
  function selectAll() { setSelectedDays([0, 1, 2, 3, 4, 5, 6]) }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || selectedDays.length === 0) return
    setAdding(true)
    await onAdd(trimmed, selectedDays)
    setName('')
    setSelectedDays([])
    setShowForm(false)
    setAdding(false)
  }

  async function handleDelete(id: string) {
    setDeleting(prev => new Set(prev).add(id))
    await onDelete(id)
    setDeleting(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  return (
    <div className="space-y-4">

      {/* Header card with add form */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-purple-400" />
            <h2 className="text-white font-semibold">Fixed Routines</h2>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setName(''); setSelectedDays([]) }}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        </div>
        <p className="text-white/40 text-xs">Tasks that repeat only on specific days of the week</p>

        {showForm && (
          <form onSubmit={handleAdd} className="mt-5 space-y-4">
            {/* Name */}
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Routine name (e.g. Work, Gym, Study)"
              autoFocus
              maxLength={60}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            {/* Day picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/50 text-xs font-medium">Repeat on</p>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={selectWeekdays} className="text-purple-400 hover:text-purple-300 transition-colors">Weekdays</button>
                  <span className="text-white/20">·</span>
                  <button type="button" onClick={selectWeekend} className="text-purple-400 hover:text-purple-300 transition-colors">Weekend</button>
                  <span className="text-white/20">·</span>
                  <button type="button" onClick={selectAll} className="text-purple-400 hover:text-purple-300 transition-colors">Every day</button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedDays.includes(i)
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white/8 text-white/40 hover:text-white/70 hover:bg-white/12'
                    } ${i === todayDOW ? 'ring-1 ring-white/25' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {selectedDays.length === 0 && (
                <p className="text-red-400/70 text-xs mt-1.5">Pick at least one day</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); setName(''); setSelectedDays([]) }}
                className="flex-1 bg-white/8 hover:bg-white/12 text-white/60 py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding || !name.trim() || selectedDays.length === 0}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Routine'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Routine list */}
      {routines.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center backdrop-blur">
          <p className="text-4xl mb-3">🔄</p>
          <p className="text-white/50 text-sm font-medium">No routines yet</p>
          <p className="text-white/30 text-xs mt-1">Create one to add tasks that repeat on specific days.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {routines.map(routine => {
            const isDeleting = deleting.has(routine.id)
            const isToday = routine.days.includes(todayDOW)
            return (
              <div
                key={routine.id}
                className={`bg-white/5 border rounded-2xl p-4 flex items-start gap-3 transition-all backdrop-blur ${
                  isToday ? 'border-purple-500/40' : 'border-white/10'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2.5">
                    <span className="text-white font-medium text-sm">{routine.name}</span>
                    {isToday && (
                      <span className="text-xs text-purple-300 bg-purple-500/25 px-2 py-0.5 rounded-full font-medium">
                        active today
                      </span>
                    )}
                  </div>
                  {/* Day badges */}
                  <div className="flex gap-1 flex-wrap">
                    {DAY_LABELS.map((label, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${
                          routine.days.includes(i)
                            ? 'bg-purple-600/50 text-purple-200'
                            : 'bg-white/5 text-white/20'
                        } ${i === todayDOW && routine.days.includes(i) ? 'ring-1 ring-purple-400/50' : ''}`}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(routine.id)}
                  disabled={isDeleting}
                  className="text-white/20 hover:text-red-400 transition-colors p-1 rounded flex-shrink-0 mt-0.5"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

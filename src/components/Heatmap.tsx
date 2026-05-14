'use client'

import { type Habit, type Completion, formatDate } from '@/lib/habitUtils'

interface Props {
  habits: Habit[]
  completions: Completion[]
}

export default function Heatmap({ habits, completions }: Props) {
  // Build last 182 days (26 weeks) - works well for mobile
  const days = 182
  const weeks = 26
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Map: date -> { done, total }
  const dayMap = new Map<string, { done: number; total: number }>()

  // Build all dates
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = formatDate(d)
    // count habits active on that day
    const active = habits.filter(h => {
      const created = new Date(h.created_at)
      created.setHours(0, 0, 0, 0)
      if (d < created) return false
      if (h.deleted_at) {
        const deleted = new Date(h.deleted_at)
        deleted.setHours(0, 0, 0, 0)
        if (d >= deleted) return false
      }
      return true
    })
    const done = completions.filter(c => c.completed_date === key).length
    dayMap.set(key, { done, total: active.length })
  }

  // Build grid: weeks x 7 days
  const grid: ({ date: string; intensity: number } | null)[][] = []
  const todayDow = today.getDay()

  // Start from oldest week
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (weeks * 7 - 1 - (6 - todayDow)))

  for (let w = 0; w < weeks; w++) {
    const week: ({ date: string; intensity: number } | null)[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + w * 7 + d)
      if (date > today) {
        week.push(null)
      } else {
        const key = formatDate(date)
        const info = dayMap.get(key) || { done: 0, total: 0 }
        let intensity = 0
        if (info.total > 0) {
          const pct = info.done / info.total
          if (pct >= 1) intensity = 4
          else if (pct >= 0.66) intensity = 3
          else if (pct >= 0.33) intensity = 2
          else if (pct > 0) intensity = 1
        }
        week.push({ date: key, intensity })
      }
    }
    grid.push(week)
  }

  const colors = ['#e5e1d8', '#c8d8c8', '#9bbf9b', '#5a8c5a', '#2d4a2d']

  return (
    <div className="heatmap-container">
      <style>{`
        .heatmap-container { display: flex; flex-direction: column; gap: 8px; }
        .heatmap-title {
          font-size: 0.7rem; color: #9c9688; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .heatmap-grid {
          display: flex; gap: 3px; overflow-x: auto;
          padding-bottom: 4px;
        }
        .heatmap-grid::-webkit-scrollbar { height: 4px; }
        .heatmap-grid::-webkit-scrollbar-thumb { background: #c8c4ba; border-radius: 99px; }
        .heatmap-col { display: flex; flex-direction: column; gap: 3px; flex-shrink: 0; }
        .heatmap-cell {
          width: 11px; height: 11px; border-radius: 2px;
          transition: transform 0.15s;
        }
        .heatmap-cell:hover { transform: scale(1.4); cursor: pointer; }
        .heatmap-cell.empty { background: transparent; }
        .heatmap-legend {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 0.65rem; color: #9c9688;
        }
        .legend-cells { display: flex; gap: 3px; align-items: center; }
        .legend-cells > div { width: 10px; height: 10px; border-radius: 2px; }
      `}</style>

      <div className="heatmap-title">Past 26 weeks</div>

      <div className="heatmap-grid">
        {grid.map((week, wi) => (
          <div key={wi} className="heatmap-col">
            {week.map((day, di) => (
              <div
                key={di}
                className={`heatmap-cell ${day === null ? 'empty' : ''}`}
                style={day ? { background: colors[day.intensity] } : {}}
                title={day ? `${day.date}` : ''}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="heatmap-legend">
        <span>Less</span>
        <div className="legend-cells">
          {colors.map((c, i) => <div key={i} style={{ background: c }} />)}
        </div>
        <span>More</span>
      </div>
    </div>
  )
}

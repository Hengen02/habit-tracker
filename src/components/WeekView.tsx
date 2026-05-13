'use client'

import { formatDate } from '@/lib/habitUtils'

interface DayStatus {
  date: Date
  dateStr: string
  label: string
  status: 'complete' | 'incomplete' | 'future' | 'empty'
}

interface WeekViewProps {
  days: DayStatus[]
}

export default function WeekView({ days }: WeekViewProps) {
  const today = formatDate(new Date())

  return (
    <div>
      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">This Week</h2>
      <div className="flex gap-2 justify-between">
        {days.map((day) => {
          const isToday = day.dateStr === today

          let circleClass = ''
          let icon = ''

          if (day.status === 'complete') {
            circleClass = 'bg-emerald-500 border-emerald-400'
            icon = '✓'
          } else if (day.status === 'incomplete') {
            circleClass = 'bg-red-500/30 border-red-500/50'
            icon = '✗'
          } else if (day.status === 'future') {
            circleClass = 'bg-white/5 border-white/10'
            icon = ''
          } else {
            // empty — no habits that day
            circleClass = 'bg-white/5 border-white/10'
            icon = ''
          }

          return (
            <div key={day.dateStr} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`
                  w-10 h-10 rounded-full border-2 flex items-center justify-center
                  text-sm font-bold transition-all duration-200
                  ${circleClass}
                  ${isToday ? 'ring-2 ring-white/30 ring-offset-2 ring-offset-transparent' : ''}
                `}
              >
                <span className={day.status === 'complete' ? 'text-white' : day.status === 'incomplete' ? 'text-red-300' : 'text-transparent'}>
                  {icon}
                </span>
              </div>
              <span className={`text-xs font-medium ${isToday ? 'text-white' : 'text-white/40'}`}>
                {day.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

interface StreakDisplayProps {
  streak: number
  todayComplete: boolean
}

export default function StreakDisplay({ streak, todayComplete }: StreakDisplayProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`text-5xl transition-transform duration-300 ${streak > 0 ? 'scale-110' : 'opacity-40'}`}>
        🔥
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">{streak}</span>
          <span className="text-white/60 text-sm font-medium">day streak</span>
        </div>
        <p className="text-xs mt-0.5 font-medium">
          {streak === 0
            ? <span className="text-white/40">Complete all tasks to start your streak</span>
            : todayComplete
            ? <span className="text-emerald-400">Today complete! Keep it up 💪</span>
            : <span className="text-amber-400">Finish today's tasks to extend!</span>}
        </p>
      </div>
    </div>
  )
}

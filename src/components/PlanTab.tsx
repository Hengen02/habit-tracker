'use client'

import { useState } from 'react'
import { Plus, Dice5, Sparkles, Check, Trash2, Coins, Bed, Award, Loader2, Target } from 'lucide-react'
import PlanSetup, { type PlanInput } from './PlanSetup'

export interface Plan {
  id: string
  name: string
  frequency: 'daily' | 'every_2_3' | 'weekly' | 'custom'
  custom_days_per_week?: number | null
  rest_days_per_week: number
  final_goal?: string | null
  session_length: string
  deleted_at?: string | null
}
export interface PlanActivity {
  id: string
  plan_id: string
  detail: string
  difficulty: 'easy' | 'normal' | 'hard'
  repeatable: boolean
}
export interface DailyToss {
  id: string
  plan_id: string
  activity_id: string | null
  toss_date: string
  is_rest_day: boolean
  completed: boolean
  completed_at?: string | null
}
export interface UserPoints {
  points: number
  rest_day_credits: number
}

interface Props {
  plans: Plan[]
  activities: PlanActivity[]
  todayTosses: DailyToss[]            // tosses for today
  recentTosses: DailyToss[]            // last ~14 days for smart random
  todayDate: string
  points: UserPoints
  onAddPlan: (plan: PlanInput) => Promise<void>
  onDeletePlan: (planId: string) => Promise<void>
  onToss: (planId: string, activityId: string | null, isRest: boolean) => Promise<void>
  onCompleteToss: (tossId: string, isRest: boolean) => Promise<void>
  onBuyRestDay: () => Promise<void>
}

export default function PlanTab({
  plans, activities, todayTosses, recentTosses, todayDate, points,
  onAddPlan, onDeletePlan, onToss, onCompleteToss, onBuyRestDay,
}: Props) {
  const [showSetup, setShowSetup] = useState(false)
  const [tossing, setTossing] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  function targetActiveDays(plan: Plan): number {
    switch (plan.frequency) {
      case 'daily': return 7
      case 'every_2_3': return 3
      case 'weekly': return 1
      case 'custom': return plan.custom_days_per_week ?? 3
    }
  }

  // SMART RANDOM TOSS algorithm
  function smartToss(plan: Plan): { activityId: string | null; isRest: boolean } {
    const planActs = activities.filter(a => a.plan_id === plan.id)
    if (planActs.length === 0) return { activityId: null, isRest: true }

    // Recent tosses for this plan (last 7 days)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const recent = recentTosses.filter(t => t.plan_id === plan.id && t.toss_date >= cutoffStr)

    // Count active vs rest days last 7
    const activeRecent = recent.filter(t => !t.is_rest_day).length
    const restRecent = recent.filter(t => t.is_rest_day).length
    const target = targetActiveDays(plan)

    // Decide rest vs active
    // Rule: if we've already hit/passed weekly active target → rest
    // Or if we have 2+ active days in a row → consider rest
    const last2 = recent.slice(-2)
    const last2Active = last2.length >= 2 && last2.every(t => !t.is_rest_day)
    let shouldRest = false
    if (activeRecent >= target) shouldRest = true
    else if (last2Active && restRecent < plan.rest_days_per_week) shouldRest = true
    else if (restRecent < plan.rest_days_per_week && Math.random() < (plan.rest_days_per_week / 7)) shouldRest = true

    if (shouldRest) return { activityId: null, isRest: true }

    // Pick activity — avoid recent ones, respect repeatable flag
    const recentActIds = new Set(recent.filter(t => t.activity_id).map(t => t.activity_id))
    // First filter: exclude non-repeatable that already appeared in recent
    let candidates = planActs.filter(a => {
      if (!a.repeatable && recentActIds.has(a.id)) return false
      return true
    })
    if (candidates.length === 0) candidates = planActs // fall back

    // Prefer activities NOT used in the last 2 days
    const last2Acts = new Set(last2.filter(t => t.activity_id).map(t => t.activity_id))
    const fresh = candidates.filter(a => !last2Acts.has(a.id))
    const pool = fresh.length > 0 ? fresh : candidates

    // Weight by difficulty (normal = highest weight, easy/hard = lower)
    const weighted: PlanActivity[] = []
    pool.forEach(a => {
      const w = a.difficulty === 'normal' ? 3 : a.difficulty === 'easy' ? 2 : 2
      for (let i = 0; i < w; i++) weighted.push(a)
    })
    const picked = weighted[Math.floor(Math.random() * weighted.length)]
    return { activityId: picked.id, isRest: false }
  }

  async function handleToss(plan: Plan) {
    if (tossing) return
    setTossing(plan.id)
    const result = smartToss(plan)
    await onToss(plan.id, result.activityId, result.isRest)
    setTimeout(() => setTossing(null), 500)
  }

  async function handleComplete(toss: DailyToss) {
    if (completing) return
    setCompleting(toss.id)
    await onCompleteToss(toss.id, toss.is_rest_day)
    setCompleting(null)
  }

  return (
    <div className="pt-root">
      <style>{`
        .pt-root { display: flex; flex-direction: column; gap: 0.75rem; }

        .points-bar {
          background: linear-gradient(135deg, #faf8f4, #f0f4ee);
          border: 1px solid #c8d8c8;
          border-radius: 16px; padding: 0.875rem 1rem;
          display: flex; align-items: center; gap: 0.875rem;
        }
        .points-item {
          flex: 1; display: flex; align-items: center; gap: 0.5rem;
        }
        .points-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: #fff; border: 1px solid #c8d8c8;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .points-val {
          font-family: 'Lora', serif; font-weight: 700;
          font-size: 1.1rem; color: #1a2e1a; line-height: 1;
        }
        .points-key {
          font-size: 0.65rem; color: #8a9e8a;
          letter-spacing: 0.04em; text-transform: uppercase;
          margin-top: 2px;
        }
        .buy-rest-btn {
          background: #d97706; border: none; color: #fff;
          padding: 0.5rem 0.75rem; border-radius: 8px;
          font-family: 'Lora', serif; font-weight: 600;
          font-size: 0.75rem; cursor: pointer;
          display: flex; align-items: center; gap: 4px;
          transition: all 0.15s; white-space: nowrap;
        }
        .buy-rest-btn:hover:not(:disabled) { background: #b45309; }
        .buy-rest-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .add-plan-btn {
          background: #2d4a2d; border: none; color: #e8f0e8;
          padding: 1rem; border-radius: 14px;
          font-family: 'Lora', serif; font-weight: 600;
          font-size: 1rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          transition: all 0.15s;
          width: 100%;
        }
        .add-plan-btn:hover { background: #3a6b3a; transform: translateY(-1px); }
        .add-plan-btn.secondary {
          background: transparent; color: #3a6b3a;
          border: 1.5px dashed #b8d4b8; padding: 0.75rem;
          font-size: 0.85rem;
        }
        .add-plan-btn.secondary:hover { background: #f0f4ee; border-style: solid; transform: none; }

        .plan-card {
          background: #faf8f4; border: 1px solid #ddd9d0;
          border-radius: 18px; padding: 1rem;
          display: flex; flex-direction: column; gap: 0.75rem;
        }
        .plan-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 0.5rem;
        }
        .plan-name-row { display: flex; align-items: center; gap: 0.5rem; min-width: 0; flex: 1; }
        .plan-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: #2d4a2d; color: #e8f0e8;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .plan-name {
          font-family: 'Lora', serif; font-weight: 700;
          font-size: 1.05rem; color: #1a2e1a;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .plan-meta {
          font-size: 0.7rem; color: #8a9e8a; margin-top: 1px;
        }
        .plan-delete {
          background: transparent; border: none; color: #c8c4ba;
          cursor: pointer; padding: 4px; border-radius: 5px;
          display: flex; align-items: center;
        }
        .plan-delete:hover { color: #dc2626; }

        .plan-goal {
          background: #fff; border: 1px solid #e5e1d8;
          border-radius: 10px; padding: 0.5rem 0.75rem;
          font-size: 0.78rem; color: #5a6c5a;
          font-style: italic; font-family: 'Lora', serif;
        }
        .plan-goal strong { font-style: normal; color: #2d4a2d; font-weight: 600; }

        .toss-btn {
          width: 100%;
          background: linear-gradient(135deg, #2d4a2d, #3a6b3a);
          border: none; color: #fff;
          padding: 0.875rem; border-radius: 12px;
          font-family: 'Lora', serif; font-weight: 700;
          font-size: 0.95rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(45,74,45,0.2);
        }
        .toss-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(45,74,45,0.3);
        }
        .toss-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .toss-btn.tossing { animation: shake 0.5s ease-in-out; }
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          25% { transform: translateX(-3px) rotate(-2deg); }
          75% { transform: translateX(3px) rotate(2deg); }
        }

        .toss-result {
          background: #fff; border: 2px solid #2d4a2d;
          border-radius: 14px; padding: 1rem;
          animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes pop-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .toss-result.rest {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border-color: #d97706;
        }
        .toss-result-label {
          font-size: 0.65rem; color: #8a9e8a; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.1em;
          margin-bottom: 0.4rem;
        }
        .toss-result.rest .toss-result-label { color: #92400e; }
        .toss-result-detail {
          font-family: 'Lora', serif; font-size: 1.1rem;
          font-weight: 600; color: #1a2e1a; line-height: 1.3;
        }
        .toss-result.rest .toss-result-detail { color: #78350f; }
        .toss-result-meta {
          display: flex; gap: 0.4rem; margin-top: 0.5rem;
          align-items: center; flex-wrap: wrap;
        }
        .toss-tag {
          font-size: 0.65rem; padding: 2px 8px; border-radius: 100px;
          background: #f0f4ee; color: #2d4a2d; font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .toss-tag.diff-easy { background: #e5e7eb; color: #4b5563; }
        .toss-tag.diff-normal { background: #c8d8c8; color: #2d4a2d; }
        .toss-tag.diff-hard { background: #fed7aa; color: #9a3412; }

        .complete-btn {
          width: 100%; margin-top: 0.75rem;
          background: #2d4a2d; border: none; color: #e8f0e8;
          padding: 0.75rem; border-radius: 10px;
          font-family: 'Lora', serif; font-weight: 600;
          font-size: 0.9rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
          transition: all 0.15s;
        }
        .complete-btn:hover:not(:disabled) { background: #3a6b3a; }
        .complete-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .complete-btn.done { background: #6b7c6b; cursor: default; }

        .complete-btn.bonus {
          background: linear-gradient(135deg, #d97706, #b45309);
        }
        .complete-btn.bonus:hover:not(:disabled) {
          background: linear-gradient(135deg, #b45309, #92400e);
        }

        .empty-plan-state {
          text-align: center; padding: 2rem 1rem;
          background: #faf8f4; border: 1px dashed #c8c4ba;
          border-radius: 18px;
        }
        .empty-plan-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .empty-plan-text {
          color: #5a6c5a; font-size: 0.9rem;
          font-family: 'Lora', serif; font-style: italic;
          margin-bottom: 0.875rem;
        }
      `}</style>

      {/* Points bar */}
      <div className="points-bar">
        <div className="points-item">
          <div className="points-icon"><Coins style={{ width: 16, height: 16, color: '#d97706' }} /></div>
          <div>
            <div className="points-val">{points.points}</div>
            <div className="points-key">Points</div>
          </div>
        </div>
        <div className="points-item">
          <div className="points-icon"><Bed style={{ width: 16, height: 16, color: '#7c3aed' }} /></div>
          <div>
            <div className="points-val">{points.rest_day_credits}</div>
            <div className="points-key">Rest credits</div>
          </div>
        </div>
        <button className="buy-rest-btn" onClick={onBuyRestDay} disabled={points.points < 50}>
          <Award style={{ width: 12, height: 12 }} /> Buy rest (50)
        </button>
      </div>

      {/* Plans */}
      {plans.length === 0 ? (
        <div className="empty-plan-state">
          <div className="empty-plan-icon">🎯</div>
          <div className="empty-plan-text">No plans yet.<br/>Set up your first plan to get started!</div>
          <button className="add-plan-btn" onClick={() => setShowSetup(true)}>
            <Plus style={{ width: 18, height: 18 }} /> Set Up Your Plan
          </button>
        </div>
      ) : (
        <>
          {plans.map(plan => {
            const planActs = activities.filter(a => a.plan_id === plan.id)
            const todayToss = todayTosses.find(t => t.plan_id === plan.id)
            const tossedAct = todayToss?.activity_id
              ? planActs.find(a => a.id === todayToss.activity_id)
              : null
            const target = targetActiveDays(plan)

            return (
              <div key={plan.id} className="plan-card">
                <div className="plan-header">
                  <div className="plan-name-row">
                    <div className="plan-icon"><Target style={{ width: 16, height: 16 }} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="plan-name">{plan.name}</div>
                      <div className="plan-meta">
                        {target}x/week · {plan.rest_days_per_week} rest · {plan.session_length}
                      </div>
                    </div>
                  </div>
                  <button className="plan-delete" onClick={() => {
                    if (confirm(`Delete plan "${plan.name}"?`)) onDeletePlan(plan.id)
                  }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                </div>

                {plan.final_goal && (
                  <div className="plan-goal">
                    <strong>🎯 Goal:</strong> {plan.final_goal}
                  </div>
                )}

                {!todayToss && (
                  <button
                    className={`toss-btn ${tossing === plan.id ? 'tossing' : ''}`}
                    disabled={tossing === plan.id || planActs.length === 0}
                    onClick={() => handleToss(plan)}
                  >
                    {tossing === plan.id
                      ? <><Loader2 style={{ width: 18, height: 18 }} className="spin" /> Tossing…</>
                      : <><Dice5 style={{ width: 18, height: 18 }} /> Toss for Today&apos;s Activity</>}
                  </button>
                )}

                {todayToss && todayToss.is_rest_day && (
                  <div className="toss-result rest">
                    <div className="toss-result-label">💤 Rest day</div>
                    <div className="toss-result-detail">Today is a rest day. Recharge!</div>
                    <div className="toss-result-meta">
                      <span className="toss-tag">+20 pts for bonus activity</span>
                    </div>
                    {!todayToss.completed ? (
                      <button className="complete-btn bonus" disabled={completing === todayToss.id} onClick={() => handleComplete(todayToss)}>
                        {completing === todayToss.id
                          ? <Loader2 style={{ width: 14, height: 14 }} className="spin" />
                          : <><Sparkles style={{ width: 14, height: 14 }} /> Did extra activity (+20)</>}
                      </button>
                    ) : (
                      <button className="complete-btn done" disabled>
                        <Check style={{ width: 14, height: 14 }} /> Bonus claimed
                      </button>
                    )}
                  </div>
                )}

                {todayToss && !todayToss.is_rest_day && tossedAct && (
                  <div className="toss-result">
                    <div className="toss-result-label">🎲 Today&apos;s activity</div>
                    <div className="toss-result-detail">{tossedAct.detail}</div>
                    <div className="toss-result-meta">
                      <span className={`toss-tag diff-${tossedAct.difficulty}`}>{tossedAct.difficulty}</span>
                      <span className="toss-tag">{plan.session_length}</span>
                      {!tossedAct.repeatable && <span className="toss-tag">one-time</span>}
                    </div>
                    {!todayToss.completed ? (
                      <button className="complete-btn" disabled={completing === todayToss.id} onClick={() => handleComplete(todayToss)}>
                        {completing === todayToss.id
                          ? <Loader2 style={{ width: 14, height: 14 }} className="spin" />
                          : <><Check style={{ width: 14, height: 14 }} /> Mark complete (+10 pts)</>}
                      </button>
                    ) : (
                      <button className="complete-btn done" disabled>
                        <Check style={{ width: 14, height: 14 }} /> Completed ✓
                      </button>
                    )}
                  </div>
                )}

                {planActs.length === 0 && !todayToss && (
                  <div style={{ fontSize: '0.78rem', color: '#9c9688', textAlign: 'center', fontStyle: 'italic' }}>
                    No activities defined. Edit plan to add some.
                  </div>
                )}
              </div>
            )
          })}

          <button className="add-plan-btn secondary" onClick={() => setShowSetup(true)}>
            <Plus style={{ width: 16, height: 16 }} /> Add another plan
          </button>
        </>
      )}

      {showSetup && (
        <PlanSetup
          onCancel={() => setShowSetup(false)}
          onSave={async (plan) => {
            await onAddPlan(plan)
            setShowSetup(false)
          }}
        />
      )}
    </div>
  )
}

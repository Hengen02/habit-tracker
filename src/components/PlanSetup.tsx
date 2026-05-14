'use client'

import { useState } from 'react'
import { X, Plus, Trash2, ChevronRight, ChevronLeft, Check } from 'lucide-react'

export interface PlanInput {
  name: string
  frequency: 'daily' | 'every_2_3' | 'weekly' | 'custom'
  custom_days_per_week?: number
  rest_days_per_week: number
  final_goal?: string
  session_length: string
  activities: { detail: string; difficulty: 'easy' | 'normal' | 'hard'; repeatable: boolean }[]
}

interface Props {
  onSave: (plan: PlanInput) => void
  onCancel: () => void
}

export default function PlanSetup({ onSave, onCancel }: Props) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<'daily' | 'every_2_3' | 'weekly' | 'custom'>('daily')
  const [customDays, setCustomDays] = useState(3)
  const [restDays, setRestDays] = useState(2)
  const [finalGoal, setFinalGoal] = useState('')
  const [sessionLength, setSessionLength] = useState('30 min')
  const [activities, setActivities] = useState<{ detail: string; difficulty: 'easy' | 'normal' | 'hard'; repeatable: boolean }[]>([])
  const [newActivity, setNewActivity] = useState('')
  const [newDifficulty, setNewDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal')
  const [newRepeatable, setNewRepeatable] = useState(true)

  function addActivity() {
    if (!newActivity.trim()) return
    setActivities(prev => [...prev, { detail: newActivity.trim(), difficulty: newDifficulty, repeatable: newRepeatable }])
    setNewActivity('')
  }

  function removeActivity(idx: number) {
    setActivities(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSave() {
    if (!name.trim() || activities.length === 0) return
    onSave({
      name: name.trim(),
      frequency,
      custom_days_per_week: frequency === 'custom' ? customDays : undefined,
      rest_days_per_week: restDays,
      final_goal: finalGoal.trim() || undefined,
      session_length: sessionLength,
      activities,
    })
  }

  const canNext1 = name.trim().length > 0
  const canNext2 = true
  const canFinish = activities.length > 0

  return (
    <div className="ps-overlay">
      <style>{`
        .ps-overlay {
          position: fixed; inset: 0;
          background: rgba(26,46,26,0.5); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem; z-index: 100;
          animation: ps-fade 0.2s ease-out;
        }
        @keyframes ps-fade { from { opacity: 0; } to { opacity: 1; } }

        .ps-card {
          background: #faf8f4; border-radius: 24px;
          width: 100%; max-width: 420px; max-height: 90vh;
          display: flex; flex-direction: column;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        .ps-header {
          padding: 1.25rem 1.25rem 0.5rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        .ps-title {
          font-family: 'Lora', serif; font-size: 1.25rem;
          font-weight: 700; color: #1a2e1a;
        }
        .ps-close {
          background: transparent; border: none; cursor: pointer;
          color: #9c9688; padding: 4px; border-radius: 6px;
          display: flex; align-items: center;
        }
        .ps-close:hover { color: #1a2e1a; background: #e5e1d8; }

        .ps-progress {
          display: flex; gap: 4px; padding: 0 1.25rem 0.75rem;
        }
        .ps-progress-dot {
          flex: 1; height: 4px; border-radius: 99px;
          background: #e0ddd5; transition: background 0.2s;
        }
        .ps-progress-dot.active { background: #2d4a2d; }

        .ps-body {
          flex: 1; overflow-y: auto;
          padding: 0.5rem 1.25rem 1rem;
          display: flex; flex-direction: column; gap: 1rem;
        }

        .ps-step-title {
          font-family: 'Lora', serif; font-size: 1rem;
          font-weight: 600; color: #1a2e1a;
        }
        .ps-step-sub {
          font-size: 0.8rem; color: #8a9e8a; margin-top: -0.5rem;
        }

        .ps-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .ps-label {
          font-size: 0.7rem; color: #9c9688; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.07em;
        }
        .ps-input {
          background: #fff; border: 1.5px solid #ddd9d0;
          border-radius: 10px; padding: 0.7rem 0.875rem;
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
          color: #1a2e1a; outline: none; transition: all 0.2s;
        }
        .ps-input:focus { border-color: #3a6b3a; box-shadow: 0 0 0 3px rgba(58,107,58,0.1); }
        .ps-input::placeholder { color: #c8c4ba; }

        .ps-options { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
        .ps-option-btn {
          background: #fff; border: 1.5px solid #ddd9d0;
          border-radius: 10px; padding: 0.75rem;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem;
          color: #5a6c5a; cursor: pointer; transition: all 0.15s;
          text-align: left;
        }
        .ps-option-btn:hover { border-color: #3a6b3a; }
        .ps-option-btn.active {
          background: #2d4a2d !important; border-color: #2d4a2d !important;
          color: #e8f0e8 !important;
        }
        .ps-option-sub {
          font-size: 0.7rem; opacity: 0.7; margin-top: 2px;
        }

        .ps-slider-row {
          display: flex; align-items: center; gap: 0.75rem;
        }
        .ps-slider {
          flex: 1; height: 4px;
          -webkit-appearance: none; appearance: none;
          background: #e5e1d8; border-radius: 99px; outline: none;
        }
        .ps-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; border-radius: 50%;
          background: #2d4a2d; cursor: pointer;
        }
        .ps-slider::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: #2d4a2d; cursor: pointer; border: none;
        }
        .ps-slider-val {
          min-width: 60px; text-align: right;
          font-family: 'Lora', serif; font-weight: 700;
          color: #2d4a2d; font-size: 0.95rem;
        }

        .ps-activity-form {
          background: #fff; border: 1px solid #e5e1d8;
          border-radius: 12px; padding: 0.75rem;
          display: flex; flex-direction: column; gap: 0.5rem;
        }
        .ps-diff-row { display: flex; gap: 4px; }
        .ps-diff-btn {
          flex: 1; background: #faf8f4; border: 1px solid #ddd9d0;
          border-radius: 8px; padding: 0.4rem 0;
          font-family: 'DM Sans', sans-serif; font-size: 0.7rem;
          color: #9c9688; cursor: pointer; transition: all 0.15s;
        }
        .ps-diff-btn:hover { border-color: #3a6b3a; }
        .ps-diff-btn.active {
          background: #2d4a2d !important; color: #e8f0e8 !important;
          border-color: #2d4a2d !important;
        }
        .ps-checkbox-row {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.78rem; color: #5a6c5a;
          cursor: pointer;
        }
        .ps-checkbox-row input { cursor: pointer; accent-color: #2d4a2d; }
        .ps-add-act-btn {
          background: #3a6b3a; border: none; border-radius: 8px;
          color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem; font-weight: 500;
          padding: 0.5rem; cursor: pointer; display: flex;
          align-items: center; justify-content: center; gap: 4px;
        }
        .ps-add-act-btn:hover:not(:disabled) { background: #2d4a2d; }
        .ps-add-act-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .ps-activity-item {
          background: #f0f4ee; border: 1px solid #c8d8c8;
          border-radius: 10px; padding: 0.6rem 0.75rem;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .ps-activity-text {
          flex: 1; font-size: 0.85rem; color: #2c3e2c;
        }
        .ps-activity-tags { display: flex; gap: 4px; flex-shrink: 0; }
        .ps-tag {
          font-size: 0.6rem; padding: 1px 6px; border-radius: 4px;
          background: #2d4a2d; color: #e8f0e8; font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .ps-tag.easy { background: #6b7c6b; }
        .ps-tag.hard { background: #b45309; }
        .ps-tag.norepeat { background: #92400e; }
        .ps-rm-act {
          background: transparent; border: none;
          color: #c8c4ba; cursor: pointer; padding: 2px;
          display: flex; align-items: center;
        }
        .ps-rm-act:hover { color: #dc2626; }

        .ps-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid #e5e1d8;
          display: flex; gap: 0.5rem;
        }
        .ps-btn {
          flex: 1; padding: 0.75rem;
          border-radius: 12px; border: none; cursor: pointer;
          font-family: 'Lora', serif; font-size: 0.9rem; font-weight: 600;
          display: flex; align-items: center; justify-content: center; gap: 4px;
          transition: all 0.15s;
        }
        .ps-btn-secondary {
          background: #fff; border: 1.5px solid #ddd9d0; color: #5a6c5a;
        }
        .ps-btn-secondary:hover { border-color: #3a6b3a; color: #2d4a2d; }
        .ps-btn-primary {
          background: #2d4a2d; color: #e8f0e8;
        }
        .ps-btn-primary:hover:not(:disabled) { background: #3a6b3a; }
        .ps-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <div className="ps-card">
        <div className="ps-header">
          <div className="ps-title">Set up a plan</div>
          <button className="ps-close" onClick={onCancel}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        <div className="ps-progress">
          <div className={`ps-progress-dot ${step >= 1 ? 'active' : ''}`} />
          <div className={`ps-progress-dot ${step >= 2 ? 'active' : ''}`} />
          <div className={`ps-progress-dot ${step >= 3 ? 'active' : ''}`} />
        </div>

        <div className="ps-body">

          {step === 1 && (
            <>
              <div className="ps-step-title">What are you working on?</div>
              <div className="ps-step-sub">Give your plan a name</div>

              <div className="ps-field">
                <label className="ps-label">Plan name *</label>
                <input className="ps-input" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Gym, Piano, Coding…" maxLength={40} autoFocus />
              </div>

              <div className="ps-field">
                <label className="ps-label">Final goal (optional)</label>
                <input className="ps-input" value={finalGoal} onChange={e => setFinalGoal(e.target.value)}
                  placeholder="e.g. Run a marathon" maxLength={100} />
              </div>

              <div className="ps-field">
                <label className="ps-label">Preferred session length</label>
                <div className="ps-options">
                  {['15 min', '30 min', '1 hour', '2+ hours'].map(opt => (
                    <button key={opt} className={`ps-option-btn ${sessionLength === opt ? 'active' : ''}`}
                      onClick={() => setSessionLength(opt)}>{opt}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="ps-step-title">How often & rest days?</div>
              <div className="ps-step-sub">Set your training cadence</div>

              <div className="ps-field">
                <label className="ps-label">Frequency</label>
                <div className="ps-options">
                  <button className={`ps-option-btn ${frequency === 'daily' ? 'active' : ''}`} onClick={() => setFrequency('daily')}>
                    Every day<div className="ps-option-sub">7x per week</div>
                  </button>
                  <button className={`ps-option-btn ${frequency === 'every_2_3' ? 'active' : ''}`} onClick={() => setFrequency('every_2_3')}>
                    Every 2-3 days<div className="ps-option-sub">3x per week</div>
                  </button>
                  <button className={`ps-option-btn ${frequency === 'weekly' ? 'active' : ''}`} onClick={() => setFrequency('weekly')}>
                    Once a week<div className="ps-option-sub">1x per week</div>
                  </button>
                  <button className={`ps-option-btn ${frequency === 'custom' ? 'active' : ''}`} onClick={() => setFrequency('custom')}>
                    Custom<div className="ps-option-sub">You choose</div>
                  </button>
                </div>
              </div>

              {frequency === 'custom' && (
                <div className="ps-field">
                  <label className="ps-label">Active days per week</label>
                  <div className="ps-slider-row">
                    <input type="range" min="1" max="7" value={customDays}
                      onChange={e => setCustomDays(parseInt(e.target.value))} className="ps-slider" />
                    <span className="ps-slider-val">{customDays} day{customDays === 1 ? '' : 's'}</span>
                  </div>
                </div>
              )}

              <div className="ps-field">
                <label className="ps-label">Rest days per week</label>
                <div className="ps-slider-row">
                  <input type="range" min="0" max="6" value={restDays}
                    onChange={e => setRestDays(parseInt(e.target.value))} className="ps-slider" />
                  <span className="ps-slider-val">{restDays} day{restDays === 1 ? '' : 's'}</span>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="ps-step-title">Learning details</div>
              <div className="ps-step-sub">Add activities to randomize from. The more you add, the more variety!</div>

              <div className="ps-activity-form">
                <input className="ps-input" value={newActivity} onChange={e => setNewActivity(e.target.value)}
                  placeholder="e.g. Practice scales, 30min cardio…" maxLength={80}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addActivity())} />
                <div className="ps-diff-row">
                  {(['easy', 'normal', 'hard'] as const).map(d => (
                    <button key={d} className={`ps-diff-btn ${newDifficulty === d ? 'active' : ''}`}
                      onClick={() => setNewDifficulty(d)}>{d}</button>
                  ))}
                </div>
                <label className="ps-checkbox-row">
                  <input type="checkbox" checked={newRepeatable} onChange={e => setNewRepeatable(e.target.checked)} />
                  Repeatable (can appear multiple times)
                </label>
                <button className="ps-add-act-btn" onClick={addActivity} disabled={!newActivity.trim()}>
                  <Plus style={{ width: 14, height: 14 }} /> Add activity
                </button>
              </div>

              {activities.map((a, i) => (
                <div key={i} className="ps-activity-item">
                  <span className="ps-activity-text">{a.detail}</span>
                  <div className="ps-activity-tags">
                    <span className={`ps-tag ${a.difficulty}`}>{a.difficulty}</span>
                    {!a.repeatable && <span className="ps-tag norepeat">1x</span>}
                  </div>
                  <button className="ps-rm-act" onClick={() => removeActivity(i)}><Trash2 style={{ width: 14, height: 14 }} /></button>
                </div>
              ))}

              {activities.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9c9688', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                  Add at least one activity to continue
                </div>
              )}
            </>
          )}

        </div>

        <div className="ps-footer">
          {step > 1 && (
            <button className="ps-btn ps-btn-secondary" onClick={() => setStep(step - 1)}>
              <ChevronLeft style={{ width: 16, height: 16 }} /> Back
            </button>
          )}
          {step < 3 && (
            <button className="ps-btn ps-btn-primary" disabled={step === 1 ? !canNext1 : !canNext2}
              onClick={() => setStep(step + 1)}>
              Next <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          )}
          {step === 3 && (
            <button className="ps-btn ps-btn-primary" disabled={!canFinish} onClick={handleSave}>
              <Check style={{ width: 16, height: 16 }} /> Save plan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

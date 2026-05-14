'use client'

import { useState } from 'react'
import { Gift, Plus, Trash2, Check, Lock, Sparkles } from 'lucide-react'

export interface Reward {
  id: string
  milestone: number
  title: string
  claimed: boolean
  claimed_at?: string | null
}

interface Props {
  rewards: Reward[]
  currentStreak: number
  onAdd: (milestone: number, title: string) => void
  onDelete: (id: string) => void
  onClaim: (id: string) => void
}

export default function RewardVault({ rewards, currentStreak, onAdd, onDelete, onClaim }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [milestone, setMilestone] = useState('')
  const [title, setTitle] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const m = parseInt(milestone)
    if (!m || m < 1 || !title.trim()) return
    onAdd(m, title.trim())
    setMilestone(''); setTitle(''); setShowForm(false)
  }

  const sorted = [...rewards].sort((a, b) => a.milestone - b.milestone)
  const unlocked = sorted.filter(r => currentStreak >= r.milestone && !r.claimed)
  const upcoming = sorted.filter(r => currentStreak < r.milestone)
  const claimed = sorted.filter(r => r.claimed)

  return (
    <div className="reward-vault">
      <style>{`
        .reward-vault {
          background: #faf8f4; border: 1px solid #ddd9d0;
          border-radius: 20px; padding: 1.25rem;
          display: flex; flex-direction: column; gap: 0.875rem;
        }
        .rv-header {
          display: flex; align-items: center; justify-content: space-between;
        }
        .rv-title {
          display: flex; align-items: center; gap: 0.5rem;
          font-family: 'Lora', serif; font-size: 1.1rem; font-weight: 700; color: #1a2e1a;
        }
        .rv-add-btn {
          display: flex; align-items: center; gap: 4px;
          background: #2d4a2d; border: none; color: #e8f0e8;
          padding: 0.4rem 0.75rem; border-radius: 100px;
          font-size: 0.75rem; font-weight: 500; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
        }
        .rv-add-btn:hover { background: #3a6b3a; }

        .rv-form {
          background: #fff; border: 1px solid #e0ddd5;
          border-radius: 12px; padding: 0.875rem;
          display: flex; flex-direction: column; gap: 0.5rem;
        }
        .rv-form-row { display: flex; gap: 0.5rem; }
        .rv-input {
          background: #faf8f4; border: 1.5px solid #ddd9d0;
          border-radius: 8px; padding: 0.55rem 0.75rem;
          color: #1a2e1a; font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem; outline: none; transition: all 0.2s;
        }
        .rv-input:focus { border-color: #3a6b3a; }
        .rv-input::placeholder { color: #c8c4ba; }
        .rv-input.milestone { width: 80px; }
        .rv-input.title { flex: 1; }
        .rv-save {
          background: #2d4a2d; border: none; border-radius: 8px;
          color: #e8f0e8; font-family: 'Lora', serif;
          font-size: 0.8rem; font-weight: 600; padding: 0.55rem 1rem;
          cursor: pointer; transition: all 0.15s;
        }
        .rv-save:hover:not(:disabled) { background: #3a6b3a; }
        .rv-save:disabled { opacity: 0.4; cursor: not-allowed; }

        .rv-section-label {
          font-size: 0.65rem; color: #9c9688; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-top: 0.25rem;
        }
        .rv-card {
          background: #fff; border: 1px solid #e0ddd5;
          border-radius: 12px; padding: 0.75rem 0.875rem;
          display: flex; align-items: center; gap: 0.75rem;
          transition: all 0.2s;
        }
        .rv-card-unlocked {
          background: linear-gradient(135deg, #fef3c7, #fde68a) !important;
          border-color: #f59e0b !important;
          animation: shimmer 2s ease-in-out infinite;
        }
        @keyframes shimmer {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 12px 4px rgba(245, 158, 11, 0.25); }
        }
        .rv-card-claimed { background: #f5f3ef !important; opacity: 0.7; }

        .rv-icon {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .rv-icon-unlocked { background: #f59e0b; color: #fff; }
        .rv-icon-locked { background: #e5e1d8; color: #9c9688; }
        .rv-icon-claimed { background: #c8d8c8; color: #2d4a2d; }

        .rv-info { flex: 1; min-width: 0; }
        .rv-info-title {
          font-size: 0.9rem; font-weight: 500; color: #1a2e1a;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .rv-info-milestone {
          font-size: 0.7rem; color: #9c9688;
          font-family: 'Lora', serif; font-style: italic; margin-top: 1px;
        }

        .rv-claim-btn {
          background: #2d4a2d; border: none; color: #e8f0e8;
          font-size: 0.7rem; font-weight: 600; padding: 0.35rem 0.75rem;
          border-radius: 100px; cursor: pointer;
          font-family: 'Lora', serif; flex-shrink: 0;
        }
        .rv-claim-btn:hover { background: #3a6b3a; }

        .rv-progress {
          flex: 1; height: 4px; background: #e5e1d8;
          border-radius: 99px; overflow: hidden;
          max-width: 60px;
        }
        .rv-progress-fill { height: 100%; background: #c8d8c8; border-radius: 99px; transition: width 0.5s; }

        .rv-delete {
          color: #c8c4ba; background: transparent; border: none;
          cursor: pointer; padding: 3px;
          display: flex; align-items: center;
        }
        .rv-delete:hover { color: #dc2626; }

        .rv-empty {
          text-align: center; padding: 1.5rem 1rem;
          color: #9c9688; font-size: 0.85rem;
          font-family: 'Lora', serif; font-style: italic;
        }
      `}</style>

      <div className="rv-header">
        <div className="rv-title">
          <Gift style={{ width: 18, height: 18, color: '#f59e0b' }} />
          Reward Vault
        </div>
        <button className="rv-add-btn" onClick={() => setShowForm(v => !v)}>
          <Plus style={{ width: 13, height: 13 }} /> Add
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="rv-form">
          <div className="rv-form-row">
            <input type="number" min="1" value={milestone}
              onChange={e => setMilestone(e.target.value)}
              placeholder="Days" className="rv-input milestone" autoFocus />
            <input type="text" value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. movie night, new book…"
              maxLength={50} className="rv-input title" />
          </div>
          <button type="submit" disabled={!milestone || !title.trim()} className="rv-save">
            Save reward
          </button>
        </form>
      )}

      {rewards.length === 0 && !showForm && (
        <div className="rv-empty">
          🎁 Set rewards to motivate yourself!<br/>
          Example: &ldquo;20 days → buy a new book&rdquo;
        </div>
      )}

      {unlocked.length > 0 && (
        <>
          <div className="rv-section-label">🎉 Ready to claim!</div>
          {unlocked.map(r => (
            <div key={r.id} className="rv-card rv-card-unlocked">
              <div className="rv-icon rv-icon-unlocked"><Sparkles style={{ width: 16, height: 16 }} /></div>
              <div className="rv-info">
                <div className="rv-info-title">{r.title}</div>
                <div className="rv-info-milestone">Unlocked at {r.milestone} days</div>
              </div>
              <button className="rv-claim-btn" onClick={() => onClaim(r.id)}>Claim ✓</button>
            </div>
          ))}
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <div className="rv-section-label">🔒 Upcoming</div>
          {upcoming.map(r => {
            const pct = Math.min(100, Math.round((currentStreak / r.milestone) * 100))
            return (
              <div key={r.id} className="rv-card">
                <div className="rv-icon rv-icon-locked"><Lock style={{ width: 14, height: 14 }} /></div>
                <div className="rv-info">
                  <div className="rv-info-title">{r.title}</div>
                  <div className="rv-info-milestone">{r.milestone - currentStreak} days to go</div>
                </div>
                <div className="rv-progress"><div className="rv-progress-fill" style={{ width: `${pct}%` }} /></div>
                <button className="rv-delete" onClick={() => onDelete(r.id)}><Trash2 style={{ width: 13, height: 13 }} /></button>
              </div>
            )
          })}
        </>
      )}

      {claimed.length > 0 && (
        <>
          <div className="rv-section-label">✓ Claimed</div>
          {claimed.map(r => (
            <div key={r.id} className="rv-card rv-card-claimed">
              <div className="rv-icon rv-icon-claimed"><Check style={{ width: 14, height: 14 }} strokeWidth={3} /></div>
              <div className="rv-info">
                <div className="rv-info-title" style={{ textDecoration: 'line-through' }}>{r.title}</div>
                <div className="rv-info-milestone">Claimed · {r.milestone} day mark</div>
              </div>
              <button className="rv-delete" onClick={() => onDelete(r.id)}><Trash2 style={{ width: 13, height: 13 }} /></button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

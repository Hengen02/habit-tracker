'use client'

import { X } from 'lucide-react'

interface Props { onClose: () => void }

export default function HelpModal({ onClose }: Props) {
  return (
    <div className="hm-overlay" onClick={onClose}>
      <style>{`
        .hm-overlay {
          position: fixed; inset: 0;
          background: rgba(26,46,26,0.5); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem; z-index: 100;
          animation: hm-fade 0.2s ease-out;
          font-family: 'DM Sans', sans-serif;
        }
        @keyframes hm-fade { from { opacity: 0; } to { opacity: 1; } }

        .hm-card {
          background: #faf8f4; border-radius: 24px;
          width: 100%; max-width: 420px; max-height: 90vh;
          overflow-y: auto;
        }
        .hm-header {
          padding: 1.25rem 1.25rem 0.5rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        .hm-title {
          font-family: 'Lora', serif; font-size: 1.25rem;
          font-weight: 700; color: #1a2e1a;
        }
        .hm-close {
          background: transparent; border: none; cursor: pointer;
          color: #9c9688; padding: 4px; border-radius: 6px;
          display: flex; align-items: center;
        }
        .hm-close:hover { color: #1a2e1a; background: #e5e1d8; }

        .hm-body { padding: 0.5rem 1.25rem 1.5rem; }

        .hm-section {
          background: #fff; border: 1px solid #e5e1d8;
          border-radius: 14px; padding: 0.875rem 1rem;
          margin-bottom: 0.625rem;
        }
        .hm-section-title {
          font-family: 'Lora', serif; font-weight: 600;
          color: #2d4a2d; font-size: 0.95rem; margin-bottom: 0.4rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .hm-section-text {
          font-size: 0.85rem; color: #5a6c5a; line-height: 1.55;
        }
        .hm-list { padding-left: 1rem; }
        .hm-list li { margin: 0.25rem 0; }

        .hm-highlight {
          background: #f0f4ee; border-radius: 8px;
          padding: 0.5rem 0.75rem; margin-top: 0.4rem;
          font-size: 0.78rem; color: #2d4a2d; font-style: italic;
          font-family: 'Lora', serif;
        }
      `}</style>

      <div className="hm-card" onClick={e => e.stopPropagation()}>
        <div className="hm-header">
          <div className="hm-title">How it works 🌿</div>
          <button className="hm-close" onClick={onClose}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        <div className="hm-body">

          <div className="hm-section">
            <div className="hm-section-title">📋 1. Set up your plan</div>
            <div className="hm-section-text">
              Click <strong>Set Up Your Plan</strong>. Tell the app:
              <ul className="hm-list">
                <li>What you&apos;re working on (e.g. Gym, Piano)</li>
                <li>How often you want to do it</li>
                <li>How many rest days per week</li>
                <li>Specific activities (with easy/normal/hard tags)</li>
              </ul>
              You can add multiple plans for different goals!
            </div>
          </div>

          <div className="hm-section">
            <div className="hm-section-title">🎲 2. Toss for today&apos;s activity</div>
            <div className="hm-section-text">
              Each day, click <strong>Toss for Today&apos;s Activity</strong>. The app smart-randomly picks an activity from your plan based on:
              <ul className="hm-list">
                <li>Your frequency setting</li>
                <li>What you did recently (no boring repeats)</li>
                <li>How many rest days you need</li>
              </ul>
              <div className="hm-highlight">💡 Some days will be auto-assigned as rest days — enjoy them!</div>
            </div>
          </div>

          <div className="hm-section">
            <div className="hm-section-title">⭐ 3. Earn points</div>
            <div className="hm-section-text">
              <ul className="hm-list">
                <li><strong>+10 points</strong> — complete your tossed activity</li>
                <li><strong>+20 points</strong> — bonus for doing an extra activity on a rest day</li>
                <li><strong>50 points</strong> — buy yourself an extra rest day!</li>
              </ul>
            </div>
          </div>

          <div className="hm-section">
            <div className="hm-section-title">🔥 4. Build your streak</div>
            <div className="hm-section-text">
              Check off your daily activity to build your streak. The longer the streak, the higher your level (Beginner → Legendary).
              Set <strong>rewards</strong> for yourself at milestones to stay motivated!
            </div>
          </div>

          <div className="hm-section">
            <div className="hm-section-title">📅 5. Routines tab</div>
            <div className="hm-section-text">
              Use <strong>Routines</strong> for fixed weekly tasks (e.g. work, school).
              These show up on specific days and don&apos;t need tossing.
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

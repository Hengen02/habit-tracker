'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Smartphone, Info } from 'lucide-react'

interface Props {
  enabled: boolean
  time: string
  onChange: (enabled: boolean, time: string) => void
}

export default function ReminderSettings({ enabled, time, onChange }: Props) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission)
    // Detect if running as installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setShowInstall(!isStandalone)
  }, [])

  async function handleToggle() {
    if (!enabled) {
      if (permission === 'default' && 'Notification' in window) {
        const result = await Notification.requestPermission()
        setPermission(result)
        if (result !== 'granted') return
      }
      if (permission === 'denied') {
        alert('Notifications are blocked. Please enable them in your browser settings.')
        return
      }
      onChange(true, time)
    } else {
      onChange(false, time)
    }
  }

  function handleTimeChange(newTime: string) {
    onChange(enabled, newTime)
  }

  return (
    <div className="reminder-settings">
      <style>{`
        .reminder-settings {
          background: #faf8f4; border: 1px solid #ddd9d0;
          border-radius: 20px; padding: 1.25rem;
          display: flex; flex-direction: column; gap: 0.875rem;
        }
        .rs-title {
          font-family: 'Lora', serif; font-size: 1.1rem; font-weight: 700;
          color: #1a2e1a; display: flex; align-items: center; gap: 0.5rem;
        }
        .rs-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.75rem 0.875rem;
          background: #fff; border: 1px solid #e5e1d8; border-radius: 12px;
        }
        .rs-row-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .rs-row-title { font-size: 0.9rem; font-weight: 500; color: #1a2e1a; }
        .rs-row-sub { font-size: 0.7rem; color: #9c9688; }

        .rs-toggle {
          position: relative; width: 44px; height: 24px;
          background: #ddd9d0; border-radius: 99px;
          cursor: pointer; transition: background 0.2s;
          border: none; flex-shrink: 0;
        }
        .rs-toggle.on { background: #2d4a2d; }
        .rs-toggle-dot {
          position: absolute; top: 2px; left: 2px;
          width: 20px; height: 20px; border-radius: 50%; background: #fff;
          transition: transform 0.2s;
        }
        .rs-toggle.on .rs-toggle-dot { transform: translateX(20px); }

        .rs-time-input {
          background: #fff; border: 1.5px solid #ddd9d0;
          border-radius: 8px; padding: 0.4rem 0.6rem;
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
          color: #1a2e1a; outline: none;
        }
        .rs-time-input:focus { border-color: #3a6b3a; }

        .rs-notice {
          background: #fef3c7; border: 1px solid #fbbf24;
          border-radius: 10px; padding: 0.7rem 0.875rem;
          display: flex; gap: 0.5rem;
          font-size: 0.75rem; color: #92400e; line-height: 1.5;
        }
        .rs-install-tip {
          background: #f0f4ee; border: 1px solid #c8d8c8;
          border-radius: 10px; padding: 0.7rem 0.875rem;
          display: flex; gap: 0.5rem;
          font-size: 0.75rem; color: #2d4a2d; line-height: 1.5;
        }
      `}</style>

      <div className="rs-title">
        {enabled ? <Bell style={{ width: 18, height: 18 }} /> : <BellOff style={{ width: 18, height: 18 }} />}
        Reminders
      </div>

      <div className="rs-row">
        <div className="rs-row-info">
          <span className="rs-row-title">Daily reminder</span>
          <span className="rs-row-sub">Get notified if you haven&apos;t checked in</span>
        </div>
        <button
          className={`rs-toggle ${enabled ? 'on' : ''}`}
          onClick={handleToggle}
          disabled={permission === 'unsupported'}
          aria-label="Toggle reminders"
        >
          <div className="rs-toggle-dot" />
        </button>
      </div>

      {enabled && (
        <div className="rs-row">
          <div className="rs-row-info">
            <span className="rs-row-title">Reminder time</span>
            <span className="rs-row-sub">Daily at this time</span>
          </div>
          <input
            type="time"
            value={time}
            onChange={e => handleTimeChange(e.target.value)}
            className="rs-time-input"
          />
        </div>
      )}

      {permission === 'denied' && (
        <div className="rs-notice">
          <Info style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />
          Notifications are blocked in your browser. Allow them in browser settings to enable reminders.
        </div>
      )}

      {permission === 'unsupported' && (
        <div className="rs-notice">
          <Info style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />
          Your browser doesn&apos;t support notifications.
        </div>
      )}

      {showInstall && (
        <div className="rs-install-tip">
          <Smartphone style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Tip:</strong> Install this app on your phone! Tap your browser&apos;s share button → &ldquo;Add to Home Screen&rdquo;. Reminders work better as an installed app.
          </span>
        </div>
      )}
    </div>
  )
}

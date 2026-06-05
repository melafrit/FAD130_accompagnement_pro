import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Notif { id: number; texte: string; lu: number; cree_le: string }

export default function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)

  async function load() {
    try {
      const d = await api<{ notifications: Notif[]; nonLues: number }>('/notifications')
      setItems(d.notifications)
      setUnread(d.nonLues)
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    void load()
  }, [])

  async function toggle() {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && unread > 0) {
      await api('/notifications/lues', { method: 'POST' })
      setUnread(0)
      void load()
    }
  }

  return (
    <div className="bell-wrap">
      <button className="bell" onClick={toggle} aria-label="Notifications">
        🔔{unread > 0 && <span className="bell-badge">{unread}</span>}
      </button>
      {open && (
        <div className="bell-menu">
          {items.length === 0 && <p className="muted" style={{ padding: 12, margin: 0 }}>Aucune notification.</p>}
          {items.map((n) => (
            <div key={n.id} className={`bell-item ${n.lu ? '' : 'bell-unread'}`}>
              <p style={{ margin: 0 }}>{n.texte}</p>
              <span className="bell-date">{n.cree_le?.slice(0, 16)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

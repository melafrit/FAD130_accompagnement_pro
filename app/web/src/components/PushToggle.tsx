import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useFeature } from '../features/FeaturesContext'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// PWA & notifications push : (dés)activer les notifications web sur cet appareil.
export default function PushToggle() {
  const actif = useFeature('pwa_push')
  const [etat, setEtat] = useState<'inconnu' | 'actif' | 'inactif' | 'non_supporte'>('inconnu')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!actif) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setEtat('non_supporte'); return }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEtat(sub ? 'actif' : 'inactif'))
      .catch(() => setEtat('inactif'))
  }, [actif])
  if (!actif) return null

  async function activer() {
    setBusy(true); setMsg('')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setMsg('Permission refusée par le navigateur.'); return }
      const reg = await navigator.serviceWorker.ready
      const { cle } = await api<{ cle: string }>('/confort/push/cle')
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(cle) as unknown as BufferSource })
      await api('/confort/push/abonnement', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) })
      setEtat('actif'); setMsg('Notifications activées sur cet appareil ✓')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Activation impossible.') } finally { setBusy(false) }
  }
  async function desactiver() {
    setBusy(true); setMsg('')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      setEtat('inactif'); setMsg('Notifications désactivées.')
    } catch { setMsg('Erreur.') } finally { setBusy(false) }
  }
  async function tester() {
    setBusy(true); setMsg('')
    try { await api('/confort/push/test', { method: 'POST' }); setMsg('Notification de test envoyée — regarde ton appareil.') }
    catch { setMsg('Envoi impossible.') } finally { setBusy(false) }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>🔔 Notifications push</h3>
      <p className="muted" style={{ marginTop: 0 }}>Reçois les alertes de Boussole même quand l’onglet est fermé (installe l’app pour une meilleure expérience).</p>
      {etat === 'non_supporte' && <p className="muted">Ton navigateur ne prend pas en charge les notifications push.</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {etat === 'actif' ? (
          <>
            <button className="btn btn-ghost" disabled={busy} onClick={tester}>Envoyer un test</button>
            <button className="btn btn-ghost" disabled={busy} onClick={desactiver}>Désactiver</button>
          </>
        ) : etat !== 'non_supporte' ? (
          <button className="btn btn-primary" disabled={busy} onClick={activer}>Activer les notifications</button>
        ) : null}
      </div>
      {msg && <p className="form-success" style={{ marginBottom: 0 }}>{msg}</p>}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { api } from '../lib/api'

/** Gestion de la double authentification TOTP (opt-in) : activation par QR code, désactivation. */
export default function TwoFactorSettings() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ enabled: boolean }>('/auth/2fa/status').then((d) => setEnabled(d.enabled)).catch(() => setEnabled(false))
  }, [])

  const onCode = (v: string) => setCode(v.replace(/\D/g, '').slice(0, 6))

  async function startSetup() {
    setBusy(true); setMsg('')
    try { const d = await api<{ qr: string; secret: string }>('/auth/2fa/setup', { method: 'POST' }); setQr(d.qr); setSecret(d.secret) }
    catch (e) { setMsg((e as Error).message) } finally { setBusy(false) }
  }
  async function enable() {
    setBusy(true); setMsg('')
    try { await api('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) }); setEnabled(true); setQr(null); setCode(''); setMsg('Double authentification activée ✅') }
    catch (e) { setMsg((e as Error).message) } finally { setBusy(false) }
  }
  async function disable() {
    setBusy(true); setMsg('')
    try { await api('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) }); setEnabled(false); setCode(''); setMsg('Double authentification désactivée.') }
    catch (e) { setMsg((e as Error).message) } finally { setBusy(false) }
  }

  if (enabled === null) return <p className="muted">Chargement…</p>

  return (
    <div className="twofa">
      <p>État : {enabled ? <strong>activée ✅</strong> : <strong>désactivée</strong>}</p>

      {!enabled && !qr && (
        <button className="btn btn-primary" onClick={startSetup} disabled={busy}>Activer la double authentification</button>
      )}

      {!enabled && qr && (
        <div className="twofa-setup">
          <p className="hint">Scannez ce QR code avec votre application d’authentification (Google Authenticator, Authy, 1Password…), puis saisissez le code à 6 chiffres affiché.</p>
          <img src={qr} alt="QR code de configuration 2FA" width={200} height={200} />
          <p className="muted">Clé manuelle : <code>{secret}</code></p>
          <div className="field-row">
            <label className="field"><span className="field-label">Code à 6 chiffres</span>
              <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => onCode(e.target.value)} placeholder="123456" />
            </label>
            <button className="btn btn-primary" onClick={enable} disabled={busy || code.length !== 6}>Valider et activer</button>
          </div>
        </div>
      )}

      {enabled && (
        <div className="field-row">
          <label className="field"><span className="field-label">Code actuel (pour désactiver)</span>
            <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => onCode(e.target.value)} placeholder="123456" />
          </label>
          <button className="btn btn-ghost" onClick={disable} disabled={busy || code.length !== 6}>Désactiver</button>
        </div>
      )}

      {msg && <p className="profil-msg">{msg}</p>}
    </div>
  )
}

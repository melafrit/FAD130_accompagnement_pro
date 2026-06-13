import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Demande { id: number; motif: string | null; cree_le: string; email: string; prenom: string | null; nom: string | null; dossier_titre: string | null }
interface Eligible { id: number; email: string; derniere_activite: string | null }
const fdate = (s: string | null) => (s || '').slice(0, 10)

// Console RGPD (admin) : traiter les demandes d'effacement (anonymiser / supprimer) + rétention.
export default function RgpdConsole() {
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [retention, setRetention] = useState<{ months: number; auto: boolean; eligibles: Eligible[] } | null>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    const [d, r] = await Promise.all([
      api<{ demandes: Demande[] }>('/admin/effacements'),
      api<{ months: number; auto: boolean; eligibles: Eligible[] }>('/admin/retention'),
    ])
    setDemandes(d.demandes); setRetention(r)
  }
  useEffect(() => { void load() }, [])

  async function traiter(dem: Demande, action: 'anonymiser' | 'supprimer') {
    const verbe = action === 'supprimer' ? 'SUPPRIMER définitivement' : 'anonymiser'
    if (!window.confirm(`Confirmer : ${verbe} les données de ${dem.prenom || dem.email} ?`)) return
    setMsg('')
    try { await api(`/admin/effacements/${dem.id}`, { method: 'POST', body: JSON.stringify({ action }) }); setMsg(`Demande traitée (${action}).`); await load() }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Erreur') }
  }
  async function appliquerRetention() {
    if (!retention?.eligibles.length) return
    if (!window.confirm(`Anonymiser ${retention.eligibles.length} compte(s) inactif(s) au-delà de ${retention.months} mois ?`)) return
    const d = await api<{ anonymises: number }>('/admin/retention/appliquer', { method: 'POST' })
    setMsg(`${d.anonymises} compte(s) anonymisé(s) par rétention.`); await load()
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ marginBottom: 4 }}>Confidentialité & RGPD</h2>
      <p className="muted" style={{ marginTop: 0 }}>Traite les demandes d’effacement et applique la politique de rétention.</p>
      {msg && <p className="form-success">{msg}</p>}

      <h3>Demandes d’effacement <span className="muted">({demandes.length})</span></h3>
      {demandes.length === 0 ? (
        <p className="muted">Aucune demande en attente.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {demandes.map((dem) => (
            <div key={dem.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <strong>{[dem.prenom, dem.nom].filter(Boolean).join(' ') || dem.email}</strong>
                <span className="muted" style={{ fontSize: '.8rem' }}>{fdate(dem.cree_le)}</span>
              </div>
              <p className="muted" style={{ margin: '4px 0' }}>{dem.email}{dem.dossier_titre ? ` · parcours : ${dem.dossier_titre}` : ''}</p>
              {dem.motif && <p style={{ margin: '4px 0' }}>« {dem.motif} »</p>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => traiter(dem, 'anonymiser')}>🕶️ Anonymiser</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger,#b91c1c)' }} onClick={() => traiter(dem, 'supprimer')}>🗑️ Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {retention && (
        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Rétention des données</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Les comptes accompagnés dont tous les parcours sont clôturés et inactifs depuis plus de <strong>{retention.months} mois</strong> sont éligibles à l’anonymisation
            {retention.auto ? ' (automatique activée).' : ' (anonymisation manuelle).'}
          </p>
          <p><strong>{retention.eligibles.length}</strong> compte(s) éligible(s) aujourd’hui.</p>
          {retention.eligibles.length > 0 && (
            <>
              <ul>{retention.eligibles.map((e) => <li key={e.id}>{e.email} <span className="muted">— dernière activité {fdate(e.derniere_activite)}</span></li>)}</ul>
              <button className="btn btn-ghost btn-sm" onClick={appliquerRetention}>Appliquer la rétention maintenant</button>
            </>
          )}
        </div>
      )}
    </section>
  )
}

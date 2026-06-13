import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useFeature } from '../features/FeaturesContext'

interface Impact {
  dossiers_actifs: number; dossiers_clotures: number; entretiens_total: number
  cr_publies: number; syntheses_publiees: number; actions_total: number; actions_faites: number
  taux_actions: number; progression_moyenne: number; meteo_evolution: number | null
  signaux: { vert: number; orange: number; rouge: number }
}
interface Digest { resume: { alertes: number; actifs: number }; html: string }

function Tile({ valeur, libelle }: { valeur: string | number; libelle: string }) {
  return (
    <div style={{ flex: '1 1 120px', minWidth: 120, background: 'var(--surface, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.1 }}>{valeur}</div>
      <div className="muted" style={{ fontSize: '.82rem' }}>{libelle}</div>
    </div>
  )
}

export default function PilotageBoard() {
  const impactActif = useFeature('tableau_impact')
  const digestActif = useFeature('digest_email')
  const [impact, setImpact] = useState<Impact | null>(null)
  const [digest, setDigest] = useState<Digest | null>(null)
  const [apercu, setApercu] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (impactActif) api<Impact>('/pilotage/impact').then(setImpact).catch(() => { /* ignore */ })
    if (digestActif) api<Digest>('/pilotage/digest').then(setDigest).catch(() => { /* ignore */ })
  }, [impactActif, digestActif])

  async function envoyer() {
    setBusy(true); setMsg('')
    try {
      const d = await api<{ envoye_a: string }>('/pilotage/digest/envoyer', { method: 'POST' })
      setMsg(`Digest envoyé à ${d.envoye_a} ✓`)
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Erreur') } finally { setBusy(false) }
  }

  if (!impactActif && !digestActif) return null

  return (
    <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
      {impactActif && impact && (
        <section className="card" style={{ padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>📊 Tableau d’impact</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Tile valeur={impact.dossiers_actifs} libelle="Parcours actifs" />
            <Tile valeur={`${impact.progression_moyenne}%`} libelle="Progression moyenne" />
            <Tile valeur={`${impact.taux_actions}%`} libelle="Actions réalisées" />
            <Tile valeur={impact.entretiens_total} libelle="Entretiens menés" />
            <Tile valeur={impact.cr_publies} libelle="Comptes rendus publiés" />
            <Tile valeur={impact.meteo_evolution == null ? '—' : `${impact.meteo_evolution > 0 ? '+' : ''}${impact.meteo_evolution}`} libelle="Évolution météo (moy.)" />
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
            <span title="Parcours en bonne santé">🟢 {impact.signaux.vert}</span>
            <span title="À surveiller">🟠 {impact.signaux.orange}</span>
            <span title="Décrochage probable">🔴 {impact.signaux.rouge}</span>
            <span className="muted">· {impact.dossiers_clotures} clôturé(s) · {impact.syntheses_publiees} synthèse(s)</span>
          </div>
        </section>
      )}

      {digestActif && (
        <section className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>✉️ Digest hebdomadaire</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setApercu((v) => !v)}>{apercu ? 'Masquer l’aperçu' : 'Aperçu'}</button>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={envoyer}>M’envoyer le digest</button>
            </div>
          </div>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Récapitulatif de la semaine envoyé par email{digest ? ` — ${digest.resume.alertes} point(s) de vigilance` : ''}.
          </p>
          {msg && <p className="form-success" style={{ marginTop: 8 }}>{msg}</p>}
          {apercu && digest && (
            <div style={{ marginTop: 12, padding: 14, border: '1px solid var(--border, #e5e7eb)', borderRadius: 10, background: 'var(--surface-2, #f8fafc)' }}
              dangerouslySetInnerHTML={{ __html: digest.html }} />
          )}
        </section>
      )}
    </div>
  )
}

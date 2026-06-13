import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useFeature } from '../features/FeaturesContext'

interface Resume { etat: string; faits: string[]; prochaines_etapes: string[]; source?: string; genere_le?: string }

// Résumé « où j'en suis » (accompagné) : synthèse IA de l'avancement, régénérable.
export default function ResumeParcoursCard({ dossierId }: { dossierId: number | string }) {
  const actif = useFeature('resume_parcours')
  const [resume, setResume] = useState<Resume | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!actif) return
    api<{ resume: Resume | null }>(`/collab/resume/dossier/${dossierId}`).then((d) => setResume(d.resume)).catch(() => { /* ignore */ })
  }, [actif, dossierId])
  if (!actif) return null

  async function gen() {
    setBusy(true)
    try { setResume(await api<Resume>(`/collab/resume/dossier/${dossierId}`, { method: 'POST' })) } finally { setBusy(false) }
  }

  return (
    <section className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>🧭 Où j’en suis</h2>
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={gen}>{busy ? 'Analyse…' : resume ? '↻ Mettre à jour' : '✨ Faire le point'}</button>
      </div>
      {!resume ? (
        <p className="muted" style={{ marginBottom: 0 }}>Demande un point d’étape : un résumé clair de ton avancement et de tes prochaines étapes.</p>
      ) : (
        <>
          <p style={{ fontSize: '1.05rem' }}>{resume.etat}</p>
          {resume.faits?.length > 0 && <ul>{resume.faits.map((f, i) => <li key={i}>{f}</li>)}</ul>}
          {resume.prochaines_etapes?.length > 0 && (
            <>
              <h3 style={{ marginBottom: 4 }}>Mes prochaines étapes</h3>
              <ul>{resume.prochaines_etapes.map((e, i) => <li key={i}>➡️ {e}</li>)}</ul>
            </>
          )}
        </>
      )}
    </section>
  )
}

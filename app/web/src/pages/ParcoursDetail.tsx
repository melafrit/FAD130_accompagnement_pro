import { useEffect, useState, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import ActionList, { type Action } from '../components/ActionList'
import QuestionnaireDetailModal from '../components/QuestionnaireDetailModal'
import ErrorBoundary from '../components/ErrorBoundary'

const CompteRenduModal = lazy(() => import('../components/CompteRenduModal'))
const SyntheseModal = lazy(() => import('../components/SyntheseModal'))

interface Dossier { id: number; titre: string; statut: string; cree_le: string; acc_prenom: string | null; acc_nom: string | null; acc_email: string }
interface Questionnaire { cr_recap: string | null; contenu: string | null; complete_le: string | null }
interface CR { id: number; session_id: number; publie_le: string | null; entretien_date: string }
interface Rdv { id: number; debut: string; fin: string; statut: string }
interface Creneau { id: number; debut: string; fin: string }
interface Detail { dossier: Dossier; questionnaire: Questionnaire | null; crs: CR[]; synthese_publiee: boolean; actions: Action[]; rdvs: Rdv[] }

function fslot(iso: string) { const [d, t] = (iso || '').split('T'); const [y, m, day] = (d || '').split('-'); return `${day}/${m}/${y} à ${(t || '').slice(0, 5)}` }

export default function ParcoursDetail() {
  const { id } = useParams()
  const [data, setData] = useState<Detail | null>(null)
  const [creneaux, setCreneaux] = useState<Creneau[]>([])
  const [showQ, setShowQ] = useState(false)
  const [crSession, setCrSession] = useState<number | null>(null)
  const [showSyn, setShowSyn] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() { setData(await api<Detail>(`/dossiers/mine/${id}`)) }
  async function loadCreneaux() { try { setCreneaux((await api<{ creneaux: Creneau[] }>(`/rdv/disponibles?dossierId=${id}`)).creneaux) } catch { /* ignore */ } }
  useEffect(() => { void load().catch(() => setMsg('Chargement impossible.')); void loadCreneaux() }, [id])

  async function setStatut(aid: number, statut: string) { await api(`/actions/${aid}`, { method: 'PATCH', body: JSON.stringify({ statut }) }); await load() }
  async function reserver(creneauId: number) {
    setMsg('')
    try { await api('/rdv/reserver', { method: 'POST', body: JSON.stringify({ creneauId, dossierId: Number(id) }) }); setMsg('Rendez-vous réservé ✅'); await load(); await loadCreneaux() }
    catch (e) { setMsg((e as Error).message || 'Réservation impossible.') }
  }
  async function demander() {
    setMsg('')
    try { await api('/rdv/demander', { method: 'POST', body: JSON.stringify({ dossierId: Number(id) }) }); setMsg('Demande envoyée à ton accompagnateur. Tu seras notifié dès qu’il ajoute des créneaux.') }
    catch { setMsg('Demande impossible.') }
  }

  if (!data) return <div className="page"><p>{msg || 'Chargement…'}</p></div>
  const d = data.dossier
  const acc = [d.acc_prenom, d.acc_nom].filter(Boolean).join(' ') || d.acc_email

  return (
    <div className="page">
      <p className="kicker">Mon parcours</p>
      <h1 className="page-title">{d.titre}</h1>
      <p className="lead">Accompagnateur : <strong>{acc}</strong> · {d.statut === 'cloture' ? 'Clôturé' : 'En cours'}</p>
      {msg && <p className="form-success">{msg}</p>}

      <section>
        <h2>Questionnaire initial</h2>
        {data.questionnaire ? (
          <>
            <p className="muted">Complété le {(data.questionnaire.complete_le || '').slice(0, 10)}</p>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowQ(true)}>🔎 Voir mes réponses</button>
          </>
        ) : (
          <>
            <p className="muted">Pas encore rempli.</p>
            <Link className="btn btn-primary" to={`/questionnaire?dossier=${id}`}>Remplir le questionnaire</Link>
          </>
        )}
      </section>

      <section>
        <h2>Rendez-vous</h2>
        {data.rdvs.length > 0 && (
          <div className="rdv-box" style={{ marginBottom: 12 }}>
            {data.rdvs.map((r) => (
              <div key={r.id} className="rdv-row">
                <span className="rdv-when">{fslot(r.debut)}</span>
                <span className="rdv-statut">{r.statut}</span>
                <a className="rdv-ics" href={`/api/rdv/${r.id}/ics`} title="Ajouter à l'agenda" aria-label="Ajouter à l'agenda">📅</a>
              </div>
            ))}
          </div>
        )}
        <h3 style={{ fontSize: 15, margin: '6px 0' }}>Réserver un créneau</h3>
        {creneaux.length > 0 ? (
          <div className="slots">
            {creneaux.map((c) => (
              <div key={c.id} className="slot">
                <span>{fslot(c.debut)}</span>
                <button className="btn btn-primary btn-sm" onClick={() => reserver(c.id)}>Réserver</button>
              </div>
            ))}
          </div>
        ) : (
          <>
            <p className="muted">Aucun créneau disponible chez {acc} pour le moment.</p>
            <button className="btn btn-ghost" onClick={demander}>📨 Demander un rendez-vous</button>
          </>
        )}
      </section>

      <section>
        <h2>Comptes rendus</h2>
        {data.crs.length === 0 ? <p className="muted">Aucun compte rendu publié pour l’instant.</p> : (
          <div className="slots">
            {data.crs.map((c) => (
              <div key={c.id} className="slot">
                <span>Compte rendu — entretien du {(c.entretien_date || '').slice(0, 10)}</span>
                <button className="btn btn-primary btn-sm" onClick={() => setCrSession(c.session_id)}>Consulter</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Synthèse du parcours</h2>
        {data.synthese_publiee ? (
          <button className="btn btn-primary btn-sm" onClick={() => setShowSyn(true)}>Consulter ma synthèse</button>
        ) : <p className="muted">Pas encore disponible (publiée par ton accompagnateur).</p>}
      </section>

      <section>
        <h2>Mon plan d'action</h2>
        <ActionList actions={data.actions} onStatut={setStatut} />
      </section>

      <p style={{ marginTop: 20 }}><Link className="btn btn-ghost" to="/espace">← Mes parcours</Link></p>

      {showQ && data.questionnaire && <QuestionnaireDetailModal recap={data.questionnaire.cr_recap} contenu={data.questionnaire.contenu} completeLe={data.questionnaire.complete_le} onClose={() => setShowQ(false)} />}
      <ErrorBoundary onReset={() => { setCrSession(null); setShowSyn(false) }}>
        <Suspense fallback={null}>
          {crSession != null && <CompteRenduModal sessionId={crSession} role="accompagne" onClose={() => setCrSession(null)} />}
          {showSyn && <SyntheseModal dossierId={Number(id)} role="accompagne" onClose={() => setShowSyn(false)} />}
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

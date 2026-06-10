import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import ActionList, { type Action } from '../components/ActionList'
import ActionDetailModal from '../components/ActionDetailModal'
import DictaTextarea from '../components/DictaTextarea'
import DictaInput from '../components/DictaInput'

interface DossierInfo { id: number; titre: string | null; statut: string; synthese: string | null; cree_le: string; accompagne_prenom: string | null; accompagne_email: string }
interface Questionnaire { cr_recap: string | null; complete_le: string | null }
interface CR { id: number; version: number; genere_le: string; publie: number }
interface Session { id: number; date: string; phase_atteinte: string; statut: string; crs: CR[] }
interface Rdv { id: number; debut: string; fin: string; statut: string }
interface Detail { dossier: DossierInfo; questionnaire: Questionnaire | null; sessions: Session[]; actions: Action[]; rdvs: Rdv[] }

function fdate(s: string) { return (s || '').slice(0, 16).replace('T', ' ') }
function fslot(iso: string) { const [d, t] = iso.split('T'); const [y, m, day] = (d || '').split('-'); return `${day}/${m}/${y} à ${(t || '').slice(0, 5)}` }

export default function Dossier() {
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState<Detail | null>(null)
  const [synthese, setSynthese] = useState('')
  const [libelle, setLibelle] = useState('')
  const [selected, setSelected] = useState<Action | null>(null)

  async function load() {
    const d = await api<Detail>(`/dossiers/${id}`)
    setData(d)
    setSynthese(d.dossier.synthese || '')
  }
  useEffect(() => { void load() }, [id])

  if (!data) return <div className="page"><p>Chargement…</p></div>
  const { dossier, questionnaire, sessions, actions, rdvs } = data
  const cloture = dossier.statut === 'cloture'
  const enCours = sessions.find((s) => s.statut === 'en_cours')

  async function cloturer() { await api(`/dossiers/${id}/cloturer`, { method: 'POST', body: JSON.stringify({ synthese }) }); await load() }
  async function rouvrir() { await api(`/dossiers/${id}/rouvrir`, { method: 'POST' }); await load() }
  async function setStatut(aid: number, statut: string) { await api(`/actions/${aid}`, { method: 'PATCH', body: JSON.stringify({ statut }) }); await load() }
  async function addAction(e: FormEvent) {
    e.preventDefault()
    if (!libelle.trim()) return
    await api('/actions', { method: 'POST', body: JSON.stringify({ dossierId: Number(id), libelle }) })
    setLibelle('')
    await load()
  }
  async function reorder(ids: number[]) {
    await api('/actions/reorder', { method: 'POST', body: JSON.stringify({ dossierId: Number(id), ids }) })
    await load()
  }

  return (
    <div className="page">
      <p className="kicker">Dossier · Parcours</p>
      <h1 className="page-title">
        {dossier.accompagne_prenom || dossier.accompagne_email}{' '}
        <span className={`badge-statut ${cloture ? 'st-cloture' : 'st-encours'}`}>{cloture ? 'Clôturé' : 'En cours'}</span>
      </h1>

      <div className="dossier-actions">
        {!cloture && enCours && <button className="btn btn-primary" onClick={() => nav(`/entretien?dossier=${id}`)}>Reprendre l'entretien en cours</button>}
        {!cloture && !enCours && <button className="btn btn-primary" onClick={() => nav(`/entretien?dossier=${id}`)}>Nouvel entretien</button>}
        <Link className="btn btn-ghost" to="/mes-creneaux">Mes créneaux / RDV</Link>
        <a className="btn btn-ghost" href={`/api/dossiers/${id}/synthese.docx`}>⬇ Synthèse du parcours (.docx)</a>
        <Link className="btn btn-primary" to={`/dossier/${id}/auto-evaluation`}>📊 Mon auto-évaluation</Link>
      </div>

      <ol className="timeline">
        <li className="tl-item">
          <span className="tl-dot">Q</span>
          <div className="tl-body">
            <h3>Questionnaire initial</h3>
            {questionnaire && questionnaire.cr_recap ? (
              <>
                <p className="muted">Complété le {(questionnaire.complete_le || '').slice(0, 10)}</p>
                <details><summary>Voir le récapitulatif</summary><pre className="recap-text">{questionnaire.cr_recap}</pre></details>
                <a className="btn btn-ghost" href={`/api/questionnaire/${id}/cr`}>⬇ Récapitulatif (.docx)</a>
              </>
            ) : <p className="muted">Pas encore complété par l'accompagné.</p>}
          </div>
        </li>

        {rdvs.map((r) => (
          <li key={`rdv-${r.id}`} className="tl-item">
            <span className="tl-dot tl-rdv">📅</span>
            <div className="tl-body"><h3>Rendez-vous</h3><p className="muted">{fslot(r.debut)} — {r.statut}</p>
              <a className="btn btn-ghost btn-sm" href={`/api/rdv/${r.id}/ics`}>📅 Ajouter à l'agenda</a>
            </div>
          </li>
        ))}

        {sessions.map((s, i) => (
          <li key={`s-${s.id}`} className="tl-item">
            <span className="tl-dot">{i + 1}</span>
            <div className="tl-body">
              <h3>Entretien #{i + 1} <span className="muted">— {s.statut === 'terminee' ? 'terminé' : 'en cours'}</span></h3>
              <p className="muted">{fdate(s.date)} · phase atteinte {Number(s.phase_atteinte) + 1}/6</p>
              {s.crs.length > 0
                ? s.crs.map((cr) => <a key={cr.id} className="btn btn-ghost" href={`/api/cr/${cr.id}/download`}>⬇ Compte rendu v{cr.version} (.docx)</a>)
                : <p className="muted">Pas encore de compte rendu.</p>}
            </div>
          </li>
        ))}
      </ol>

      <section>
        <h2>Plan d'action</h2>
        {!cloture && (
          <form className="qa-form" onSubmit={addAction}>
            <DictaInput value={libelle} onChange={setLibelle} placeholder="Ajouter ou dicter une action…" />
            <button className="btn btn-primary" type="submit">Ajouter</button>
          </form>
        )}
        <p className="muted action-hint">Clique une action pour ouvrir son détail (échéance, priorité, rappel, notes…) · glisse la poignée ⠿ pour réordonner.</p>
        <ActionList actions={actions} onStatut={setStatut} onOpen={setSelected} onReorder={reorder} />
      </section>

      <section className="ia-section">
        <h2>Clôture de la démarche</h2>
        {cloture ? (
          <>
            <p><strong>Synthèse finale :</strong></p>
            <pre className="recap-text">{dossier.synthese || '—'}</pre>
            <button className="btn btn-ghost" onClick={rouvrir}>Rouvrir le dossier</button>
          </>
        ) : (
          <>
            <DictaTextarea className="notes-area" value={synthese} onChange={setSynthese} placeholder="Synthèse finale du parcours (facultatif)…" />
            <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={cloturer}>Clôturer la démarche</button>
          </>
        )}
      </section>

      <p style={{ marginTop: 20 }}><Link className="btn btn-ghost" to="/tableau-de-bord">← Retour au tableau de bord</Link></p>

      {selected && <ActionDetailModal key={selected.id} action={selected} onClose={() => setSelected(null)} onSaved={load} />}
    </div>
  )
}

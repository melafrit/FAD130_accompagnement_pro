import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import GradientSlider from '../components/GradientSlider'
import RadarChart from '../components/charts/RadarChart'
import Gauge from '../components/charts/Gauge'
import AiProgress from '../components/AiProgress'
import DictaTextarea from '../components/DictaTextarea'

interface Indicateur { id: string; texte: string }
interface Critere { id: number; titre: string; resume: string; points: number; indicateurs: Indicateur[] }
interface Zone { label: string; min: number; couleur: string }
interface ScoreVal { score: number | null; commentaire: string | null }
interface EvalData { id: number; statut: string; note_globale: number | null; commentaire_global: string | null; analyse_questions: string | null; maj_le: string; scores: Record<string, ScoreVal> }

const COURT: Record<number, string> = { 1: 'Relation', 2: 'Mise en œuvre', 3: 'Posture pro' }

export default function AutoEvaluation() {
  const { id } = useParams()
  const [criteres, setCriteres] = useState<Critere[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [scores, setScores] = useState<Record<string, ScoreVal>>({})
  const [commentaireGlobal, setCommentaireGlobal] = useState('')
  const [analyseQuestions, setAnalyseQuestions] = useState('')
  const [nom, setNom] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiApplied, setAiApplied] = useState<Record<string, boolean>>({})
  const [reveal, setReveal] = useState(0) // clé d'animation des graphiques (montée + pré-remplissage IA)

  async function load() {
    setAiApplied({}) // les badges « suggéré par l'IA » ne valent que pour la dernière suggestion non encore enregistrée
    const [g, e] = await Promise.all([
      api<{ criteres: Critere[]; zones: Zone[] }>('/autoeval/grille'),
      api<{ eval: EvalData }>(`/autoeval/${id}`),
    ])
    setCriteres(g.criteres)
    setZones(g.zones)
    setScores(e.eval.scores)
    setCommentaireGlobal(e.eval.commentaire_global || '')
    setAnalyseQuestions(e.eval.analyse_questions || '')
    setReveal((r) => r + 1)
  }
  useEffect(() => {
    void load().catch(() => setMsg('Chargement impossible.'))
    void api<{ dossier: { accompagne_prenom: string | null; accompagne_email: string } }>(`/dossiers/${id}`)
      .then((d) => setNom(d.dossier.accompagne_prenom || d.dossier.accompagne_email))
      .catch(() => {})
  }, [id])

  const allScores = Object.values(scores).map((s) => s.score).filter((v): v is number => typeof v === 'number')
  function critAvg(c: Critere): number {
    const vs = c.indicateurs.map((i) => scores[i.id]?.score).filter((v): v is number => typeof v === 'number')
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0
  }
  // Barème officiel 7/7/6 : sous-score d'un critère sur ses points, puis note /20 pondérée.
  function critPoints(c: Critere): number { return Math.round((critAvg(c) / 100) * c.points * 10) / 10 }
  const note20 = criteres.length && allScores.length ? Math.round(criteres.reduce((a, c) => a + critPoints(c), 0) * 10) / 10 : null
  const globalPct = note20 != null ? (note20 / 20) * 100 : null // jauge : note ramenée en %

  function setScore(key: string, v: number) {
    setScores((s) => ({ ...s, [key]: { score: v, commentaire: s[key]?.commentaire ?? null } }))
  }
  function setComment(key: string, t: string) {
    setScores((s) => ({ ...s, [key]: { score: s[key]?.score ?? null, commentaire: t } }))
  }
  function scoresArray() {
    return Object.entries(scores).map(([indicateur, v]) => ({ indicateur, score: v.score, commentaire: v.commentaire }))
  }

  async function save() {
    setBusy(true); setMsg('')
    try { await api(`/autoeval/${id}`, { method: 'POST', body: JSON.stringify({ scores: scoresArray(), commentaire_global: commentaireGlobal, analyse_questions: analyseQuestions }) }); setMsg('Enregistré ✅'); await load() }
    catch { setMsg('Erreur à l’enregistrement.') } finally { setBusy(false) }
  }
  async function valider() {
    setBusy(true); setMsg('')
    try { await api(`/autoeval/${id}/valider`, { method: 'POST', body: JSON.stringify({ scores: scoresArray(), commentaire_global: commentaireGlobal, analyse_questions: analyseQuestions }) }); setMsg('Version validée et archivée dans l’historique ✅'); await load() }
    catch { setMsg('Erreur à la validation.') } finally { setBusy(false) }
  }
  async function appelIA() {
    const dejaSaisi = Object.values(scores).some((s) => s.score != null || (s.commentaire || '').trim() !== '')
    if (dejaSaisi && !window.confirm('L’IA va proposer un score et un commentaire pour les 20 indicateurs et remplacer ta saisie actuelle (tu pourras tout réajuster avant de valider). Continuer ?')) return
    setAiBusy(true); setMsg('')
    try {
      const r = await api<{ available: boolean; message?: string; scores?: { indicateur: string; score: number | null; commentaire: string | null }[]; commentaire_global?: string; analyse_questions?: string }>(`/autoeval/${id}/ia`, { method: 'POST' })
      if (!r.available) { setMsg(r.message || 'IA indisponible.'); return }
      const applied: Record<string, boolean> = {}
      ;(r.scores || []).forEach((s) => { applied[s.indicateur] = true })
      // Forme fonctionnelle : repart de l'état le plus récent (n'écrase pas les saisies concurrentes) ;
      // ne remplace jamais une valeur existante par un null renvoyé par l'IA.
      setScores((prev) => {
        const next = { ...prev }
        ;(r.scores || []).forEach((s) => {
          if (next[s.indicateur] !== undefined) {
            next[s.indicateur] = {
              score: s.score != null ? s.score : next[s.indicateur].score,
              commentaire: s.commentaire != null ? s.commentaire : next[s.indicateur].commentaire,
            }
          }
        })
        return next
      })
      if (r.commentaire_global) setCommentaireGlobal(r.commentaire_global)
      if (r.analyse_questions) setAnalyseQuestions(r.analyse_questions)
      setAiApplied(applied)
      setReveal((rv) => rv + 1) // rejoue l'animation des graphiques sur le pré-remplissage IA
      setMsg('Suggestions de l’IA appliquées — à toi de relire, ajuster, puis valider.')
    } catch { setMsg('Erreur lors de l’appel à l’IA.') } finally { setAiBusy(false) }
  }

  const radarAxes = criteres.map((c) => ({ label: COURT[c.id] || `C${c.id}`, value: critAvg(c) }))

  return (
    <div className="page autoeval">
      {/* Bandeau : à gauche le titre + bouton IA ; à droite les deux graphiques côte à côte */}
      <div className="ae-top">
        <div className="ae-head">
          <p className="kicker">Dossier · Auto-évaluation (privée)</p>
          <h1 className="page-title">Mon auto-évaluation{nom ? ` — ${nom}` : ''}</h1>
          <p className="lead">Une évaluation <strong>réflexive de ma posture d’accompagnateur</strong> pour ce dossier. Confidentielle : moi seul y ai accès.</p>
          <section className="ae-ia">
            <button className="btn btn-primary" onClick={appelIA} disabled={aiBusy}>✨ Pré-remplir avec l’IA</button>
            <p className="hint">L’IA lit tout le dossier (questionnaire, entretiens et <strong>questions posées</strong>, plan d’action) et propose un score + un commentaire par indicateur, ainsi qu’une analyse du type de tes questions.<br /><strong>L’IA suggère, tu décides</strong> : tu peux tout éditer avant de valider.</p>
            {aiBusy && <AiProgress steps={['Lecture du dossier (questionnaire, entretiens, questions)…', 'Évaluation des 20 indicateurs (barème 7/7/6)…', 'Analyse du type de tes questions…', 'Rédaction des commentaires…']} />}
          </section>
        </div>
        <div className="ae-charts-top">
          <div className="ae-chart-card">
            <h3>Score global</h3>
            <Gauge value={globalPct} reveal={reveal} />
          </div>
          <div className="ae-chart-card">
            <h3>Radar par critère</h3>
            <RadarChart axes={radarAxes} reveal={reveal} />
          </div>
        </div>
      </div>

      {msg && <p className="form-success">{msg}</p>}

      {/* Grille des critères / indicateurs — pleine largeur, compacte */}
      <div className="ae-grille-full">
        {criteres.map((c) => (
          <details key={c.id} className="ae-crit-fold" open>
            <summary>
              <span className="chevron" aria-hidden="true">▸</span>
              <span className="ae-crit-titre">Critère {c.id} — {c.titre}</span>
              <span className="ae-moy">{c.indicateurs.filter((i) => scores[i.id]?.score != null).length}/{c.indicateurs.length} · <strong>{critPoints(c)}/{c.points}</strong></span>
            </summary>
            <div className="ae-crit-body">
              <p className="ae-crit-resume">{c.resume}</p>
              {c.indicateurs.map((ind) => (
                <div key={ind.id} className="ae-ind">
                  <div className="ae-row-txt"><span className="ae-id">{ind.id}</span> {ind.texte}</div>
                  <GradientSlider value={scores[ind.id]?.score ?? null} zones={zones} onChange={(v) => setScore(ind.id, v)} />
                  <div className="ae-comment">
                    {aiApplied[ind.id] && <span className="ae-ia-tag">✨ suggéré par l’IA</span>}
                    <DictaTextarea
                      value={scores[ind.id]?.commentaire || ''}
                      onChange={(v) => setComment(ind.id, v)}
                      placeholder="Commentaire d’auto-évaluation…"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>

      {/* Analyse des questions */}
      <section className="ae-critere">
        <h2>Analyse de mes questions</h2>
        <p className="muted">Retour de l’IA sur le <strong>type et la variété</strong> de tes questions (ouvertes/fermées, reformulation, faire émerger…). À éditer librement.</p>
        <DictaTextarea className="notes-area" value={analyseQuestions} onChange={setAnalyseQuestions} placeholder="Qualité et variété de mes questions…" />
      </section>

      {/* Synthèse + actions */}
      <section className="ae-critere">
        <h2>Synthèse globale</h2>
        <DictaTextarea className="notes-area" value={commentaireGlobal} onChange={setCommentaireGlobal} placeholder="Forces, axes de progrès, fil rouge de mon positionnement…" />
      </section>

      <div className="ae-actions">
        <span className="ae-note">
          Note globale : <strong>{note20 != null ? note20 : '—'}/20</strong>{' '}
          <span className="muted">(barème 7/7/6{criteres.length ? ' — ' + criteres.map((c) => `${critPoints(c)}/${c.points}`).join(' · ') : ''} · {allScores.length}/{criteres.reduce((a, c) => a + c.indicateurs.length, 0) || 20} notés)</span>
        </span>
        <div className="ae-actions-btns">
          <button className="btn btn-ghost" onClick={save} disabled={busy}>💾 Enregistrer</button>
          <button className="btn btn-primary" onClick={valider} disabled={busy}>✓ Valider cette version</button>
        </div>
      </div>

      <p style={{ marginTop: 18 }}><Link className="btn btn-ghost" to={`/dossier/${id}`}>← Retour au dossier</Link></p>
    </div>
  )
}

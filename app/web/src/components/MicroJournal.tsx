import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import DictaTextarea from './DictaTextarea'

interface Entry { id: number; texte: string; partage: number; cree_le: string }
const fdate = (s: string) => (s || '').slice(0, 16).replace('T', ' ')

// Micro-journal de l'accompagné (entre deux séances). Chaque note est privée ou partagée.
// Côté accompagnateur : lecture seule des notes partagées.
export default function MicroJournal({ dossierId, role }: { dossierId: number | string; role: 'accompagne' | 'accompagnateur' }) {
  const [entrees, setEntrees] = useState<Entry[]>([])
  const [texte, setTexte] = useState('')
  const [partage, setPartage] = useState(false)
  const [busy, setBusy] = useState(false)
  const readOnly = role === 'accompagnateur'

  const load = useCallback(async () => { setEntrees((await api<{ entrees: Entry[] }>(`/relationnel/journal/dossier/${dossierId}`)).entrees || []) }, [dossierId])
  useEffect(() => { void load().catch(() => { /* ignore */ }) }, [load])

  async function ajouter() {
    const t = texte.trim(); if (!t) return
    setBusy(true)
    try { await api('/relationnel/journal', { method: 'POST', body: JSON.stringify({ dossierId, texte: t, partage }) }); setTexte(''); setPartage(false); await load() }
    finally { setBusy(false) }
  }
  async function togglePartage(en: Entry) { await api(`/relationnel/journal/${en.id}`, { method: 'PATCH', body: JSON.stringify({ partage: en.partage ? 0 : 1 }) }); await load() }
  async function supprimer(id: number) { if (!window.confirm('Supprimer cette note ?')) return; await api(`/relationnel/journal/${id}`, { method: 'DELETE' }); await load() }

  return (
    <section className="journal">
      <h2>📓 Micro-journal {readOnly ? <span className="muted">(notes partagées par l’accompagné)</span> : <span className="muted">(entre deux séances)</span>}</h2>
      {!readOnly && (
        <div className="journal-add">
          <DictaTextarea value={texte} onChange={setTexte} rows={2} placeholder="Une avancée, un blocage, une idée… (🎙 pour dicter)" aria-label="Nouvelle note de journal" />
          <div className="journal-add-foot">
            <label className="journal-share"><input type="checkbox" checked={partage} onChange={(e) => setPartage(e.target.checked)} /> Partager avec mon accompagnateur</label>
            <button className="btn btn-primary btn-sm" disabled={busy || !texte.trim()} onClick={ajouter}>＋ Ajouter</button>
          </div>
        </div>
      )}
      {entrees.length === 0 ? (
        <p className="muted">{readOnly ? 'Aucune note partagée pour l’instant.' : 'Ton journal est vide. Note ce qui te traverse entre les séances — tu choisis ce que tu partages.'}</p>
      ) : (
        <div className="journal-list">
          {entrees.map((en) => (
            <div key={en.id} className="journal-item">
              <div className="journal-item-text">{en.texte}</div>
              <div className="journal-item-foot">
                <span className="muted">{fdate(en.cree_le)}</span>
                {readOnly ? (
                  <span className="journal-tag partage">partagée</span>
                ) : (
                  <span className="journal-acts">
                    <button className={`journal-tag ${en.partage ? 'partage' : ''}`} onClick={() => togglePartage(en)} title="Basculer privé / partagé">{en.partage ? '🔓 partagée' : '🔒 privée'}</button>
                    <button className="q-del" onClick={() => supprimer(en.id)} aria-label="Supprimer la note" title="Supprimer">×</button>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

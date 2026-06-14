import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import PushToggle from '../components/PushToggle'
import TwoFactorSettings from '../components/TwoFactorSettings'

export default function Profil() {
  const { user, refresh } = useAuth()
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [idMsg, setIdMsg] = useState('')
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmer, setConfirmer] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState('')

  useEffect(() => { if (user) { setPrenom(user.prenom || ''); setNom(user.nom || '') } }, [user])

  async function saveIdentite(e: FormEvent) {
    e.preventDefault(); setIdMsg('')
    try { await api('/auth/me', { method: 'PATCH', body: JSON.stringify({ prenom, nom }) }); await refresh(); setIdMsg('Profil mis à jour ✅') }
    catch (err) { setIdMsg((err as Error).message || 'Erreur.') }
  }
  async function changePassword(e: FormEvent) {
    e.preventDefault(); setPwMsg('')
    if (nouveau.length < 8) { setPwMsg('Le nouveau mot de passe doit faire au moins 8 caractères.'); return }
    if (nouveau !== confirmer) { setPwMsg('La confirmation ne correspond pas.'); return }
    try { await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ ancien, nouveau }) }); setPwMsg('Mot de passe modifié ✅'); setAncien(''); setNouveau(''); setConfirmer('') }
    catch (err) { setPwMsg((err as Error).message || 'Erreur.') }
  }
  async function changeEmail(e: FormEvent) {
    e.preventDefault(); setEmailMsg('')
    try { const r = await api<{ message?: string }>('/auth/change-email', { method: 'POST', body: JSON.stringify({ email: newEmail }) }); setEmailMsg(r.message || 'Lien de confirmation envoyé.'); setNewEmail('') }
    catch (err) { setEmailMsg((err as Error).message || 'Erreur.') }
  }

  if (!user) return null
  return (
    <div className="page">
      <p className="kicker">Mon compte</p>
      <h1 className="page-title">Mon profil</h1>

      <section className="profil-card">
        <h2>Identité</h2>
        <form onSubmit={saveIdentite} className="profil-form">
          <div className="field-row">
            <label className="field"><span className="field-label">Prénom</span><input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" /></label>
            <label className="field"><span className="field-label">Nom</span><input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" /></label>
          </div>
          <div className="profil-actions"><button className="btn btn-primary" type="submit">Enregistrer</button>{idMsg && <span className="profil-msg">{idMsg}</span>}</div>
        </form>
      </section>

      <section className="profil-card">
        <h2>Mot de passe</h2>
        <form onSubmit={changePassword} className="profil-form">
          <label className="field"><span className="field-label">Mot de passe actuel</span><input type="password" value={ancien} onChange={(e) => setAncien(e.target.value)} autoComplete="current-password" /></label>
          <div className="field-row">
            <label className="field"><span className="field-label">Nouveau (8 caractères min.)</span><input type="password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} autoComplete="new-password" /></label>
            <label className="field"><span className="field-label">Confirmer</span><input type="password" value={confirmer} onChange={(e) => setConfirmer(e.target.value)} autoComplete="new-password" /></label>
          </div>
          <div className="profil-actions"><button className="btn btn-primary" type="submit">Changer le mot de passe</button>{pwMsg && <span className="profil-msg">{pwMsg}</span>}</div>
        </form>
      </section>

      <section className="profil-card">
        <h2>Adresse e-mail</h2>
        <p className="muted">Adresse actuelle : <strong>{user.email}</strong></p>
        <form onSubmit={changeEmail} className="profil-form">
          <label className="field"><span className="field-label">Nouvelle adresse</span><input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nouvelle@adresse.fr" /></label>
          <p className="hint">Un lien de confirmation sera envoyé à la nouvelle adresse. Le changement ne prend effet qu’après confirmation (l’ancienne adresse reste active entre-temps).</p>
          <div className="profil-actions"><button className="btn btn-primary" type="submit">Changer l’e-mail</button>{emailMsg && <span className="profil-msg">{emailMsg}</span>}</div>
        </form>
      </section>

      <section className="profil-card">
        <h2>Double authentification (2FA)</h2>
        <p className="muted">Renforce la sécurité de votre compte avec un code temporaire généré par une application d’authentification.</p>
        <TwoFactorSettings />
      </section>

      <section className="profil-card">
        <h2>Application & notifications</h2>
        <PushToggle />
      </section>

      <p style={{ marginTop: 18 }}><Link className="btn btn-ghost" to="/espace">← Mon espace</Link></p>
    </div>
  )
}

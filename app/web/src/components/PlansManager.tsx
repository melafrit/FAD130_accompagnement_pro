import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Feature { key: string; label: string; categorie: string }
interface Plan { id: number; nom: string; description: string | null; features: string[]; nb_users: number }

export default function PlansManager({ onChange }: { onChange?: () => void }) {
  const [features, setFeatures] = useState<Feature[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [open, setOpen] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    const [f, p] = await Promise.all([
      api<{ features: Feature[] }>('/admin/features'),
      api<{ plans: Plan[] }>('/admin/plans'),
    ])
    setFeatures(f.features)
    setPlans(p.plans)
  }
  useEffect(() => {
    void load()
  }, [])

  // Catégories dans l'ordre du registre
  const categories: string[] = []
  for (const f of features) if (!categories.includes(f.categorie)) categories.push(f.categorie)

  function patchLocal(id: number, patch: Partial<Plan>) {
    setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }
  function toggle(plan: Plan, key: string) {
    const has = plan.features.includes(key)
    patchLocal(plan.id, { features: has ? plan.features.filter((k) => k !== key) : [...plan.features, key] })
  }
  function toggleCat(plan: Plan, cat: string, on: boolean) {
    const keys = features.filter((f) => f.categorie === cat).map((f) => f.key)
    const set = new Set(plan.features)
    keys.forEach((k) => (on ? set.add(k) : set.delete(k)))
    patchLocal(plan.id, { features: [...set] })
  }

  async function save(plan: Plan) {
    setMsg('')
    try {
      await api(`/admin/plans/${plan.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ nom: plan.nom, description: plan.description, features: plan.features }),
      })
      setMsg(`Plan « ${plan.nom} » enregistré.`)
      await load()
      onChange?.()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erreur')
    }
  }
  async function create() {
    const d = await api<{ id: number }>('/admin/plans', { method: 'POST', body: JSON.stringify({ nom: 'Nouveau plan', description: '', features: [] }) })
    await load()
    setOpen(d.id)
    onChange?.()
  }
  async function duplicate(id: number) {
    const d = await api<{ id: number }>(`/admin/plans/${id}/duplication`, { method: 'POST' })
    await load()
    setOpen(d.id)
    onChange?.()
  }
  async function remove(plan: Plan) {
    const ok = window.confirm(
      `Supprimer le plan « ${plan.nom} » ?\n` +
        (plan.nb_users > 0
          ? `Les ${plan.nb_users} utilisateur(s) rattaché(s) repasseront au niveau maximum (toutes les fonctionnalités).`
          : 'Aucun utilisateur n’y est rattaché.'),
    )
    if (!ok) return
    await api(`/admin/plans/${plan.id}`, { method: 'DELETE' })
    if (open === plan.id) setOpen(null)
    await load()
    onChange?.()
  }

  return (
    <section style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Plans d’abonnement</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Chaque plan active un sous-ensemble de fonctionnalités. Un utilisateur <strong>sans plan</strong> dispose du niveau maximum (toutes les fonctionnalités).
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => void create()}>+ Nouveau plan</button>
      </div>
      {msg && <p className="form-success" style={{ marginTop: 12 }}>{msg}</p>}

      <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
        {plans.map((plan) => {
          const isOpen = open === plan.id
          return (
            <div key={plan.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : plan.id)}
                aria-expanded={isOpen}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1.05rem' }}>{plan.nom}</strong>
                  <span className="pill" style={{ fontSize: '.78rem' }}>{plan.features.length} fonctionnalité{plan.features.length > 1 ? 's' : ''}</span>
                  <span className="pill" style={{ fontSize: '.78rem' }}>{plan.nb_users} utilisateur{plan.nb_users > 1 ? 's' : ''}</span>
                </span>
                <span aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border, #e5e7eb)' }}>
                  <div className="field-row" style={{ marginTop: 14 }}>
                    <label className="field" style={{ flex: 1 }}>
                      <span>Nom du plan</span>
                      <input value={plan.nom} onChange={(e) => patchLocal(plan.id, { nom: e.target.value })} />
                    </label>
                  </div>
                  <label className="field">
                    <span>Description</span>
                    <textarea rows={2} value={plan.description ?? ''} onChange={(e) => patchLocal(plan.id, { description: e.target.value })} />
                  </label>

                  <div style={{ marginTop: 8 }}>
                    {categories.map((cat) => {
                      const catFeatures = features.filter((f) => f.categorie === cat)
                      const allOn = catFeatures.every((f) => plan.features.includes(f.key))
                      return (
                        <fieldset key={cat} style={{ border: '1px solid var(--border, #e5e7eb)', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                          <legend style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px' }}>
                            <strong>{cat}</strong>
                            <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '.78rem' }} onClick={() => toggleCat(plan, cat, !allOn)}>
                              {allOn ? 'Tout décocher' : 'Tout cocher'}
                            </button>
                          </legend>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '4px 16px' }}>
                            {catFeatures.map((f) => (
                              <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', cursor: 'pointer' }}>
                                <input type="checkbox" checked={plan.features.includes(f.key)} onChange={() => toggle(plan, f.key)} />
                                <span>{f.label}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      )
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                    <button className="btn btn-primary" onClick={() => void save(plan)}>Enregistrer</button>
                    <button className="btn btn-ghost" onClick={() => void duplicate(plan.id)}>Dupliquer</button>
                    <button className="btn btn-ghost" style={{ marginLeft: 'auto', color: 'var(--danger, #b91c1c)' }} onClick={() => void remove(plan)}>Supprimer</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {plans.length === 0 && <p className="muted">Aucun plan pour l’instant. Tous les utilisateurs ont accès à toutes les fonctionnalités.</p>}
      </div>
    </section>
  )
}

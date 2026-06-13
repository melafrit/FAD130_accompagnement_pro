import { Link } from 'react-router-dom'

const STATUS: Record<string, { label: string; cls: string }> = {
  redige: { label: 'Rédigé', cls: 'ok' },
  partiel: { label: 'À enrichir', cls: 'warn' },
  brouillon: { label: 'Brouillon', cls: 'draft' },
  deprecie: { label: 'Déprécié', cls: 'dep' },
}

export function WikiStatusBadge({ statut }: { statut: string }) {
  const s = STATUS[statut] || STATUS.brouillon
  return <span className={`wiki-badge wiki-badge-${s.cls}`}>{s.label}</span>
}

export function WikiBreadcrumb({ categorie, titre }: { categorie?: string; titre?: string }) {
  return (
    <nav className="wiki-breadcrumb" aria-label="Fil d'Ariane">
      <Link to="/admin/wiki">Wiki projet</Link>
      {categorie && <><span aria-hidden="true"> › </span><span>{categorie}</span></>}
      {titre && <><span aria-hidden="true"> › </span><span className="wiki-breadcrumb-current">{titre}</span></>}
    </nav>
  )
}

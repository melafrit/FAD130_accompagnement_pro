import { describe, it, expect } from 'vitest'
import {
  genererContenu,
  contentToHtml,
  esc,
  parasHtml,
  type CRContent,
} from '../../api/src/compteRendu'

// Compte rendu (compteRendu.ts) — logique PURE / repli déterministe.
// Sur l'hôte, ANTHROPIC_API_KEY est absente : genererContenu retombe sur son template
// (retour synchrone du repli, KEY falsy évaluée au chargement du module). Les formateurs
// HTML (contentToHtml/esc/parasHtml) sont purs et testés au caractère près.

describe('CR — unitaires (repli template + formatage HTML)', () => {
  it("TC-CR-061 — genererContenu (sans clé) restitue le template structuré des 6 champs", async () => {
    const notes: Record<number, string> = {
      0: 'Contexte intro',
      1: 'Demande',
      2: 'Point clé',
      3: 'Émergence',
      4: 'Étape plan',
      5: 'Proposition',
    }
    const c = await genererContenu(notes)
    expect(c.contexte).toBe('Contexte intro\nDemande')
    expect(c.pointsCles).toBe('Point clé')
    expect(c.emergence).toBe('Émergence')
    expect(c.planAction).toEqual([{ etape: 'Étape plan', echeance: '', critere: '' }])
    expect(c.propositions).toBe('Proposition')
    expect(c.vigilance).toBe('—')
  })

  it("TC-CR-062 — genererContenu({}) applique les valeurs par défaut '—' et un plan vide", async () => {
    const c = await genererContenu({})
    expect(c.contexte).toBe('—')
    expect(c.pointsCles).toBe('—')
    expect(c.emergence).toBe('—')
    expect(c.planAction).toEqual([]) // phase 4 absente → pas d'étape
    expect(c.propositions).toBe('—')
    expect(c.vigilance).toBe('—')
  })

  it("TC-CR-063 — contentToHtml restitue les 6 sections h2, le plan d'action et l'en-tête", () => {
    const content: CRContent = {
      contexte: 'Un contexte',
      pointsCles: 'Des points',
      emergence: 'Une émergence',
      planAction: [{ etape: 'Faire X', echeance: '2026-07-01', critere: 'mesurable' }],
      propositions: 'Des propositions',
      vigilance: 'À surveiller',
    }
    const html = contentToHtml(content, { accompagne: 'Amine', date: '2026-06-13' })
    // Les 6 sections numérotées.
    expect(html).toContain('<h2>1. Contexte et demande</h2>')
    expect(html).toContain('<h2>2. Points clés exprimés</h2>')
    expect(html).toContain('<h2>3. Ce qui a émergé (sens, axes)</h2>')
    expect(html).toContain('<h2>4. Plan d’action</h2>')
    expect(html).toContain('<h2>5. Propositions pour la suite</h2>')
    expect(html).toContain('<h2>6. Points de vigilance pour le prochain rendez-vous</h2>')
    // En-tête méta.
    expect(html).toContain('<em>Accompagné : Amine · Date : 2026-06-13</em>')
    // Plan d'action : liste avec étape, échéance et critère.
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>Faire X — <em>échéance : 2026-07-01</em> (mesurable)</li>')
    expect(html).toContain('</ul>')
  })

  it('TC-CR-064 — contentToHtml/esc échappe &, <, > (anti-injection HTML)', () => {
    const content: CRContent = {
      contexte: '<script>alert(1)</script> & "guillemets"',
      pointsCles: '—',
      emergence: '—',
      planAction: [],
      propositions: '—',
      vigilance: '—',
    }
    const html = contentToHtml(content, { accompagne: '<b>x</b>', date: '2026-06-13' })
    // Aucun tag brut injecté.
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>x</b>')
    // Caractères dangereux échappés.
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; "guillemets"')
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    // esc() directement, au caractère près.
    expect(esc('<a> & <b>')).toBe('&lt;a&gt; &amp; &lt;b&gt;')
    expect(esc(null as unknown as string)).toBe('')
  })

  it("TC-CR-065 — parasHtml : plan vide → <p>—</p>, lignes vides filtrées, texte vide → <p>—</p>", () => {
    const content: CRContent = {
      contexte: '—',
      pointsCles: 'ligne1\n\nligne2\n  ',
      emergence: '—',
      planAction: [],
      propositions: '—',
      vigilance: '—',
    }
    const html = contentToHtml(content, { accompagne: 'A', date: 'd' })
    // Section 4 : plan d'action vide → repli '<p>—</p>'.
    expect(html).toContain('<h2>4. Plan d’action</h2><p>—</p>')
    // Section 2 : lignes vides/espaces filtrées, deux paragraphes.
    expect(html).toContain('<h2>2. Points clés exprimés</h2><p>ligne1</p><p>ligne2</p>')
    // parasHtml directement.
    expect(parasHtml('ligne1\n\nligne2\n  ')).toBe('<p>ligne1</p><p>ligne2</p>')
    expect(parasHtml('')).toBe('<p>—</p>')
    expect(parasHtml('   \n  ')).toBe('<p>—</p>')
  })

  // TC-CR-066 — genererContenu (branche IA) : extraction JSON via indexOf('{')..lastIndexOf('}').
  // Non testable en unitaire sur l'hôte : KEY est une const évaluée à l'import du module et l'hôte
  // n'a pas de ANTHROPIC_API_KEY → la branche fetch n'est jamais atteinte. Couvert par l'intégration API.
  it.skip('TC-CR-066 — genererContenu (IA) parse le JSON entouré de prose [couvert par intégration API]', () => {})

  // TC-CR-067 — genererContenu (branche IA) : repli template sur res.ok=false / exception / JSON invalide.
  // Même contrainte (KEY const à l'import). Couvert par l'intégration API.
  it.skip('TC-CR-067 — genererContenu (IA) retombe sur le template en cas d’erreur [couvert par intégration API]', () => {})
})

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { strip, extractJson, sanitizeEmotions, nuageFallback, EMOTIONS } from '../../api/src/visualisation'
import { db } from '../../api/src/db'

// Cibles de seedage pour nuageFallback() : ids élevés/uniques, nettoyés en fin de suite.
// texteDossier() agrège plusieurs sources ; on injecte tout le texte via questionnaires_initiaux.cr_recap
// (filtre unique dossier_id=?), ce qui rend le texte agrégé parfaitement déterministe.
const USER_VIZ = 991001 // propriétaire (sert d'accompagne_id ET d'accompagnateur_id)
const DOSSIER_POIDS = 991101 // texte avec fréquences connues (TC-VIZ-015)
const DOSSIER_FILTRE = 991102 // stopwords + mots courts + un mot retenu (TC-VIZ-016)
const DOSSIER_ACCENTS = 991103 // variantes accentuées/casse (TC-VIZ-017)
const DOSSIER_VIDE = 991104 // que des stopwords -> themes:[] (TC-VIZ-018)

function seedDossier(did: number, texte: string) {
  db.prepare('INSERT INTO dossiers (id, accompagne_id, accompagnateur_id, titre) VALUES (?,?,?,?)').run(did, USER_VIZ, USER_VIZ, 'viz-unit')
  db.prepare('INSERT INTO questionnaires_initiaux (dossier_id, cr_recap) VALUES (?,?)').run(did, texte)
}

describe('VIZ — unitaires (repli déterministe nuage / émotions)', () => {
  beforeAll(() => {
    // Idempotence : purge d'un éventuel run précédent interrompu (ids fixes).
    db.prepare('DELETE FROM dossiers WHERE id IN (?,?,?,?)').run(DOSSIER_POIDS, DOSSIER_FILTRE, DOSSIER_ACCENTS, DOSSIER_VIDE)
    db.prepare('DELETE FROM users WHERE id = ?').run(USER_VIZ)
    db.prepare("INSERT INTO users (id, email, role) VALUES (?, 'viz-unit@boussole.test', 'accompagne')").run(USER_VIZ)
    // 'memoire' 10x, 'projet' 5x, 'ecriture' 2x + stopwords (écartés).
    seedDossier(
      DOSSIER_POIDS,
      [
        'memoire memoire memoire memoire memoire memoire memoire memoire memoire memoire',
        'projet projet projet projet projet',
        'ecriture ecriture',
        'le la les de des et pour avec',
      ].join(' '),
    )
    // stopwords (le la les pour avec) + mots <4 (mot oui job) + 'parcours' x2.
    seedDossier(DOSSIER_FILTRE, 'le la les pour avec mot oui job parcours parcours')
    // 'Mémoire mémoire MEMOIRE' (3x après normalisation) distinct de 'mémorisé'.
    seedDossier(DOSSIER_ACCENTS, 'Mémoire mémoire MEMOIRE mémorisé')
    // uniquement des stopwords -> aucun mot retenu.
    seedDossier(DOSSIER_VIDE, 'le la les de des et ou pour avec sans')
  })

  afterAll(() => {
    // ON DELETE CASCADE depuis dossiers/users nettoie questionnaires_initiaux.
    db.prepare('DELETE FROM dossiers WHERE id IN (?,?,?,?)').run(DOSSIER_POIDS, DOSSIER_FILTRE, DOSSIER_ACCENTS, DOSSIER_VIDE)
    db.prepare('DELETE FROM users WHERE id = ?').run(USER_VIZ)
  })

  // --- strip (sanitize HTML, pur) ---

  it('TC-VIZ-020 — strip retire les balises HTML et les entités, gère null', () => {
    // Les balises <...> et les entités &xxx; deviennent des espaces ; le texte demeure.
    const out = strip('<p>Bonjour&nbsp;<b>monde</b></p>')
    expect(out).not.toMatch(/<[^>]+>/) // plus aucune balise
    expect(out).not.toMatch(/&[a-z]+;/) // plus aucune entité
    // strip (visualisation) ne normalise pas les espaces : on vérifie le contenu, pas l'espacement exact.
    expect(out.replace(/\s+/g, ' ').trim()).toBe('Bonjour monde')
    // Entrée nulle tolérée (html || '').
    expect(strip(null as unknown as string)).toBe('')
  })

  // --- extractJson (repli de parsing de la réponse IA, pur) ---

  it('TC-VIZ-019 — extractJson isole le JSON encadré et renvoie null sur bruit/null/JSON invalide', () => {
    // 1) JSON encadré de bruit : isolé du 1er '{' au dernier '}'.
    expect(extractJson<{ themes: { mot: string; poids: number }[] }>('bla {"themes":[{"mot":"x","poids":3}]} fin')).toEqual({
      themes: [{ mot: 'x', poids: 3 }],
    })
    // 2) Pas d'accolade -> null.
    expect(extractJson('aucun json')).toBeNull()
    // 3) Entrée null -> null.
    expect(extractJson(null)).toBeNull()
    // 4) JSON invalide entre accolades -> null (catch JSON.parse).
    expect(extractJson('{cassé')).toBeNull()
  })

  // --- sanitizeEmotions (filtrage + déduplication contre EMOTIONS, pur) ---

  it('TC-VIZ-044 — sanitizeEmotions filtre hors catalogue, déduplique et gère les non-tableaux', () => {
    // dédup 'fier' + filtre 'licorne' absent du catalogue.
    expect(sanitizeEmotions(['fier', 'fier', 'licorne'])).toEqual(['fier'])
    // non-tableau (chaîne) -> [].
    expect(sanitizeEmotions('fier')).toEqual([])
    // null -> [].
    expect(sanitizeEmotions(null)).toEqual([])
    // 123 stringifié en '123' absent du catalogue (filtré), 'serein' conservé.
    expect(sanitizeEmotions([123, 'serein'])).toEqual(['serein'])
    // tableau vide -> [].
    expect(sanitizeEmotions([])).toEqual([])
    // EMOTIONS contient bien les clés utilisées et leurs familles.
    expect(EMOTIONS.fier).toBe('joie')
    expect(EMOTIONS.serein).toBe('calme')
    expect('licorne' in EMOTIONS).toBe(false)
  })

  // --- nuageFallback (repli heuristique par fréquence, lit la base seedée) ---

  it('TC-VIZ-015 — nuageFallback normalise les poids (mot le plus fréquent -> 10) et trie par fréquence', () => {
    const { themes } = nuageFallback(DOSSIER_POIDS)
    // memoire 10x (max) -> 10 ; projet 5x -> round(5/10*10)=5 ; ecriture 2x -> round(2/10*10)=2.
    expect(themes[0]).toEqual({ mot: 'memoire', poids: 10 })
    expect(themes[1]).toEqual({ mot: 'projet', poids: 5 })
    expect(themes[2]).toEqual({ mot: 'ecriture', poids: 2 })
    // Tri par fréquence décroissante.
    expect(themes.map((t) => t.poids)).toEqual([...themes.map((t) => t.poids)].sort((a, b) => b - a))
    // Au plus 24 thèmes, poids entiers bornés [1,10].
    expect(themes.length).toBeLessThanOrEqual(24)
    for (const t of themes) {
      expect(Number.isInteger(t.poids)).toBe(true)
      expect(t.poids).toBeGreaterThanOrEqual(1)
      expect(t.poids).toBeLessThanOrEqual(10)
    }
  })

  it('TC-VIZ-016 — nuageFallback écarte les stopwords et les mots de moins de 4 lettres', () => {
    const { themes } = nuageFallback(DOSSIER_FILTRE)
    const mots = themes.map((t) => t.mot)
    // Seul 'parcours' subsiste (le/la/les/pour/avec dans STOP ; mot/oui/job longueur 3).
    expect(mots).toEqual(['parcours'])
    expect(mots).not.toContain('mot')
    expect(mots).not.toContain('pour')
  })

  it('TC-VIZ-017 — nuageFallback normalise accents et casse avant comptage', () => {
    const { themes } = nuageFallback(DOSSIER_ACCENTS)
    const map = Object.fromEntries(themes.map((t) => [t.mot, t.poids]))
    // 'Mémoire'/'mémoire'/'MEMOIRE' fusionnent en 'memoire' (3 occurrences), 'mémorisé' -> 'memorise' distinct.
    expect(map.memoire).toBeDefined()
    expect(map.memorise).toBeDefined()
    expect(map.memoire).toBe(10) // 3/3 (max) -> 10
    // Pas de variante accentuée ou en majuscules conservée.
    expect(themes.map((t) => t.mot)).not.toContain('mémoire')
    expect(themes.map((t) => t.mot)).not.toContain('MEMOIRE')
  })

  it('TC-VIZ-018 — nuageFallback renvoie themes:[] quand le texte ne contient que des stopwords', () => {
    expect(nuageFallback(DOSSIER_VIDE)).toEqual({ themes: [] })
  })
})

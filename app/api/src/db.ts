import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const DB_PATH = process.env.DB_PATH || './data/boussole.sqlite'
mkdirSync(dirname(DB_PATH), { recursive: true })

/** Instance SQLite partagée (singleton). Le schéma reflète le cahier des charges. */
export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role          TEXT NOT NULL CHECK (role IN ('admin','accompagnateur','accompagne')),
    nom           TEXT,
    prenom        TEXT,
    email_verifie INTEGER NOT NULL DEFAULT 0,
    actif         INTEGER NOT NULL DEFAULT 1,
    cree_le       TEXT NOT NULL DEFAULT (datetime('now')),
    dernier_acces TEXT
  );

  CREATE TABLE IF NOT EXISTS tokens (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type      TEXT NOT NULL CHECK (type IN ('verif_email','reset_mdp')),
    valeur    TEXT NOT NULL,
    expire_le TEXT NOT NULL,
    utilise   INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS consentements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version_cgu TEXT NOT NULL,
    version_pc  TEXT NOT NULL,
    accepte_le  TEXT NOT NULL DEFAULT (datetime('now')),
    ip          TEXT
  );

  CREATE TABLE IF NOT EXISTS liens_accompagnement (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    accompagnateur_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accompagne_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    statut            TEXT NOT NULL DEFAULT 'actif',
    cree_le           TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (accompagnateur_id, accompagne_id)
  );

  CREATE TABLE IF NOT EXISTS dossiers (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    accompagne_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accompagnateur_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    titre             TEXT,
    contexte          TEXT,
    cree_le           TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questionnaires_initiaux (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id  INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    contenu     TEXT,
    cr_recap    TEXT,
    complete_le TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id     INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    date           TEXT NOT NULL DEFAULT (datetime('now')),
    phase_atteinte TEXT,
    statut         TEXT NOT NULL DEFAULT 'en_cours'
  );

  CREATE TABLE IF NOT EXISTS reponses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    phase         TEXT,
    question      TEXT,
    texte_reponse TEXT,
    source        TEXT CHECK (source IN ('saisie','dictee')) DEFAULT 'saisie',
    cree_le       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS suggestions_ia (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    type       TEXT NOT NULL CHECK (type IN ('reformulation','question','cr')),
    contenu    TEXT,
    retenue    INTEGER NOT NULL DEFAULT 0,
    cree_le    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comptes_rendus (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    version    INTEGER NOT NULL DEFAULT 1,
    chemin     TEXT,
    genere_le  TEXT NOT NULL DEFAULT (datetime('now')),
    publie     INTEGER NOT NULL DEFAULT 0,
    publie_le  TEXT
  );

  CREATE TABLE IF NOT EXISTS actions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    libelle    TEXT NOT NULL,
    echeance   TEXT,
    critere    TEXT,
    statut     TEXT NOT NULL DEFAULT 'a_faire' CHECK (statut IN ('a_faire','en_cours','fait')),
    rappel_le  TEXT,
    cree_le    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS creneaux (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    accompagnateur_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    debut             TEXT NOT NULL,
    fin               TEXT NOT NULL,
    reserve           INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS rdv (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    creneau_id    INTEGER NOT NULL REFERENCES creneaux(id) ON DELETE CASCADE,
    accompagne_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dossier_id    INTEGER REFERENCES dossiers(id) ON DELETE SET NULL,
    statut        TEXT NOT NULL DEFAULT 'confirme',
    cree_le       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tags (
    id  INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT UNIQUE NOT NULL
  );
  CREATE TABLE IF NOT EXISTS dossier_tags (
    dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (dossier_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    texte   TEXT NOT NULL,
    lu      INTEGER NOT NULL DEFAULT 0,
    cree_le TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS journal_acces (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action     TEXT,
    cible      TEXT,
    horodatage TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Auto-évaluation de la pratique (privée à l'accompagnateur), versionnée par dossier.
  CREATE TABLE IF NOT EXISTS auto_evaluations (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id         INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    statut             TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon','validee')),
    note_globale       REAL,
    commentaire_global TEXT,
    cree_le            TEXT NOT NULL DEFAULT (datetime('now')),
    maj_le             TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS auto_evaluation_scores (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    eval_id     INTEGER NOT NULL REFERENCES auto_evaluations(id) ON DELETE CASCADE,
    indicateur  TEXT NOT NULL,
    score       REAL,
    commentaire TEXT,
    UNIQUE (eval_id, indicateur)
  );

  -- Questions effectivement posées par l'accompagnateur pendant un entretien (par phase).
  CREATE TABLE IF NOT EXISTS questions_entretien (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    phase      TEXT NOT NULL,
    texte      TEXT NOT NULL,
    cree_le    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// Migrations légères (ajout de colonnes si la base existe déjà)
for (const stmt of [
  "ALTER TABLE dossiers ADD COLUMN statut TEXT NOT NULL DEFAULT 'en_cours'",
  'ALTER TABLE dossiers ADD COLUMN synthese TEXT',
  'ALTER TABLE auto_evaluations ADD COLUMN analyse_questions TEXT',
  'ALTER TABLE questions_entretien ADD COLUMN reponse TEXT',
  // Plan d'action enrichi : description, priorité, ordre (glisser-déposer), suivi du rappel
  'ALTER TABLE actions ADD COLUMN details TEXT',
  'ALTER TABLE actions ADD COLUMN priorite TEXT',
  'ALTER TABLE actions ADD COLUMN ordre INTEGER',
  'ALTER TABLE actions ADD COLUMN rappel_envoye INTEGER NOT NULL DEFAULT 0',
  // Compte rendu en HTML (remplace le .docx) : contenu éditable + origine de la version
  'ALTER TABLE comptes_rendus ADD COLUMN contenu_html TEXT',
  "ALTER TABLE comptes_rendus ADD COLUMN source TEXT NOT NULL DEFAULT 'ia'",
  // Changement d'e-mail en attente de re-validation par l'utilisateur
  'ALTER TABLE users ADD COLUMN email_pending TEXT',
  // Adresse cible portée par le jeton de confirmation (lie le lien à l'adresse précise)
  'ALTER TABLE tokens ADD COLUMN email_cible TEXT',
  // Plan d'abonnement de l'utilisateur (NULL = niveau max, toutes fonctionnalités)
  'ALTER TABLE users ADD COLUMN plan_id INTEGER',
]) {
  try {
    db.exec(stmt)
  } catch {
    /* colonne déjà présente */
  }
}

// Discussion sur un compte rendu (accompagné ↔ accompagnateur) + notes privées de l'accompagnateur
db.exec(`
  CREATE TABLE IF NOT EXISTS cr_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    auteur_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    texte      TEXT NOT NULL,
    cree_le    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS cr_notes_privees (
    session_id   INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    contenu_html TEXT,
    maj_le       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Synthèse du parcours : document HTML versionné, publiable (comme un compte rendu mais par dossier)
  CREATE TABLE IF NOT EXISTS syntheses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id   INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    version      INTEGER NOT NULL,
    contenu_html TEXT,
    source       TEXT NOT NULL DEFAULT 'ia',
    publie       INTEGER NOT NULL DEFAULT 0,
    genere_le    TEXT NOT NULL DEFAULT (datetime('now')),
    publie_le    TEXT
  );
  CREATE TABLE IF NOT EXISTS synthese_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    auteur_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    texte      TEXT NOT NULL,
    cree_le    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Miroir réflexif : analyse IA de la posture de l'accompagnateur pour UN entretien (1 par session)
  CREATE TABLE IF NOT EXISTS analyses_posture (
    session_id INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    contenu    TEXT NOT NULL,
    source     TEXT NOT NULL DEFAULT 'ia',
    genere_le  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Météo intérieure : humeur (1-5) + un mot. role='accompagne' (vu par l'accompagnateur) ou 'accompagnateur' (privé).
  CREATE TABLE IF NOT EXISTS meteo_humeur (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    auteur_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL,
    niveau     INTEGER NOT NULL,
    mot        TEXT,
    cree_le    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Micro-journal de l'accompagné, entre deux séances. partage=1 : visible par l'accompagnateur et l'IA.
  CREATE TABLE IF NOT EXISTS journal_entrees (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id    INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    accompagne_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    texte         TEXT NOT NULL,
    partage       INTEGER NOT NULL DEFAULT 0,
    cree_le       TEXT NOT NULL DEFAULT (datetime('now')),
    maj_le        TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- IA au service de l'émergence : banque de questions personnalisée et fil rouge (par dossier)
  CREATE TABLE IF NOT EXISTS emergence (
    dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    contenu    TEXT NOT NULL,
    partage    INTEGER NOT NULL DEFAULT 0,
    genere_le  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (dossier_id, type)
  );
  -- Moments-clés (verbatims pivots) d'un entretien
  CREATE TABLE IF NOT EXISTS moments_cles (
    session_id INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    contenu    TEXT NOT NULL,
    partage    INTEGER NOT NULL DEFAULT 0,
    genere_le  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Transparence / RGPD : demande d'effacement de ses données par l'accompagné
  CREATE TABLE IF NOT EXISTS demandes_effacement (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id    INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    accompagne_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    motif         TEXT,
    statut        TEXT NOT NULL DEFAULT 'en_attente',
    cree_le       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Plans d'abonnement : chaque plan active un sous-ensemble de fonctionnalités (features = JSON de clés)
  CREATE TABLE IF NOT EXISTS plans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nom         TEXT NOT NULL,
    description TEXT,
    features    TEXT NOT NULL DEFAULT '[]',
    cree_le     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Signaux faibles : dernier état connu d'un dossier, pour ne notifier qu'aux CHANGEMENTS d'état
  CREATE TABLE IF NOT EXISTS signaux_etat (
    dossier_id INTEGER PRIMARY KEY REFERENCES dossiers(id) ON DELETE CASCADE,
    niveau     TEXT NOT NULL,
    signature  TEXT NOT NULL,
    notifie_le TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Digest hebdomadaire : trace des envois (un seul par accompagnateur et par semaine ISO)
  CREATE TABLE IF NOT EXISTS digest_envois (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    semaine   TEXT NOT NULL,
    envoye_le TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, semaine)
  );

  -- Réflexivité (accompagnateur) : bilan de pratique global (1 courant par accompagnateur)
  CREATE TABLE IF NOT EXISTS bilans_pratique (
    accompagnateur_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    contenu           TEXT NOT NULL,
    source            TEXT NOT NULL DEFAULT 'ia',
    genere_le         TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- Débriefing réflexif à chaud, après un entretien (1 par session)
  CREATE TABLE IF NOT EXISTS debriefings (
    session_id INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    contenu    TEXT NOT NULL,
    source     TEXT NOT NULL DEFAULT 'manuel',
    maj_le     TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- Auto-confrontation / replay annoté : annotations par moment d'un entretien (1 blob par session)
  CREATE TABLE IF NOT EXISTS replays (
    session_id INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    contenu    TEXT NOT NULL,
    source     TEXT NOT NULL DEFAULT 'manuel',
    maj_le     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Mutualisation entre pairs : ressources partagées par les accompagnateurs (interne + lien public)
  CREATE TABLE IF NOT EXISTS ressources_partagees (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    auteur_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    titre     TEXT NOT NULL,
    type      TEXT NOT NULL DEFAULT 'astuce',
    contenu   TEXT NOT NULL,
    portee    TEXT NOT NULL DEFAULT 'interne',
    token     TEXT,
    cree_le   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Assistant de problématisation (accompagné) : guidé puis libre (1 par dossier)
  CREATE TABLE IF NOT EXISTS problematisations (
    dossier_id INTEGER PRIMARY KEY REFERENCES dossiers(id) ON DELETE CASCADE,
    contenu    TEXT NOT NULL,
    source     TEXT NOT NULL DEFAULT 'manuel',
    maj_le     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Résumé « où j'en suis » (accompagné) : synthèse IA de l'avancement (1 par dossier, régénérable)
  CREATE TABLE IF NOT EXISTS resumes_parcours (
    dossier_id INTEGER PRIMARY KEY REFERENCES dossiers(id) ON DELETE CASCADE,
    contenu    TEXT NOT NULL,
    source     TEXT NOT NULL DEFAULT 'ia',
    genere_le  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Demande de rendez-vous quand l'accompagnateur n'a pas de créneau disponible
  CREATE TABLE IF NOT EXISTS demandes_rdv (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id        INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    accompagne_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accompagnateur_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    statut            TEXT NOT NULL DEFAULT 'en_attente',
    cree_le           TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)
// Initialise l'ordre des actions héritées (avant le glisser-déposer) pour un tri déterministe
try {
  db.exec('UPDATE actions SET ordre = id WHERE ordre IS NULL')
} catch {
  /* table absente sur base toute neuve : le CREATE l'a déjà créée vide */
}

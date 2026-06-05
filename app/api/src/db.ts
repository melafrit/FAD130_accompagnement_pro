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
`)

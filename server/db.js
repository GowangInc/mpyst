import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.MPYST_DB_PATH || path.join(__dirname, '..', 'mpyst.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'competition',
      max_players INTEGER NOT NULL DEFAULT 20,
      active INTEGER NOT NULL DEFAULT 1,
      admin_password_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#ffd700',
      competition_id INTEGER NOT NULL,
      progress_json TEXT NOT NULL DEFAULT '{}',
      completed_at TEXT,
      last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      player_id INTEGER,
      event_type TEXT NOT NULL,
      data_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_players_competition ON players(competition_id);
    CREATE INDEX IF NOT EXISTS idx_events_competition ON events(competition_id);
  `);
}

export function generateToken() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

// Competitions
export function createCompetition({ code, name, mode = 'competition', maxPlayers = 20, adminPasswordHash = null }) {
  const stmt = db.prepare(`
    INSERT INTO competitions (code, name, mode, max_players, admin_password_hash)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(code.toUpperCase().trim(), name.trim(), mode, maxPlayers, adminPasswordHash);
  return getCompetitionById(info.lastInsertRowid);
}

export function getCompetitionById(id) {
  return db.prepare('SELECT * FROM competitions WHERE id = ?').get(id);
}

export function getCompetitionByCode(code) {
  return db.prepare('SELECT * FROM competitions WHERE code = ?').get(code.toUpperCase().trim());
}

export function listCompetitions(activeOnly = false) {
  if (activeOnly) {
    return db.prepare('SELECT * FROM competitions WHERE active = 1 ORDER BY created_at DESC').all();
  }
  return db.prepare('SELECT * FROM competitions ORDER BY created_at DESC').all();
}

export function updateCompetitionActive(id, active) {
  db.prepare('UPDATE competitions SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  return getCompetitionById(id);
}

export function deleteCompetition(id) {
  db.prepare('DELETE FROM competitions WHERE id = ?').run(id);
}

export function resetCompetition(id) {
  db.prepare('UPDATE players SET progress_json = ?, completed_at = NULL WHERE competition_id = ?').run('{}', id);
  db.prepare('DELETE FROM events WHERE competition_id = ?').run(id);
  return getCompetitionById(id);
}

export function getPlayerCount(competitionId) {
  return db.prepare('SELECT COUNT(*) as count FROM players WHERE competition_id = ?').get(competitionId).count;
}

// Players
export function createPlayer({ token, name, color, competitionId, progress = {} }) {
  const stmt = db.prepare(`
    INSERT INTO players (token, name, color, competition_id, progress_json, last_active_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  const info = stmt.run(token, name.trim(), color, competitionId, JSON.stringify(progress));
  return getPlayerById(info.lastInsertRowid);
}

export function getPlayerById(id) {
  const row = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
  return row ? hydratePlayer(row) : null;
}

export function getPlayerByToken(token) {
  const row = db.prepare('SELECT * FROM players WHERE token = ?').get(token);
  return row ? hydratePlayer(row) : null;
}

export function getPlayersByCompetition(competitionId) {
  const rows = db.prepare('SELECT * FROM players WHERE competition_id = ? ORDER BY created_at ASC').all(competitionId);
  return rows.map(hydratePlayer);
}

export function updatePlayerName(token, name, color) {
  db.prepare("UPDATE players SET name = ?, color = ?, last_active_at = datetime('now') WHERE token = ?")
    .run(name.trim(), color, token);
  return getPlayerByToken(token);
}

export function savePlayerProgress(token, progress) {
  const completedAt = progress.mystBookRevealed ? new Date().toISOString() : null;
  const stmt = db.prepare(`
    UPDATE players
    SET progress_json = ?, last_active_at = datetime('now'),
        completed_at = CASE WHEN ? IS NOT NULL THEN COALESCE(completed_at, datetime('now')) ELSE completed_at END
    WHERE token = ?
  `);
  stmt.run(JSON.stringify(progress), completedAt, token);
  return getPlayerByToken(token);
}

export function touchPlayer(token) {
  db.prepare("UPDATE players SET last_active_at = datetime('now') WHERE token = ?").run(token);
}

// Leaderboard
export function getLeaderboard(competitionId) {
  const rows = db.prepare(`
    SELECT id, name, color, progress_json, completed_at, last_active_at, created_at
    FROM players
    WHERE competition_id = ?
    ORDER BY completed_at IS NULL, completed_at ASC, last_active_at DESC
  `).all(competitionId);
  return rows.map(hydratePlayer);
}

// Events
export function recordEvent({ competitionId, playerId = null, eventType, data = {} }) {
  const stmt = db.prepare(`
    INSERT INTO events (competition_id, player_id, event_type, data_json)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(competitionId, playerId, eventType, JSON.stringify(data));
}

export function getRecentEvents(competitionId, limit = 100) {
  return db.prepare(`
    SELECT e.*, p.name as player_name
    FROM events e
    LEFT JOIN players p ON e.player_id = p.id
    WHERE e.competition_id = ?
    ORDER BY e.created_at DESC
    LIMIT ?
  `).all(competitionId, limit);
}

function hydratePlayer(row) {
  return {
    id: row.id,
    token: row.token,
    name: row.name,
    color: row.color,
    competitionId: row.competition_id,
    progress: safeJsonParse(row.progress_json),
    completedAt: row.completed_at,
    lastActiveAt: row.last_active_at,
    createdAt: row.created_at
  };
}

function safeJsonParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export default db;

import Database from 'better-sqlite3'
import { join } from 'path'

let db: Database.Database | null = null

export function getDb() {
  if (!db) {
    const dbPath = join(process.cwd(), 'datepicker.db')
    db = new Database(dbPath)

    // Initialize tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        possible_dates TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_password_hash TEXT NOT NULL,
        availability TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id)
      );

      CREATE INDEX IF NOT EXISTS idx_responses_event_id ON responses(event_id);
      CREATE INDEX IF NOT EXISTS idx_responses_user ON responses(event_id, user_name);
    `)
  }

  return db
}

export interface Event {
  id: string
  name: string
  password_hash: string
  possible_dates: string // JSON array
  created_at: number
}

export interface Response {
  id?: number
  event_id: string
  user_name: string
  user_password_hash: string
  availability: string // JSON object
  created_at: number
  updated_at: number
}

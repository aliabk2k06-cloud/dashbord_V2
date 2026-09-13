import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { runAutoBackup } from './backup.js'
import { runMigrations } from './migrator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const storageDir = path.join(__dirname, 'storage', 'clients')
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'compta.db')

// Perform automatic backup before connecting / starting
runAutoBackup(dbPath)

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message)
  } else {
    console.log(`Connected to SQLite database at: ${dbPath}`)
  }
})

// Initialize Schema via Migrator
runMigrations(db)
  .then(() => {
    console.log('[Database] Migrations checked and ready.')
  })
  .catch((err) => {
    console.error('[Database] Migration initialization error:', err.message)
  })

export default db

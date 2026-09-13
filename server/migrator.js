import * as migration001 from './migrations/001_init.js'
import * as migration002 from './migrations/002_bank_statements.js'
import * as migration003 from './migrations/003_accounts.js'
import * as migration004 from './migrations/004_sub_accounts.js'

const migrations = [
  { name: '001_init', module: migration001 },
  { name: '002_bank_statements', module: migration002 },
  { name: '003_accounts', module: migration003 },
  { name: '004_sub_accounts', module: migration004 },
]

/**
 * Runs pending SQLite database migrations.
 * @param {import('sqlite3').Database} db
 */
export async function runMigrations(db) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `,
      async (err) => {
        if (err) {
          console.error('[Migrator] Error creating _migrations table:', err.message)
          return reject(err)
        }

        db.all('SELECT name FROM _migrations', [], async (queryErr, rows) => {
          if (queryErr) {
            console.error('[Migrator] Error querying executed migrations:', queryErr.message)
            return reject(queryErr)
          }

          const executedNames = new Set((rows || []).map((r) => r.name))

          for (const migration of migrations) {
            if (!executedNames.has(migration.name)) {
              console.log(`[Migrator] Executing migration: ${migration.name}...`)
              try {
                await migration.module.up(db)
                await new Promise((resIns, rejIns) => {
                  db.run('INSERT INTO _migrations (name) VALUES (?)', [migration.name], (insErr) => {
                    if (insErr) rejIns(insErr)
                    else resIns()
                  })
                })
                console.log(`[Migrator] Migration ${migration.name} applied successfully.`)
              } catch (migErr) {
                console.error(`[Migrator] Migration ${migration.name} failed:`, migErr.message)
                return reject(migErr)
              }
            }
          }

          resolve()
        })
      }
    )
  })
}

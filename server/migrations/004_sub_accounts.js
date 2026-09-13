/**
 * Migration 004: Create sub_accounts and account_creation_log tables
 */
export async function up(db) {
  await new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS sub_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_code TEXT NOT NULL,
        entity_type TEXT CHECK(entity_type IN ('supplier', 'client', 'other')) DEFAULT 'supplier',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, code)
      )`,
      (err) => (err ? reject(err) : resolve())
    )
  })

  await new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS account_creation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        sub_account_code TEXT NOT NULL,
        entity_name TEXT NOT NULL,
        created_by TEXT DEFAULT 'AI_n8n',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => (err ? reject(err) : resolve())
    )
  })
}

export async function down(db) {
  await new Promise((resolve, reject) => {
    db.run('DROP TABLE IF EXISTS account_creation_log', () => {
      db.run('DROP TABLE IF EXISTS sub_accounts', (err) => (err ? reject(err) : resolve()))
    })
  })
}

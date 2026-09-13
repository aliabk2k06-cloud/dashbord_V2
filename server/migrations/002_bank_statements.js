/**
 * Migration 002_bank_statements: Create bank_statements table
 */
export async function up(db) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      CREATE TABLE IF NOT EXISTS bank_statements (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        statement_number TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        period TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        debit_total REAL DEFAULT 0,
        credit_total REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        file_path TEXT,
        notes TEXT,
        fiscal_year INTEGER DEFAULT 2026,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `,
      (err) => {
        if (err) return reject(err)
        resolve()
      }
    )
  })
}

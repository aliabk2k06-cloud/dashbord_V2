/**
 * Initial Schema Migration 001_init
 */
export async function up(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Clients Table
      db.run(
        `
        CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY,
          owner_name TEXT NOT NULL,
          business_name TEXT NOT NULL,
          nif TEXT NOT NULL UNIQUE,
          nis TEXT NOT NULL,
          rc TEXT NOT NULL,
          activity_type TEXT NOT NULL,
          location TEXT NOT NULL,
          phone TEXT NOT NULL DEFAULT '',
          email TEXT NOT NULL DEFAULT '',
          status TEXT DEFAULT 'active',
          documents_status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `,
        (err) => {
          if (err) return reject(err)
        }
      )

      // Invoices Table
      db.run(
        `
        CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          invoice_number TEXT NOT NULL,
          type TEXT NOT NULL,
          amount_ht REAL NOT NULL DEFAULT 0,
          tva_rate REAL NOT NULL DEFAULT 19,
          amount_ttc REAL NOT NULL,
          date TEXT NOT NULL,
          counterparty TEXT NOT NULL,
          file_path TEXT,
          is_generated INTEGER DEFAULT 0,
          notes TEXT,
          fiscal_year INTEGER DEFAULT 2026,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        )
      `,
        (err) => {
          if (err) return reject(err)
        }
      )

      // Client Fiscal Years Table
      db.run(
        `
        CREATE TABLE IF NOT EXISTS client_fiscal_years (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          year INTEGER NOT NULL,
          status TEXT DEFAULT 'open',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
          UNIQUE(client_id, year)
        )
      `,
        (err) => {
          if (err) return reject(err)
        }
      )

      // Seed initial clients if clients table is empty
      db.get('SELECT COUNT(*) as count FROM clients', (err, row) => {
        if (err) return reject(err)
        if (row && row.count === 0) {
          console.log('[Migration 001] Seeding initial sample clients...')
          const stmt = db.prepare(`
            INSERT INTO clients (id, owner_name, business_name, nif, nis, rc, activity_type, location, phone, email, documents_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `)

          stmt.run(
            'cli-1',
            'أحمد بومدين',
            'مؤسسة الأمل للتجارة والخدمات',
            '001216000123456',
            '001216000123456',
            '16/00-1234567A00',
            'تجارة التجزئة',
            'الجزائر العاصمة',
            '0550123456',
            'ahmed.boumediene@example.com',
            'up_to_date'
          )

          stmt.run(
            'cli-2',
            'كريم بلحاج',
            'شركة الصداقة للمقاولات',
            '001925000987654',
            '001925000987654',
            '31/00-7654321B00',
            'أشغال بناء',
            'وهران',
            '0661987654',
            'karim.belhadj@example.com',
            'pending'
          )

          stmt.run(
            'cli-3',
            'سمير بن عيسى',
            'محل الوفاء للاستيراد والتصدير',
            '002030000456789',
            '002030000456789',
            '25/00-9876543C00',
            'استيراد مواد غذائية',
            'قسنطينة',
            '0770456789',
            'samir.beneissa@example.com',
            'pending'
          )

          stmt.finalize((finalizeErr) => {
            if (finalizeErr) return reject(finalizeErr)
            resolve()
          })
        } else {
          resolve()
        }
      })
    })
  })
}

/**
 * Migration 003: Create Accounts table and seed standard Algerian SCF
 */
export async function up(db) {
  await new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('main', 'sub')) DEFAULT 'main',
        is_postable INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => (err ? reject(err) : resolve())
    )
  })

  const standardAccounts = [
    { code: '401', name: "موردو المخزونات والخدمات - Fournisseurs" },
    { code: '404', name: "موردو التثبيتات - Fournisseurs d'immobilisations" },
    { code: '411', name: "الزبائن - Clients" },
    { code: '4456', name: "الرسم على القيمة المضافة القابل للاسترجاع - TVA déductible" },
    { code: '4457', name: "الرسم على القيمة المضافة المحصل - TVA collectée" },
    { code: '600', name: "مشتريات البضائع المبيعة - Achats de marchandises" },
    { code: '601', name: "المواد الأولية - Matières premières" },
    { code: '602', name: "التموينات الأخرى - Autres approvisionnements" },
    { code: '604', name: "مشتريات الدراسات والخدمات المؤداة - Achats d'études et prestations de services" },
    { code: '605', name: "مشتريات المعدات والعتاد - Achats de matériels et équipements" },
    { code: '607', name: "المشتريات غير المخزنة من المواد والتوريدات - Achats non stockés de matières et fournitures" },
    { code: '611', name: "التقاول العام - Sous-traitance générale" },
    { code: '613', name: "الإيجارات - Locations" },
    { code: '615', name: "الصيانة والتصليحات - Entretiens et réparations" },
    { code: '616', name: "أقساط التأمينات - Primes d'assurances" },
    { code: '626', name: "مصاريف البريد والاتصالات السلكية واللاسلكية - Frais postaux et de télécommunications" },
    { code: '700', name: "المبيعات من البضائع - Ventes de marchandises" },
    { code: '701', name: "المبيعات من المنتجات المصنعة - Ventes de produits finis" },
    { code: '704', name: "مبيعات الأشغال - Ventes de travaux" },
    { code: '706', name: "تقديم الخدمات - Prestations de services" }
  ]

  const insertStmt = db.prepare('INSERT OR IGNORE INTO accounts (code, name, type, is_postable) VALUES (?, ?, ?, ?)')
  
  await new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION')
      standardAccounts.forEach(acc => {
        insertStmt.run([acc.code, acc.name, 'main', 1])
      })
      db.run('COMMIT', (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })
}

export async function down(db) {
  await new Promise((resolve, reject) => {
    db.run('DROP TABLE IF EXISTS accounts', (err) => (err ? reject(err) : resolve()))
  })
}

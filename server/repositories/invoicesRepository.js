import db from '../db.js'

export const invoicesRepository = {
  /**
   * Find invoices for a client, optionally filtered by year
   */
  async findByClient(clientId, yearQuery) {
    let query = 'SELECT * FROM invoices WHERE client_id = ?'
    const params = [clientId]

    if (yearQuery && yearQuery !== 'all') {
      query += ' AND fiscal_year = ?'
      params.push(parseInt(yearQuery, 10))
    }

    query += ' ORDER BY date DESC'

    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) return reject(err)
        resolve(rows || [])
      })
    })
  },

  /**
   * Find invoice by ID
   */
  async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM invoices WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err)
        resolve(row || null)
      })
    })
  },

  /**
   * Create a new invoice
   */
  async create(invoiceData) {
    const { id, client_id, invoice_number, type, amount_ht, tva_rate, amount_ttc, date, counterparty, file_path, is_generated, notes, fiscal_year } = invoiceData

    const safeHt = amount_ht || 0
    const safeTva = tva_rate !== undefined ? tva_rate : 19
    const safeGenerated = is_generated ? 1 : 0
    const year = fiscal_year ? parseInt(fiscal_year, 10) : new Date(date).getFullYear() || 2026

    const query = `
      INSERT INTO invoices (id, client_id, invoice_number, type, amount_ht, tva_rate, amount_ttc, date, counterparty, file_path, is_generated, notes, fiscal_year, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `

    return new Promise((resolve, reject) => {
      db.run(
        query,
        [id, client_id, invoice_number, type, safeHt, safeTva, amount_ttc, date, counterparty, file_path || null, safeGenerated, notes || '', year],
        function (err) {
          if (err) return reject(err)
          resolve({
            id,
            client_id,
            invoice_number,
            type,
            amount_ht: safeHt,
            tva_rate: safeTva,
            amount_ttc,
            date,
            counterparty,
            file_path: file_path || null,
            is_generated: safeGenerated,
            notes: notes || '',
            fiscal_year: year,
            created_at: new Date().toISOString(),
          })
        }
      )
    })
  },

  /**
   * Update an existing invoice (supports partial updates)
   */
  async update(id, invoiceData) {
    const keys = Object.keys(invoiceData)
    if (keys.length === 0) return true

    const setClauses = []
    const params = []

    keys.forEach((key) => {
      setClauses.push(`${key} = ?`)
      params.push(invoiceData[key])
    })

    params.push(id)
    const query = `UPDATE invoices SET ${setClauses.join(', ')} WHERE id = ?`

    return new Promise((resolve, reject) => {
      db.run(query, params, function (err) {
        if (err) return reject(err)
        resolve(this.changes > 0)
      })
    })
  },

  /**
   * Delete an invoice by ID
   */
  async delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM invoices WHERE id = ?', [id], function (err) {
        if (err) return reject(err)
        resolve(this.changes > 0)
      })
    })
  },
}

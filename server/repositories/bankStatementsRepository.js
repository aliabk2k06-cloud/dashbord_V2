import db from '../db.js'

export const bankStatementsRepository = {
  /**
   * Find bank statements for a client, optionally filtered by year
   */
  async findByClient(clientId, yearQuery) {
    let query = 'SELECT * FROM bank_statements WHERE client_id = ?'
    const params = [clientId]

    if (yearQuery && yearQuery !== 'all') {
      query += ' AND fiscal_year = ?'
      params.push(parseInt(yearQuery, 10))
    }

    query += ' ORDER BY created_at DESC'

    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) return reject(err)
        resolve(rows || [])
      })
    })
  },

  /**
   * Find bank statement by ID
   */
  async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM bank_statements WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err)
        resolve(row || null)
      })
    })
  },

  /**
   * Create a new bank statement
   */
  async create(data) {
    const {
      id,
      client_id,
      statement_number,
      bank_name,
      period,
      start_date,
      end_date,
      debit_total,
      credit_total,
      balance,
      file_path,
      notes,
      fiscal_year,
    } = data

    const query = `
      INSERT INTO bank_statements (id, client_id, statement_number, bank_name, period, start_date, end_date, debit_total, credit_total, balance, file_path, notes, fiscal_year, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `

    return new Promise((resolve, reject) => {
      db.run(
        query,
        [
          id,
          client_id,
          statement_number,
          bank_name,
          period,
          start_date || '',
          end_date || '',
          debit_total || 0,
          credit_total || 0,
          balance || 0,
          file_path || null,
          notes || '',
          fiscal_year || 2026,
        ],
        function (err) {
          if (err) return reject(err)
          resolve({
            id,
            client_id,
            statement_number,
            bank_name,
            period,
            start_date: start_date || '',
            end_date: end_date || '',
            debit_total: debit_total || 0,
            credit_total: credit_total || 0,
            balance: balance || 0,
            file_path: file_path || null,
            notes: notes || '',
            fiscal_year: fiscal_year || 2026,
            created_at: new Date().toISOString(),
          })
        }
      )
    })
  },

  /**
   * Update an existing bank statement
   */
  async update(id, data) {
    const {
      statement_number,
      bank_name,
      period,
      start_date,
      end_date,
      debit_total,
      credit_total,
      balance,
      notes,
      fiscal_year,
    } = data

    const query = `
      UPDATE bank_statements
      SET statement_number = ?, bank_name = ?, period = ?, start_date = ?, end_date = ?, debit_total = ?, credit_total = ?, balance = ?, notes = ?, fiscal_year = ?
      WHERE id = ?
    `

    return new Promise((resolve, reject) => {
      db.run(
        query,
        [
          statement_number,
          bank_name,
          period,
          start_date || '',
          end_date || '',
          debit_total || 0,
          credit_total || 0,
          balance || 0,
          notes || '',
          fiscal_year || 2026,
          id,
        ],
        function (err) {
          if (err) return reject(err)
          resolve(this.changes > 0)
        }
      )
    })
  },

  /**
   * Delete a bank statement by ID
   */
  async delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM bank_statements WHERE id = ?', [id], function (err) {
        if (err) return reject(err)
        resolve(this.changes > 0)
      })
    })
  },
}

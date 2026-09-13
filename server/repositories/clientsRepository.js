import db from '../db.js'

export const clientsRepository = {
  /**
   * Find all clients ordered by creation date descending
   */
  async findAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM clients ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return reject(err)
        resolve(rows || [])
      })
    })
  },

  /**
   * Find a single client by ID
   */
  async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM clients WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err)
        resolve(row || null)
      })
    })
  },

  /**
   * Get document statuses stats
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      db.all('SELECT documents_status FROM clients', [], (err, rows) => {
        if (err) return reject(err)
        const safeRows = rows || []
        const total = safeRows.length
        const upToDate = safeRows.filter((r) => r.documents_status === 'up_to_date').length
        const pending = safeRows.filter((r) => r.documents_status === 'pending').length
        resolve({ total, upToDate, pending })
      })
    })
  },

  /**
   * Insert a new client
   */
  async create(clientData) {
    const { id, owner_name, business_name, nif, nis, rc, activity_type, location, phone, email, status, documents_status } = clientData
    const query = `
      INSERT INTO clients (id, owner_name, business_name, nif, nis, rc, activity_type, location, phone, email, status, documents_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
    return new Promise((resolve, reject) => {
      db.run(
        query,
        [id, owner_name, business_name, nif, nis, rc, activity_type, location, phone || '', email || '', status || 'active', documents_status || 'pending'],
        function (err) {
          if (err) return reject(err)
          resolve({ id, ...clientData })
        }
      )
    })
  },

  /**
   * Update client details by ID
   */
  async update(id, clientData) {
    const existing = await this.findById(id)
    if (!existing) {
      return null
    }

    const updatedOwner = clientData.owner_name !== undefined ? clientData.owner_name : existing.owner_name
    const updatedBusiness = clientData.business_name !== undefined ? clientData.business_name : existing.business_name
    const updatedNif = clientData.nif !== undefined ? clientData.nif : existing.nif
    const updatedNis = clientData.nis !== undefined ? clientData.nis : existing.nis
    const updatedRc = clientData.rc !== undefined ? clientData.rc : existing.rc
    const updatedActivity = clientData.activity_type !== undefined ? clientData.activity_type : existing.activity_type
    const updatedLocation = clientData.location !== undefined ? clientData.location : existing.location
    const updatedPhone = clientData.phone !== undefined ? clientData.phone : existing.phone
    const updatedEmail = clientData.email !== undefined ? clientData.email : existing.email
    const updatedDocStatus = clientData.documents_status !== undefined ? clientData.documents_status : existing.documents_status
    const updatedStatus = clientData.status !== undefined ? clientData.status : existing.status

    const query = `
      UPDATE clients
      SET owner_name = ?, business_name = ?, nif = ?, nis = ?, rc = ?, activity_type = ?, location = ?, phone = ?, email = ?, documents_status = ?, status = ?
      WHERE id = ?
    `

    return new Promise((resolve, reject) => {
      db.run(
        query,
        [updatedOwner, updatedBusiness, updatedNif, updatedNis, updatedRc, updatedActivity, updatedLocation, updatedPhone, updatedEmail, updatedDocStatus, updatedStatus, id],
        function (err) {
          if (err) return reject(err)
          resolve(true)
        }
      )
    })
  },

  /**
   * Delete a client by ID
   */
  async delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM clients WHERE id = ?', [id], function (err) {
        if (err) return reject(err)
        resolve(this.changes > 0)
      })
    })
  },

  // --- Fiscal Years Methods ---

  async findFiscalYears(clientId) {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM client_fiscal_years WHERE client_id = ? ORDER BY year DESC', [clientId], (err, rows) => {
        if (err) return reject(err)
        resolve(rows || [])
      })
    })
  },

  async addFiscalYear(id, clientId, year) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO client_fiscal_years (id, client_id, year, status) VALUES (?, ?, ?, 'open')`,
        [id, clientId, year],
        function (err) {
          if (err) return reject(err)
          resolve({ id, client_id: clientId, year, status: 'open' })
        }
      )
    })
  },

  async closePreviousYears(clientId) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE client_fiscal_years SET status = 'closed' WHERE client_id = ?`, [clientId], (err) => {
        if (err) return reject(err)
        resolve(true)
      })
    })
  },

  async updateFiscalYearStatus(id, clientId, year, status) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM client_fiscal_years WHERE client_id = ? AND year = ?', [clientId, year], (err, existing) => {
        if (err) return reject(err)

        if (existing) {
          db.run('UPDATE client_fiscal_years SET status = ? WHERE client_id = ? AND year = ?', [status, clientId, year], (upErr) => {
            if (upErr) return reject(upErr)
            resolve(true)
          })
        } else {
          db.run('INSERT INTO client_fiscal_years (id, client_id, year, status) VALUES (?, ?, ?, ?)', [id, clientId, year, status], (insErr) => {
            if (insErr) return reject(insErr)
            resolve(true)
          })
        }
      })
    })
  },
}

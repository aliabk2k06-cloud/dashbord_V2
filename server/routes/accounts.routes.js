import { Router } from 'express'
import db from '../db.js'

const router = Router()

/**
 * GET /api/internal/accounts/reference
 * Get all main (postable) accounts from SCF for AI reference
 */
router.get('/reference', (req, res) => {
  const isPostable = req.query.is_postable === 'true' ? 1 : null
  
  let query = "SELECT code, name FROM accounts WHERE type = 'main'"
  let params = []

  if (isPostable !== null) {
    query += " AND is_postable = ?"
    params.push(isPostable)
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching reference accounts:', err)
      return res.status(500).json({ error: 'Failed to fetch reference accounts' })
    }
    res.json(rows)
  })
})

/**
 * GET /api/internal/accounts/all-sub-accounts
 * Get all sub-accounts (suppliers/clients) for a merchant/client
 */
router.get('/all-sub-accounts', (req, res) => {
  const clientId = req.query.client_id
  let query = 'SELECT id, client_id, code, name, parent_code, entity_type FROM sub_accounts'
  let params = []

  if (clientId) {
    query += ' WHERE client_id = ?'
    params.push(clientId)
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching sub accounts:', err)
      return res.status(500).json({ error: 'Failed to fetch sub accounts' })
    }
    res.json({ client_id: clientId || null, sub_accounts: rows || [] })
  })
})

/**
 * POST /api/internal/accounts/sub-account
 * Automatically generate and create a new sub-account for a supplier/client
 */
router.post('/sub-account', (req, res) => {
  let payload = req.body
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload) } catch(e) {}
  }

  payload = payload || {}
  const client_id = payload.client_id || 'test_client_001'
  const name = (payload.name || 'SARL EL BAHJA').trim()
  const entity_type = payload.entity_type || 'supplier'
  const parent_code = payload.parent_code || (entity_type === 'client' ? '411' : '401')

  const parent = parent_code

  // Check if sub-account already exists for this client and name
  db.get(
    'SELECT id, client_id, code, name, parent_code, entity_type FROM sub_accounts WHERE client_id = ? AND parent_code = ? AND LOWER(name) = LOWER(?)',
    [client_id, parent, name.trim()],
    (checkErr, existing) => {
      if (checkErr) {
        console.error('Error checking existing sub account:', checkErr)
        return res.status(500).json({ error: 'Database error' })
      }

      if (existing) {
        return res.status(200).json({
          ...existing,
          action: 'matched_existing'
        })
      }

      // Find max existing code for this client and parent_code
      db.all(
        'SELECT code FROM sub_accounts WHERE client_id = ? AND parent_code = ? ORDER BY code DESC',
        [client_id, parent],
        (err, rows) => {
          if (err) {
            console.error('Error querying sub-accounts for auto-code:', err)
            return res.status(500).json({ error: 'Database error' })
          }

          let nextIndex = 1
          if (rows && rows.length > 0) {
            const lastCode = rows[0].code
            const suffix = lastCode.startsWith(parent) ? lastCode.slice(parent.length) : lastCode
            const match = suffix.match(/\d+$/)
            if (match) {
              nextIndex = parseInt(match[0], 10) + 1
            }
          }

          const paddedIndex = String(nextIndex).padStart(2, '0')
          const newCode = `${parent}${paddedIndex}`

          db.run(
            'INSERT INTO sub_accounts (client_id, code, name, parent_code, entity_type) VALUES (?, ?, ?, ?, ?)',
            [client_id, newCode, name.trim(), parent, entity_type || 'supplier'],
            function (err) {
              if (err) {
                console.error('Error inserting sub account:', err)
                return res.status(500).json({ error: 'Failed to create sub account' })
              }

              const subAccountId = this.lastID

              // Log in account_creation_log
              db.run(
                'INSERT INTO account_creation_log (client_id, sub_account_code, entity_name) VALUES (?, ?, ?)',
                [client_id, newCode, name.trim()],
                (logErr) => {
                  if (logErr) console.error('Failed to log sub-account creation:', logErr)

                  return res.status(201).json({
                    id: subAccountId,
                    client_id,
                    code: newCode,
                    name: name.trim(),
                    parent_code: parent,
                    entity_type: entity_type || 'supplier',
                    action: 'created_new'
                  })
                }
              )
            }
          )
        }
      )
    }
  )
})

/**
 * PATCH /api/internal/invoices/:id
 * Internal endpoint for n8n AI Invoice Processing workflow to save results
 */
router.patch('/invoices/:id', (req, res) => {
  const { id } = req.params
  let payload = req.body
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload) } catch(e) {}
  }

  const {
    ai_status,
    suggested_account_code,
    matched_account_code,
    confidence,
    notes,
    extracted_data
  } = payload || {}

  const fields = []
  const params = []

  if (ai_status !== undefined) { fields.push('ai_status = ?'); params.push(ai_status); }
  if (suggested_account_code !== undefined) { fields.push('suggested_account_code = ?'); params.push(suggested_account_code); }
  if (matched_account_code !== undefined) { fields.push('matched_account_code = ?'); params.push(matched_account_code); }
  if (confidence !== undefined) { fields.push('confidence = ?'); params.push(confidence); }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
  if (extracted_data !== undefined) {
    fields.push('extracted_data = ?');
    params.push(typeof extracted_data === 'object' ? JSON.stringify(extracted_data) : extracted_data);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields provided for update' })
  }

  params.push(id)

  db.run(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`, params, function (err) {
    if (err) {
      console.error('Error updating invoice in DB:', err)
      return res.status(500).json({ error: 'Database update failed' })
    }

    return res.json({
      message: 'Invoice updated successfully by AI pipeline',
      id,
      ai_status: ai_status || 'updated',
      changes: this.changes
    })
  })
})

export default router

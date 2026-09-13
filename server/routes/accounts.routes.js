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
    res.json(rows || [])
  })
})

/**
 * POST /api/internal/accounts/sub-account
 * Automatically generate and create a new sub-account for a supplier/client
 */
router.post('/sub-account', (req, res) => {
  const { client_id, name, entity_type, parent_code } = req.body

  if (!client_id || !name) {
    return res.status(400).json({ error: 'client_id and name are required' })
  }

  const parent = parent_code || (entity_type === 'client' ? '411' : '401')

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
        const match = lastCode.match(/\d+$/)
        if (match) {
          nextIndex = parseInt(match[0], 10) + 1
        }
      }

      const paddedIndex = String(nextIndex).padStart(4, '0')
      const newCode = `${parent}.${paddedIndex}`

      db.run(
        'INSERT INTO sub_accounts (client_id, code, name, parent_code, entity_type) VALUES (?, ?, ?, ?, ?)',
        [client_id, newCode, name, parent, entity_type || 'supplier'],
        function (err) {
          if (err) {
            console.error('Error inserting sub account:', err)
            return res.status(500).json({ error: 'Failed to create sub account' })
          }

          const subAccountId = this.lastID

          // Log in account_creation_log
          db.run(
            'INSERT INTO account_creation_log (client_id, sub_account_code, entity_name) VALUES (?, ?, ?)',
            [client_id, newCode, name],
            (logErr) => {
              if (logErr) console.error('Failed to log sub-account creation:', logErr)

              return res.status(201).json({
                id: subAccountId,
                client_id,
                code: newCode,
                name,
                parent_code: parent,
                entity_type: entity_type || 'supplier'
              })
            }
          )
        }
      )
    }
  )
})

export default router

import db from '../db.js'

/**
 * Service to manage Chart of Accounts and automated Auxiliary Sub-Accounts for SCF
 */
export class AccountsService {
  /**
   * Ensures that a sub-account exists for the given counterparty (supplier or client).
   * Matches by name if already registered, or auto-generates the next sequential code.
   * 
   * @param {object} params
   * @param {string} params.client_id - Client ID
   * @param {string} params.name - Supplier or Client business name
   * @param {string} params.entity_type - 'supplier' | 'client' | 'other'
   * @param {string} [params.parent_code] - '401' for suppliers, '411' for clients
   * @returns {Promise<object>} Sub-account record { id, client_id, code, name, parent_code, entity_type, action }
   */
  static async ensureSubAccount({ client_id, name, entity_type = 'supplier', parent_code }) {
    if (!name || !name.trim()) return null
    const cleanName = name.trim()

    // Exclude generic placeholder names (e.g., "جهة مجهولة / عامة", "Client Divers", "Fournisseur")
    const isGenericPlaceholder = /^(مجهول|عامة|جهة مجهولة|جهة عامة|tiers|fournisseur|client|fournisseur divers|client divers|fournisseur scanné|client scanné)$/i.test(cleanName)
      || /جهة مجهولة/i.test(cleanName)
      || /fournisseur scanné/i.test(cleanName)
    if (isGenericPlaceholder) {
      return null
    }

    const parent = parent_code || (entity_type === 'client' ? '411' : '401')

    // 1. Check if sub-account already exists
    const existing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, client_id, code, name, parent_code, entity_type FROM sub_accounts WHERE client_id = ? AND parent_code = ? AND LOWER(name) = LOWER(?)',
        [client_id, parent, cleanName],
        (err, row) => (err ? reject(err) : resolve(row))
      )
    })

    if (existing) {
      return { ...existing, action: 'matched_existing' }
    }

    // 2. Query all existing codes for this client and parent_code
    const rows = await new Promise((resolve, reject) => {
      db.all(
        'SELECT code FROM sub_accounts WHERE client_id = ? AND parent_code = ?',
        [client_id, parent],
        (err, result) => (err ? reject(err) : resolve(result || []))
      )
    })

    const existingCodes = new Set(rows.map((r) => r.code))
    let maxNum = 0

    for (const row of rows) {
      const suffix = row.code.startsWith(parent) ? row.code.slice(parent.length) : row.code
      const numMatch = suffix.match(/^\d+$/)
      if (numMatch) {
        const val = parseInt(numMatch[0], 10)
        if (val > maxNum) maxNum = val
      }
    }

    let nextIndex = maxNum + 1
    let newCode = `${parent}${String(nextIndex).padStart(2, '0')}`

    while (existingCodes.has(newCode)) {
      nextIndex++
      newCode = `${parent}${String(nextIndex).padStart(2, '0')}`
    }

    // 3. Insert new sub-account
    const subAccountId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO sub_accounts (client_id, code, name, parent_code, entity_type) VALUES (?, ?, ?, ?, ?)',
        [client_id, newCode, cleanName, parent, entity_type],
        function (err) {
          if (err) return reject(err)
          resolve(this.lastID)
        }
      )
    })

    // 4. Log creation
    await new Promise((resolve) => {
      db.run(
        'INSERT INTO account_creation_log (client_id, sub_account_code, entity_name) VALUES (?, ?, ?)',
        [client_id, newCode, cleanName],
        () => resolve()
      )
    })

    return {
      id: subAccountId,
      client_id,
      code: newCode,
      name: cleanName,
      parent_code: parent,
      entity_type,
      action: 'created_new',
    }
  }
}

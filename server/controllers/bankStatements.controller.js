import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'
import JSZip from 'jszip'
import { bankStatementsRepository } from '../repositories/bankStatementsRepository.js'
import { clientsRepository } from '../repositories/clientsRepository.js'
import { config } from '../config.js'

export const bankStatementsController = {
  async getBankStatements(req, res) {
    const { clientId } = req.params
    const yearQuery = req.query.year
    const statements = await bankStatementsRepository.findByClient(clientId, yearQuery)
    res.json(statements)
  },

  async createBankStatement(req, res) {
    const { clientId } = req.params
    const id = randomUUID()

    const statement = await bankStatementsRepository.create({
      id,
      client_id: clientId,
      ...req.body,
    })

    res.status(201).json(statement)
  },

  async updateBankStatement(req, res) {
    const { id } = req.params
    const updated = await bankStatementsRepository.update(id, req.body)

    if (!updated) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'الكشف البنكي غير موجود' })
    }

    const current = await bankStatementsRepository.findById(id)
    res.json({
      message: 'تم تعديل الكشف البنكي بنجاح',
      ...current,
    })
  },

  async deleteBankStatement(req, res) {
    const { id } = req.params
    const deleted = await bankStatementsRepository.delete(id)
    if (!deleted) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'الكشف البنكي غير موجود' })
    }
    res.json({ message: 'تم حذف الكشف البنكي بنجاح' })
  },

  async exportZip(req, res) {
    const { clientId } = req.params
    const yearQuery = req.query.year || '2026'

    const client = await clientsRepository.findById(clientId)
    if (!client) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'التاجر غير موجود' })
    }

    const statements = await bankStatementsRepository.findByClient(clientId, yearQuery)

    const zip = new JSZip()
    const folderName = `relevés_bancaires_${client.owner_name.replace(/\s+/g, '_')}_${yearQuery}`
    const folder = zip.folder(folderName)

    let csvContent = '\uFEFFStatement Number,Bank Name,Period,Start Date,End Date,Debit Total,Credit Total,Balance,Fiscal Year,Notes\n'

    statements.forEach((stmt) => {
      csvContent += `"${stmt.statement_number}","${stmt.bank_name}","${stmt.period}","${stmt.start_date || ''}","${stmt.end_date || ''}",${stmt.debit_total},${stmt.credit_total},${stmt.balance},${stmt.fiscal_year},"${(stmt.notes || '').replace(/"/g, '""')}"\n`

      if (stmt.file_path && stmt.file_path.startsWith('/storage/')) {
        const relativeLocal = stmt.file_path.replace('/storage/', '')
        const fullLocalPath = path.join(config.storageDir, relativeLocal)
        if (fs.existsSync(fullLocalPath)) {
          const fileData = fs.readFileSync(fullLocalPath)
          const fileName = path.basename(fullLocalPath)
          folder.file(`documents/${fileName}`, fileData)
        }
      }
    })

    folder.file('summary_bank_statements.csv', csvContent)

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const zipFilename = `relevés_bancaires_${client.owner_name.replace(/\s+/g, '_')}_${yearQuery}.zip`

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFilename)}"`)
    res.send(zipBuffer)
  },
}

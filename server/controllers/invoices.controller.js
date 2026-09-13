import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'
import JSZip from 'jszip'
import { invoicesRepository } from '../repositories/invoicesRepository.js'
import { clientsRepository } from '../repositories/clientsRepository.js'
import { config } from '../config.js'

export const invoicesController = {
  async getInvoices(req, res) {
    const { clientId } = req.params
    const yearQuery = req.query.year
    const invoices = await invoicesRepository.findByClient(clientId, yearQuery)
    res.json(invoices)
  },

  async createInvoice(req, res) {
    const { clientId } = req.params
    const id = randomUUID()

    const invoice = await invoicesRepository.create({
      id,
      client_id: clientId,
      ...req.body,
    })

    res.status(201).json(invoice)
  },

  async uploadInvoiceFile(req, res) {
    const { clientId } = req.params
    if (!req.file) {
      return res.status(400).json({ error: true, code: 'NO_FILE', message: 'لم يتم تزويد أي ملف للرفع' })
    }

    const relativePath = `/storage/clients/${clientId}/uploaded/${req.file.filename}`
    res.json({
      message: 'تم رفع الملف بنجاح',
      file_path: relativePath,
      filename: req.file.originalname,
    })
  },

  async updateInvoice(req, res) {
    const { id } = req.params
    const updated = await invoicesRepository.update(id, req.body)

    if (!updated) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' })
    }

    const current = await invoicesRepository.findById(id)
    res.json({
      message: 'تم تعديل الفاتورة بنجاح',
      ...current,
    })
  },

  async patchInvoice(req, res) {
    const { id } = req.params
    const updated = await invoicesRepository.update(id, req.body)

    if (!updated) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' })
    }

    const current = await invoicesRepository.findById(id)
    res.json({
      message: 'تم تحديث الفاتورة بنجاح',
      ...current,
    })
  },

  async deleteInvoice(req, res) {
    const { id } = req.params
    const deleted = await invoicesRepository.delete(id)
    if (!deleted) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' })
    }
    res.json({ message: 'تم حذف الفاتورة بنجاح' })
  },

  async exportZip(req, res) {
    const { clientId } = req.params
    const yearQuery = req.query.year || '2026'

    const client = await clientsRepository.findById(clientId)
    if (!client) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'التاجر غير موجود' })
    }

    const invoices = await invoicesRepository.findByClient(clientId, yearQuery)

    const zip = new JSZip()
    const folderName = `archive_${client.owner_name.replace(/\s+/g, '_')}_${yearQuery}`
    const folder = zip.folder(folderName)

    let csvContent = '\uFEFFInvoice Number,Type,Counterparty,Amount HT,TVA Rate,Amount TTC,Date,Fiscal Year,Notes\n'

    invoices.forEach((inv) => {
      const invTypeLabel = inv.type === 'sale' ? 'Vente (بيع)' : 'Achat (شراء)'
      csvContent += `"${inv.invoice_number}","${invTypeLabel}","${inv.counterparty}",${inv.amount_ht},${inv.tva_rate},${inv.amount_ttc},"${inv.date}",${inv.fiscal_year},"${(inv.notes || '').replace(/"/g, '""')}"\n`

      if (inv.file_path && inv.file_path.startsWith('/storage/')) {
        const relativeLocal = inv.file_path.replace('/storage/', '')
        const fullLocalPath = path.join(config.storageDir, relativeLocal)
        if (fs.existsSync(fullLocalPath)) {
          const fileData = fs.readFileSync(fullLocalPath)
          const fileName = path.basename(fullLocalPath)
          folder.file(`documents/${fileName}`, fileData)
        }
      }
    })

    folder.file('summary_invoices.csv', csvContent)

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const zipFilename = `archive_${client.owner_name.replace(/\s+/g, '_')}_${yearQuery}.zip`

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFilename)}"`)
    res.send(zipBuffer)
  },
}

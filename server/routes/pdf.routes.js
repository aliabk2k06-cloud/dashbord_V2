import express from 'express'
import { generateVectorPDFFromHTML } from '../lib/pdf-engine.js'
import { buildInvoiceHTML } from '../templates/invoice-pdf-template.js'
import { buildBankStatementHTML } from '../templates/statement-pdf-template.js'
import { PdfService } from '../services/pdf.js'

const router = express.Router()

/**
 * POST /api/pdf/invoice
 * Generates a vector PDF for an invoice.
 */
router.post('/invoice', async (req, res, next) => {
  try {
    const { client, invoice } = req.body
    if (!client || !invoice) {
      return res.status(400).json({ error: 'Client and Invoice data are required.' })
    }

    const html = buildInvoiceHTML(client, invoice)
    const pdfBuffer = await generateVectorPDFFromHTML(html)

    const safeNum = (invoice.invoice_number || 'Facture').replace(/[\\/:*?"<>|\r\n]/g, '-').replace(/\s+/g, '_')
    const fileName = `Facture_${safeNum}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    return res.send(pdfBuffer)
  } catch (err) {
    console.error('API /api/pdf/invoice error:', err)
    return next(err)
  }
})

/**
 * POST /api/pdf/bank-statement
 * Generates a vector PDF for a bank statement.
 */
router.post('/bank-statement', async (req, res, next) => {
  try {
    const { client, statement } = req.body
    if (!client || !statement) {
      return res.status(400).json({ error: 'Client and Statement data are required.' })
    }

    const html = buildBankStatementHTML(client, statement)
    const pdfBuffer = await generateVectorPDFFromHTML(html)

    const safeNum = (statement.statement_number || 'Releve').replace(/[\\/:*?"<>|\r\n]/g, '-').replace(/\s+/g, '_')
    const fileName = `Releve_Bancaire_${safeNum}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    return res.send(pdfBuffer)
  } catch (err) {
    console.error('API /api/pdf/bank-statement error:', err)
    return next(err)
  }
})

/**
 * POST /api/pdf/render-html
 * Direct HTML to Vector PDF rendering service.
 */
router.post('/render-html', async (req, res, next) => {
  try {
    const { html, filename } = req.body
    if (!html) {
      return res.status(400).json({ error: 'HTML string is required.' })
    }

    const pdfBuffer = await generateVectorPDFFromHTML(html)
    const outName = filename ? filename : 'Document.pdf'

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${outName}"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    return res.send(pdfBuffer)
  } catch (err) {
    console.error('API /api/pdf/render-html error:', err)
    return next(err)
  }
})

/**
 * POST /api/pdf/pdf-to-html
 * Converts a digital vector PDF file from disk into structured HTML.
 */
router.post('/pdf-to-html', async (req, res, next) => {
  try {
    const { file_path } = req.body
    if (!file_path) {
      return res.status(400).json({ error: 'file_path is required' })
    }

    const result = await PdfService.convertPdfToHtml(file_path)
    return res.json(result)
  } catch (err) {
    console.error('API /api/pdf/pdf-to-html error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

export default router

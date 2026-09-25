import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { PDFParse } = require('pdf-parse')

/**
 * Service for parsing PDF files and converting digital vector PDFs to structured HTML
 */
export class PdfService {
  /**
   * Reads a PDF from local file path and converts it into structured HTML format.
   * Also detects whether the PDF is digital (text layer present) or scanned (image only).
   * 
   * @param {string} filePath Absolute or relative path to PDF file
   * @returns {Promise<{success: boolean, is_digital: boolean, is_scanned: boolean, num_pages: number, html: string, text: string}>}
   */
  static async convertPdfToHtml(filePath) {
    if (!filePath) {
      throw new Error('File path is required')
    }

    const resolvedPath = path.resolve(filePath)
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found at path: ${resolvedPath}`)
    }

    const dataBuffer = fs.readFileSync(resolvedPath)
    
    // Instantiate PDFParse
    const parser = new PDFParse({ data: dataBuffer })
    await parser.load()

    const textResult = await parser.getText()
    const rawText = textResult.text || ''
    const numPages = textResult.total || 1

    const cleanedText = rawText.replace(/\r\n/g, '\n').trim()
    const isDigital = cleanedText.length > 30
    const isScanned = !isDigital

    if (isScanned) {
      return {
        success: true,
        is_digital: false,
        is_scanned: true,
        num_pages: numPages,
        html: '<div class="pdf-scanned"><p>[SCANNED_PDF_NO_TEXT_LAYER]</p></div>',
        text: '',
      }
    }

    // Convert raw text lines into structured HTML
    const lines = cleanedText.split('\n').map(l => l.trim()).filter(Boolean)
    const htmlBlocks = []

    let inTable = false
    let currentTableRows = []

    const flushTable = () => {
      if (currentTableRows.length > 0) {
        let tableHtml = '<table class="invoice-table" border="1" style="border-collapse: collapse; width: 100%; font-family: monospace;">\n'
        currentTableRows.forEach((rowCells, idx) => {
          const tag = idx === 0 ? 'th' : 'td'
          tableHtml += '  <tr>' + rowCells.map(cell => `<${tag} style="padding: 6px; text-align: left;">${escapeHtml(cell)}</${tag}>`).join('') + '</tr>\n'
        })
        tableHtml += '</table>'
        htmlBlocks.push(tableHtml)
        currentTableRows = []
      }
      inTable = false
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      const isTabular = line.includes('\t') || /\s{2,}/.test(line) || /(\d+[\.,]?\d*)\s*(DZD|DA|TVA|%|HT|TTC)/i.test(line)

      if (isTabular) {
        const cells = line.split(/\t|\s{2,}/).map(c => c.trim()).filter(Boolean)
        if (cells.length > 1) {
          inTable = true
          currentTableRows.push(cells)
          continue
        }
      }

      if (inTable) {
        flushTable()
      }

      if (/^(facture|invoice|relevé|devis|client|fournisseur|bon de commande|total)/i.test(line)) {
        htmlBlocks.push(`<h2>${escapeHtml(line)}</h2>`)
      } else {
        htmlBlocks.push(`<p>${escapeHtml(line)}</p>`)
      }
    }

    if (inTable) {
      flushTable()
    }

    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Parsed PDF Invoice HTML</title>
  <style>
    body { font-family: sans-serif; line-height: 1.5; margin: 20px; }
    table { border-collapse: collapse; margin: 15px 0; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
    h2 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  </style>
</head>
<body>
  <div class="pdf-document">
    ${htmlBlocks.join('\n    ')}
  </div>
</body>
</html>
`.trim()

    return {
      success: true,
      is_digital: true,
      is_scanned: false,
      num_pages: numPages,
      html: fullHtml,
      text: cleanedText,
    }
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

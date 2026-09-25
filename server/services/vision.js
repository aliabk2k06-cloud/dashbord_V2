import fs from 'fs'
import path from 'path'
import { GoogleGenAI } from '@google/genai'
import { config } from '../config.js'

/**
 * Vision Service using Google Gemini Vision API for Multimodal Invoice OCR
 */
export class VisionService {
  /**
   * Instantiates Google GenAI client securely using GEMINI_API_KEY
   */
  static getAiClient() {
    const apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey || ''
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing in environment or .env file')
    }
    return new GoogleGenAI({ apiKey })
  }

  /**
   * Extracts invoice domain fields from an image or scanned document via Gemini 2.0 Flash Vision
   * @param {string} filePath Absolute or relative path to image/PDF file
   * @returns {Promise<object>} Standardized SCF invoice JSON payload
   */
  static async extractInvoiceFromImage(filePath) {
    if (!filePath) {
      throw new Error('File path is required for Vision OCR')
    }

    const resolvedPath = path.resolve(filePath)
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Image file not found at path: ${resolvedPath}`)
    }

    const imageBytes = fs.readFileSync(resolvedPath)
    const base64Data = imageBytes.toString('base64')
    
    const ext = path.extname(resolvedPath).toLowerCase()
    let mimeType = 'image/png'
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg'
    else if (ext === '.webp') mimeType = 'image/webp'
    else if (ext === '.pdf') mimeType = 'application/pdf'

    const ai = this.getAiClient()

    const systemPrompt = `
You are an expert Algerian accountant AI specialized in the Algerian System Comptable Financier (SCF).
Analyze this invoice image/document visually and extract the exact accounting details.

Return ONLY a raw valid JSON object matching this schema:
{
  "invoice_number": "string",
  "date": "YYYY-MM-DD",
  "type": "PURCHASE" or "SALE",
  "fiscal_year": "YYYY",
  "supplier": {
    "name": "string",
    "type": "Fournisseur",
    "nif": "string",
    "rc": "string"
  },
  "client": {
    "company_name": "string",
    "gerant": "string",
    "nif": "string",
    "rc": "string",
    "address": "string"
  },
  "line_items": [
    {
      "item_number": 1,
      "designation": "string",
      "quantity": 1,
      "unit_price": 0,
      "amount_ht": 0,
      "tva_rate": 19,
      "amount_ttc": 0
    }
  ],
  "totals": {
    "amount_ht": 0,
    "tva_amount": 0,
    "tva_rate": 19,
    "amount_ttc": 0,
    "currency": "DZD"
  },
  "observations": "string"
}

Important Instructions:
1. Ensure all numeric amounts are floats or integers without spaces (e.g. 340840.34).
2. Format dates as YYYY-MM-DD.
3. Normalize all Arabic text into clean, standard, right-to-left Arabic script.
4. Output raw JSON only. Do not wrap in markdown code blocks.
`

    const modelsToTry = [
      process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-2.5-flash',
    ]

    let response = null
    let lastError = null

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            },
            { text: systemPrompt }
          ]
        })
        if (response && response.text) break
      } catch (err) {
        lastError = err
        console.warn(`Notice: Model ${modelName} failed with ${err.message}, trying next fallback...`)
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('All Gemini Vision models failed to respond')
    }

    const textOutput = response.text || ''
    const cleanJsonText = textOutput
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()

    let parsed = null
    try {
      parsed = JSON.parse(cleanJsonText)
    } catch {
      // Try to find first { and last }
      const firstBrace = cleanJsonText.indexOf('{')
      const lastBrace = cleanJsonText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsed = JSON.parse(cleanJsonText.substring(firstBrace, lastBrace + 1))
        } catch {
          return { raw_output: cleanJsonText, error: 'JSON_PARSING_FAILED' }
        }
      } else {
        return { raw_output: cleanJsonText, error: 'JSON_PARSING_FAILED' }
      }
    }

    // Helper to sanitize numeric values (French format "436 870,69" -> 436870.69)
    const cleanNum = (val) => {
      if (typeof val === 'number') return isNaN(val) ? 0 : val
      if (!val) return 0
      const s = String(val).replace(/[^\d.,-]/g, '').replace(/,/g, '.')
      const n = parseFloat(s)
      return isNaN(n) ? 0 : n
    }

    // Helper to normalize dates (e.g. DD/MM/YYYY -> YYYY-MM-DD)
    const normalizeDate = (d) => {
      if (!d || typeof d !== 'string') return new Date().toISOString().split('T')[0]
      const trimmed = d.trim()
      const dmy = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/)
      if (dmy) {
        const [, day, month, year] = dmy
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      return trimmed
    }

    // Normalize extracted domain data
    const totals = parsed.totals || {}
    let amountHt = cleanNum(totals.amount_ht)
    let tvaAmount = cleanNum(totals.tva_amount)
    let tvaRate = cleanNum(totals.tva_rate) || 19
    let amountTtc = cleanNum(totals.amount_ttc)

    // Cross-calculate if one amount is missing
    if (amountTtc === 0 && amountHt > 0) {
      if (tvaAmount === 0 && tvaRate > 0) {
        tvaAmount = Number((amountHt * (tvaRate / 100)).toFixed(2))
      }
      amountTtc = Number((amountHt + tvaAmount).toFixed(2))
    } else if (amountHt === 0 && amountTtc > 0) {
      amountHt = Number((amountTtc / (1 + tvaRate / 100)).toFixed(2))
      tvaAmount = Number((amountTtc - amountHt).toFixed(2))
    }

    parsed.totals = {
      amount_ht: amountHt,
      tva_amount: tvaAmount,
      tva_rate: tvaRate,
      amount_ttc: amountTtc,
      currency: totals.currency || 'DZD'
    }

    parsed.date = normalizeDate(parsed.date)
    parsed.type = String(parsed.type || 'PURCHASE').toUpperCase()

    return parsed
  }
}

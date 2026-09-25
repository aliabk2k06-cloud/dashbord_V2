import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { config } from '../config.js'

/**
 * n8n Service Helper for interacting with n8n REST API and Webhooks
 */
export class N8nService {
  /**
   * Resolves absolute file path from relative or /storage/ URL
   */
  static resolveAbsolutePath(filePath) {
    if (!filePath) return ''
    if (path.isAbsolute(filePath) && fs.existsSync(filePath)) {
      return filePath
    }
    if (filePath.startsWith('/storage/')) {
      const rel = filePath.replace(/^\/storage\//, '')
      const abs = path.join(config.storageDir, rel)
      if (fs.existsSync(abs)) return abs
    }
    const relStorage = path.join(config.storageDir, filePath)
    if (fs.existsSync(relStorage)) return relStorage

    const relRoot = path.resolve(filePath)
    if (fs.existsSync(relRoot)) return relRoot

    return filePath
  }

  /**
   * Helper to sanitize payload and retain strictly domain invoice fields, plus pre-parsed HTML or Vision OCR
   */
  static async sanitizeInvoicePayload(payload = {}) {
    const rawFilePath = payload.file_path || ''
    const resolvedFilePath = this.resolveAbsolutePath(rawFilePath)

    let htmlContent = payload.html_content || ''
    const isImage = Boolean(resolvedFilePath && /\.(png|jpg|jpeg|webp)$/i.test(resolvedFilePath))
    
    // An image file is NEVER digital HTML text. Default isDigital to false for image files.
    let isDigital = payload.is_digital !== undefined ? Boolean(payload.is_digital) : !isImage
    if (isImage) {
      isDigital = false
    }

    let visionExtractedData = payload.vision_extracted_data || null

    // Pre-parse PDF to HTML if file_path is provided and html_content is not pre-populated
    if (resolvedFilePath && !htmlContent && resolvedFilePath.toLowerCase().endsWith('.pdf')) {
      try {
        const { PdfService } = await import('./pdf.js')
        const pdfResult = await PdfService.convertPdfToHtml(resolvedFilePath)
        htmlContent = pdfResult.html || ''
        isDigital = Boolean(pdfResult.is_digital)
      } catch (err) {
        console.warn('Notice: PDF pre-parsing warning in n8n push:', err.message)
      }
    }

    // Call Gemini Vision OCR for images or scanned files if GEMINI_API_KEY is available
    if ((isImage || !isDigital) && (process.env.GEMINI_API_KEY || config.geminiApiKey) && !visionExtractedData) {
      try {
        const { VisionService } = await import('./vision.js')
        visionExtractedData = await VisionService.extractInvoiceFromImage(resolvedFilePath || rawFilePath)
        isDigital = false
      } catch (err) {
        console.warn('Notice: Gemini Vision OCR warning in n8n push:', err.message)
        // Keep isDigital = false for images/scanned documents even if Vision OCR throws an exception
        isDigital = false
      }
    }

    const isPlaceholderNumber = (num) => !num || /whatsapp|image|scan|doc|facture|untitled/i.test(num)
    const isPlaceholderCounterparty = (cp) => !cp || /مجهول|عامة|tiers|unknown/i.test(cp)

    const finalInvoiceNumber = (visionExtractedData?.invoice_number && !isPlaceholderNumber(visionExtractedData.invoice_number))
      ? visionExtractedData.invoice_number
      : (!isPlaceholderNumber(payload.invoice_number) ? payload.invoice_number : (visionExtractedData?.invoice_number || payload.invoice_number || ''))

    const finalCounterparty = (visionExtractedData?.supplier?.name && !isPlaceholderCounterparty(visionExtractedData.supplier.name))
      ? visionExtractedData.supplier.name
      : (!isPlaceholderCounterparty(payload.counterparty) ? payload.counterparty : (visionExtractedData?.supplier?.name || payload.counterparty || ''))

    const finalAmountHt = Number(visionExtractedData?.totals?.amount_ht !== undefined && visionExtractedData?.totals?.amount_ht > 0
      ? visionExtractedData.totals.amount_ht
      : (payload.amount_ht || 0))

    const finalAmountTtc = Number(visionExtractedData?.totals?.amount_ttc !== undefined && visionExtractedData?.totals?.amount_ttc > 0
      ? visionExtractedData.totals.amount_ttc
      : (payload.amount_ttc || 0))

    const finalTvaRate = Number(visionExtractedData?.totals?.tva_rate || payload.tva_rate || 19)
    const finalDate = visionExtractedData?.date || payload.date || ''
    const finalType = visionExtractedData?.type || payload.type || 'PURCHASE'

    return {
      invoice_id: payload.invoice_id || payload.id || '',
      client_id: payload.client_id || '',
      invoice_number: finalInvoiceNumber,
      type: finalType,
      date: finalDate,
      counterparty: finalCounterparty,
      amount_ht: finalAmountHt,
      tva_rate: finalTvaRate,
      amount_ttc: finalAmountTtc,
      file_path: resolvedFilePath || rawFilePath,
      is_digital: isDigital,
      html_content: htmlContent,
      vision_extracted_data: visionExtractedData,
      notes: payload.notes || '',
    }
  }

  /**
   * Helper to generate dynamic per-request HMAC signature and headers based on clean payload
   */
  static generateDynamicHeaders(cleanPayload = {}) {
    const timestamp = Date.now().toString()
    const nonce = crypto.randomUUID()
    const secretKey = config.n8n.apiKey || 'compta_secret_webhook_key_2026'

    // Form data to sign: invoice_id.timestamp.nonce
    const dataToSign = `${cleanPayload.invoice_id || ''}.${timestamp}.${nonce}`
    const signature = crypto.createHmac('sha256', secretKey).update(dataToSign).digest('hex')

    return {
      'Content-Type': 'application/json',
      'x-webhook-timestamp': timestamp,
      'x-webhook-nonce': nonce,
      'x-webhook-signature': signature,
    }
  }

  /**
   * Helper to make authenticated requests to n8n Public API
   */
  static async request(endpoint, options = {}) {
    const baseUrl = config.n8n.apiUrl.replace(/\/$/, '')
    const url = `${baseUrl}/api/v1${endpoint}`
    
    const headers = {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': config.n8n.apiKey,
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`n8n API error (${response.status}): ${errorText}`)
    }

    return response.json()
  }

  /**
   * List all workflows in n8n
   */
  static async getWorkflows() {
    const result = await this.request('/workflows')
    return result.data || []
  }

  /**
   * Get details of a specific workflow
   */
  static async getWorkflow(id) {
    return this.request(`/workflows/${id}`)
  }

  /**
   * Activate or deactivate a workflow
   */
  static async setWorkflowActive(id, active = true) {
    const action = active ? 'activate' : 'deactivate'
    return this.request(`/workflows/${id}/${action}`, { method: 'POST' })
  }

  /**
   * Trigger a webhook endpoint in n8n with clean invoice payload and dynamic HMAC signature headers
   * @param {string} path Webhook path or full URL (Target URL read from config/.env)
   * @param {object} payload Invoice data to send
   */
  static async triggerWebhook(path, payload = {}) {
    const targetUrl = path.startsWith('http')
      ? path
      : `${config.n8n.apiUrl.replace(/\/$/, '')}/webhook/${path.replace(/^\//, '')}`

    // 1. Clean payload containing ONLY invoice domain fields + HTML
    const cleanBody = await this.sanitizeInvoicePayload(payload)

    // 2. Generate dynamic security headers calculated on clean body
    const dynamicHeaders = this.generateDynamicHeaders(cleanBody)

    // 3. POST request with clean body and dynamic headers
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: dynamicHeaders,
      body: JSON.stringify(cleanBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`n8n Webhook error (${response.status}): ${errorText}`)
    }

    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch {
      return { text }
    }
  }
}

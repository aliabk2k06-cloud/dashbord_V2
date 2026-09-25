import puppeteer from 'puppeteer'

let browserInstance = null

/**
 * Gets or initializes a shared singleton Puppeteer browser instance.
 */
export async function getPuppeteerBrowser() {
  if (browserInstance && browserInstance.connected) {
    return browserInstance
  }

  console.log('🚀 Initializing Puppeteer PDF Browser Engine...')
  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none'
    ]
  })

  // Handle unexpected disconnects
  browserInstance.on('disconnected', () => {
    console.warn('⚠️ Puppeteer browser instance disconnected. Will recreate on next request.')
    browserInstance = null
  })

  return browserInstance
}

/**
 * Renders an HTML string to a vector PDF buffer using Headless Chromium.
 * 
 * @param {string} htmlString - Full HTML document with CSS & fonts
 * @param {object} options - PDF generation options (format, margins, etc.)
 * @returns {Promise<Buffer>} Vector PDF binary buffer
 */
export async function generateVectorPDFFromHTML(htmlString, options = {}) {
  const browser = await getPuppeteerBrowser()
  const page = await browser.newPage()

  try {
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 })

    // Set page HTML content with resilient loading (avoiding external network hangs)
    await page.setContent(htmlString, {
      waitUntil: 'domcontentloaded',
      timeout: 8000
    })

    try {
      await Promise.race([
        page.evaluateHandle('document.fonts.ready'),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ])
    } catch (_) {}

    // Generate vector PDF
    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      printBackground: true,
      margin: options.margin || { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      displayHeaderFooter: false,
      preferCSSPageSize: true
    })

    return Buffer.from(pdfBuffer)
  } catch (error) {
    console.error('❌ Error generating PDF with Puppeteer:', error)
    throw error
  } finally {
    await page.close().catch(() => {})
  }
}

/**
 * Gracefully shuts down the shared Puppeteer browser instance.
 */
export async function closePuppeteerBrowser() {
  if (browserInstance) {
    await browserInstance.close().catch(() => {})
    browserInstance = null
    console.log('🛑 Puppeteer PDF Browser Engine closed.')
  }
}

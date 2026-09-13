export interface ParsedFilenameResult {
  invoice_number: string
  type: 'purchase' | 'sale'
  amount_ttc: number
  date: string
  counterparty: string
}

/**
 * Extracts invoice metadata (type, invoice number, amount, date, counterparty) from a filename.
 */
export function parseInvoiceFilename(
  filename: string,
  defaults: {
    defaultType?: 'purchase' | 'sale'
    defaultAmount?: number
    defaultCounterparty?: string
  } = {}
): ParsedFilenameResult {
  const defaultType = defaults.defaultType || 'purchase'
  const defaultAmount = defaults.defaultAmount || 0
  const defaultCounterparty = defaults.defaultCounterparty || 'جهة غير محددة'

  if (!filename || typeof filename !== 'string') {
    return {
      invoice_number: 'FAC-UNKNOWN',
      type: defaultType,
      amount_ttc: defaultAmount,
      date: new Date().toISOString().split('T')[0]!,
      counterparty: defaultCounterparty,
    }
  }

  // Remove extension and clean characters
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename
  const cleanName = nameWithoutExt.replace(/[/\\?%*:|"<>]/g, '_').trim()

  // 1. Detect Type (Achat vs Vente / Purchase vs Sale)
  let detectedType: 'purchase' | 'sale' = defaultType
  const lowerName = cleanName.toLowerCase()

  if (lowerName.includes('achat') || lowerName.includes('شراء') || lowerName.includes('purchase')) {
    detectedType = 'purchase'
  } else if (lowerName.includes('vente') || lowerName.includes('vte') || lowerName.includes('بيع') || lowerName.includes('sale')) {
    detectedType = 'sale'
  }

  // 2. Detect Date (YYYY-MM-DD or DD-MM-YYYY)
  let detectedDate = new Date().toISOString().split('T')[0]!
  let remainingTextForAmount = cleanName

  const isoDateMatch = cleanName.match(/(?:^|[^0-9])(20\d{2})[-_/](0[1-9]|1[0-2])[-_/](0[1-9]|[12]\d|3[01])(?:[^0-9]|$)/)
  if (isoDateMatch) {
    detectedDate = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`
    remainingTextForAmount = cleanName.replace(isoDateMatch[0], ' ')
  } else {
    const altDateMatch = cleanName.match(/(?:^|[^0-9])(0[1-9]|[12]\d|3[01])[-_/](0[1-9]|1[0-2])[-_/](20\d{2})(?:[^0-9]|$)/)
    if (altDateMatch) {
      detectedDate = `${altDateMatch[3]}-${altDateMatch[2]}-${altDateMatch[1]}`
      remainingTextForAmount = cleanName.replace(altDateMatch[0], ' ')
    }
  }

  // 3. Detect Amount TTC from remaining text
  let detectedAmount = defaultAmount
  const amountMatch = remainingTextForAmount.match(/(?:^|[^0-9.])(\d{2,8}(?:\.\d{1,2})?)(?:[^0-9.]|$)/g)
  if (amountMatch) {
    for (const rawStr of amountMatch) {
      const numOnly = rawStr.replace(/[^0-9.]/g, '')
      const val = parseFloat(numOnly)
      if (!isNaN(val) && val >= 10 && val !== 2024 && val !== 2025 && val !== 2026 && val !== 2027) {
        detectedAmount = val
        break
      }
    }
  }

  return {
    invoice_number: cleanName || 'FAC-BULK',
    type: detectedType,
    amount_ttc: detectedAmount,
    date: detectedDate,
    counterparty: defaultCounterparty,
  }
}

import { describe, it, expect } from 'vitest'
import { parseInvoiceFilename } from '../src/lib/filename-parser'

describe('parseInvoiceFilename', () => {
  it('should parse purchase invoice with amount and date correctly', () => {
    const result = parseInvoiceFilename('FAC_2026-03-15_Achat_15000.pdf')

    expect(result.type).toBe('purchase')
    expect(result.date).toBe('2026-03-15')
    expect(result.amount_ttc).toBe(15000)
    expect(result.invoice_number).toBe('FAC_2026-03-15_Achat_15000')
  })

  it('should parse sale invoice correctly', () => {
    const result = parseInvoiceFilename('FACT_Vente_2026-01-20_8500.50.png')

    expect(result.type).toBe('sale')
    expect(result.date).toBe('2026-01-20')
    expect(result.amount_ttc).toBe(8500.5)
  })

  it('should fallback safely on ambiguous filenames without crashing', () => {
    const result = parseInvoiceFilename('document_scanned_001.pdf', {
      defaultType: 'purchase',
      defaultAmount: 500,
      defaultCounterparty: 'شركة الجزائر',
    })

    expect(result.type).toBe('purchase')
    expect(result.amount_ttc).toBe(500)
    expect(result.counterparty).toBe('شركة الجزائر')
    expect(result.invoice_number).toBe('document_scanned_001')
  })

  it('should handle empty or malformed input gracefully', () => {
    const result = parseInvoiceFilename('')

    expect(result.invoice_number).toBe('FAC-UNKNOWN')
    expect(result.type).toBe('purchase')
    expect(result.amount_ttc).toBe(0)
  })
})

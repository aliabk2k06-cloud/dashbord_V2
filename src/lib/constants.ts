export const INVOICE_TYPES = {
  PURCHASE: 'purchase',
  SALE: 'sale',
} as const

export type InvoiceType = (typeof INVOICE_TYPES)[keyof typeof INVOICE_TYPES]

export const INVOICE_TYPE_LABELS: Record<InvoiceType, { label: string; badgeClass: string }> = {
  purchase: {
    label: 'فاتورة شراء',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  sale: {
    label: 'فاتورة بيع',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
}

export const CLIENT_DOCUMENTS_STATUS = {
  UP_TO_DATE: 'up_to_date',
  PENDING: 'pending',
  MISSING: 'missing',
} as const

export const DEFAULT_FISCAL_YEAR = 2026
export const API_BASE_URL = '/api'

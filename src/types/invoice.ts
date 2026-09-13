export type Invoice = {
  id: string
  client_id: string
  invoice_number: string
  type: 'purchase' | 'sale'
  amount_ht: number
  tva_rate: number
  amount_ttc: number
  date: string
  counterparty: string
  file_path: string | null
  is_generated: number
  notes: string
  fiscal_year: number
  created_at: string
}

export type InvoiceInsert = Omit<Invoice, 'id' | 'client_id' | 'created_at'>

export type ClientFiscalYear = {
  id: string
  client_id: string
  year: number
  status: 'open' | 'closed'
}

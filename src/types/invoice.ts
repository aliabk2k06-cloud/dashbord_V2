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
  ai_status?: string
  suggested_account_code?: string
  matched_account_code?: string
  confidence?: number
  extracted_data?: string
  tva_amount?: number
}

export type InvoiceInsert = Omit<Invoice, 'id' | 'client_id' | 'created_at'>

export type ClientFiscalYear = {
  id: string
  client_id: string
  year: number
  status: 'open' | 'closed'
}

export interface BankStatement {
  id: string
  client_id: string
  statement_number: string
  bank_name: string
  period: string
  start_date?: string
  end_date?: string
  debit_total: number
  credit_total: number
  balance: number
  file_path?: string | null
  notes?: string
  fiscal_year: number
  created_at: string
}

export type BankStatementInsert = Omit<BankStatement, 'id' | 'client_id' | 'created_at'> & {
  id?: string
  client_id?: string
  created_at?: string
}

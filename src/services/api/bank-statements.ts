import { BankStatement, BankStatementInsert } from '../../types/bank-statement'

export async function fetchBankStatements(clientId: string, year?: string): Promise<BankStatement[]> {
  const url = year ? `/api/clients/${clientId}/bank-statements?year=${year}` : `/api/clients/${clientId}/bank-statements`
  const res = await fetch(url)
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.message || 'فشل جلب الكشوفات البنكية للتاجر')
  }
  return res.json()
}

export async function createBankStatement(clientId: string, data: BankStatementInsert): Promise<BankStatement> {
  const res = await fetch(`/api/clients/${clientId}/bank-statements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const resData = await res.json()
  if (!res.ok) {
    throw new Error(resData.message || resData.error || 'فشل إدراج الكشف البنكي')
  }
  return resData
}

export async function updateBankStatement(id: string, data: BankStatementInsert): Promise<BankStatement> {
  const res = await fetch(`/api/bank-statements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const resData = await res.json()
  if (!res.ok) {
    throw new Error(resData.message || resData.error || 'فشل تعديل الكشف البنكي')
  }
  return resData
}

export async function deleteBankStatement(id: string): Promise<void> {
  const res = await fetch(`/api/bank-statements/${id}`, { method: 'DELETE' })
  const resData = await res.json()
  if (!res.ok) {
    throw new Error(resData.message || resData.error || 'فشل حذف الكشف البنكي')
  }
}

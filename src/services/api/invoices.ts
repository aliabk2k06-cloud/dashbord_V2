import { Invoice } from '../../types/invoice'

export async function fetchInvoices(clientId: string, year?: string): Promise<Invoice[]> {
  const url = year ? `/api/clients/${clientId}/invoices?year=${year}` : `/api/clients/${clientId}/invoices`
  const res = await fetch(url)
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.message || 'فشل جلب فواتير التاجر')
  }
  return res.json()
}

export async function createInvoice(clientId: string, invoiceData: Omit<Invoice, 'id' | 'client_id' | 'created_at'>): Promise<Invoice> {
  const res = await fetch(`/api/clients/${clientId}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoiceData),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || data.error || 'فشل إدراج الفاتورة')
  }
  return data
}

export async function uploadInvoiceDocument(clientId: string, file: File): Promise<{ file_path: string; filename: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`/api/clients/${clientId}/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || data.error || 'فشل رفع المستند')
  }
  return data
}

export async function updateInvoice(id: string, invoiceData: Partial<Invoice>): Promise<Invoice> {
  const res = await fetch(`/api/invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoiceData),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || data.error || 'فشل تعديل الفاتورة')
  }
  return data
}

export async function deleteInvoice(id: string): Promise<void> {
  const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || data.error || 'فشل حذف الفاتورة')
  }
}

import { Client, ClientInsert } from '../../types/client'

export async function fetchClients(): Promise<Client[]> {
  const res = await fetch('/api/clients')
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.message || 'فشل جلب قائمة العملاء')
  }
  return res.json()
}

export async function fetchStats(): Promise<{ total: number; upToDate: number; pending: number }> {
  const res = await fetch('/api/clients/stats')
  if (!res.ok) {
    throw new Error('فشل جلب إحصائيات العملاء')
  }
  return res.json()
}

export async function createClient(clientData: ClientInsert): Promise<Client> {
  const res = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientData),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || data.error || 'فشل إضافة التاجر')
  }
  return data
}

export async function updateClient(id: string, clientData: Partial<Client>): Promise<void> {
  const res = await fetch(`/api/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientData),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || data.error || 'فشل تحديث بيانات التاجر')
  }
}

export async function deleteClient(id: string): Promise<void> {
  const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || data.error || 'فشل حذف التاجر')
  }
}

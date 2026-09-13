import { useState, useEffect, useCallback } from 'react'
import type { Client, ClientInsert, ClientUpdate } from '../types/client'
import * as clientsApi from '../services/api/clients'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await clientsApi.fetchClients()
      setClients(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر الاتصال بقواعد البيانات المحلية'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchClients()
  }, [fetchClients])

  const addClient = async (client: ClientInsert): Promise<{ success: boolean; error?: string }> => {
    try {
      await clientsApi.createClient(client)
      await fetchClients()
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر الاتصال بالسيرفر المحلي'
      return { success: false, error: message }
    }
  }

  const updateClient = async (id: string, clientData: ClientUpdate): Promise<{ success: boolean; error?: string }> => {
    try {
      await clientsApi.updateClient(id, clientData)
      await fetchClients()
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر الاتصال بالسيرفر المحلي'
      return { success: false, error: message }
    }
  }

  const deleteClient = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await clientsApi.deleteClient(id)
      await fetchClients()
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر الاتصال بالسيرفر المحلي'
      return { success: false, error: message }
    }
  }

  const stats = {
    total: clients.length,
    upToDate: clients.filter((c) => c.documents_status === 'up_to_date').length,
    pending: clients.filter((c) => c.documents_status === 'pending').length,
  }

  return { clients, loading, error, stats, addClient, updateClient, deleteClient, refetch: fetchClients }
}

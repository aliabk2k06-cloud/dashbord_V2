import { useState, useEffect, useCallback } from 'react'
import type { Invoice, InvoiceInsert, ClientFiscalYear } from '../types/invoice'
import * as invoicesApi from '../services/api/invoices'

export function useInvoices(clientId: string | null) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [fiscalYears, setFiscalYears] = useState<ClientFiscalYear[]>([])
  const [selectedYear, setSelectedYear] = useState<string>('2026')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch fiscal years for current client
  const fetchFiscalYears = useCallback(async () => {
    if (!clientId) {
      setFiscalYears([])
      return
    }
    try {
      const res = await fetch(`/api/clients/${clientId}/years`)
      if (res.ok) {
        const years: ClientFiscalYear[] = await res.json()
        setFiscalYears(years)
      }
    } catch (err) {
      console.error('Error fetching fiscal years:', err)
    }
  }, [clientId])

  // Fetch invoices for current client filtered by selectedYear
  const fetchInvoices = useCallback(async () => {
    if (!clientId) {
      setInvoices([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await invoicesApi.fetchInvoices(clientId, selectedYear)
      setInvoices(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء جلب الفواتير'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [clientId, selectedYear])

  useEffect(() => {
    void fetchFiscalYears()
  }, [fetchFiscalYears])

  useEffect(() => {
    void fetchInvoices()
  }, [fetchInvoices])

  const currentYearObj = fiscalYears.find((y) => String(y.year) === selectedYear)
  const isYearLocked = currentYearObj?.status === 'closed'

  // Toggle year status open <-> closed
  const toggleYearStatus = async (targetYear: number): Promise<{ success: boolean; error?: string }> => {
    if (!clientId) return { success: false }
    const targetObj = fiscalYears.find((y) => y.year === targetYear)
    const newStatus = targetObj?.status === 'closed' ? 'open' : 'closed'

    try {
      const res = await fetch(`/api/clients/${clientId}/years/${targetYear}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        return { success: false, error: data.error }
      }
      await fetchFiscalYears()
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تغيير حالة السنة'
      return { success: false, error: msg }
    }
  }

  // Add new year or rollover
  const addFiscalYear = async (newYear: number, closePrevious: boolean = false): Promise<{ success: boolean; error?: string }> => {
    if (!clientId) return { success: false }
    try {
      const res = await fetch(`/api/clients/${clientId}/years`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: newYear, close_previous: closePrevious }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error || 'فشل إضافة السنة المالية' }
      }
      await fetchFiscalYears()
      setSelectedYear(String(newYear))
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء تدوير السنة'
      return { success: false, error: msg }
    }
  }

  const addInvoice = async (invoice: InvoiceInsert): Promise<{ success: boolean; error?: string }> => {
    if (!clientId) return { success: false, error: 'لم يتم تحديد التاجر' }
    try {
      const invoiceData = {
        ...invoice,
        fiscal_year: selectedYear === 'all' ? new Date(invoice.date).getFullYear() || 2026 : parseInt(selectedYear, 10),
      }

      await invoicesApi.createInvoice(clientId, invoiceData)
      await fetchInvoices()
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ في الاتصال'
      return { success: false, error: msg }
    }
  }

  const uploadInvoiceDocument = async (file: File): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    if (!clientId) return { success: false, error: 'لم يتم تحديد التاجر' }
    try {
      const res = await invoicesApi.uploadInvoiceDocument(clientId, file)
      return { success: true, filePath: res.file_path }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء رفع الملف'
      return { success: false, error: msg }
    }
  }

  const updateInvoice = async (id: string, invoice: InvoiceInsert): Promise<{ success: boolean; error?: string }> => {
    try {
      await invoicesApi.updateInvoice(id, invoice)
      await fetchInvoices()
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء تعديل الفاتورة'
      return { success: false, error: msg }
    }
  }

  const deleteInvoice = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await invoicesApi.deleteInvoice(id)
      await fetchInvoices()
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ في الحذف'
      return { success: false, error: msg }
    }
  }

  const downloadZipArchive = () => {
    if (!clientId) return
    const downloadUrl = `/api/clients/${clientId}/export-zip?year=${selectedYear}`
    window.open(downloadUrl, '_blank')
  }

  const totals = {
    purchases: invoices.filter((i) => i.type === 'purchase').reduce((acc, curr) => acc + curr.amount_ttc, 0),
    sales: invoices.filter((i) => i.type === 'sale').reduce((acc, curr) => acc + curr.amount_ttc, 0),
    tvaPurchases: invoices.filter((i) => i.type === 'purchase').reduce((acc, curr) => acc + (curr.amount_ht * (curr.tva_rate / 100)), 0),
    tvaSales: invoices.filter((i) => i.type === 'sale').reduce((acc, curr) => acc + (curr.amount_ht * (curr.tva_rate / 100)), 0),
  }

  return {
    invoices,
    fiscalYears,
    selectedYear,
    setSelectedYear,
    isYearLocked,
    toggleYearStatus,
    addFiscalYear,
    loading,
    error,
    totals,
    addInvoice,
    uploadInvoiceDocument,
    deleteInvoice,
    updateInvoice,
    downloadZipArchive,
    refetch: fetchInvoices,
  }
}

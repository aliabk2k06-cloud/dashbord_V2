import { useState, useEffect, useCallback } from 'react'
import type { BankStatement, BankStatementInsert } from '../types/bank-statement'
import * as bankStatementsApi from '../services/api/bank-statements'
import * as invoicesApi from '../services/api/invoices'

export function useBankStatements(clientId: string | null, selectedYear: string = '2026') {
  const [bankStatements, setBankStatements] = useState<BankStatement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatements = useCallback(async () => {
    if (!clientId) {
      setBankStatements([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await bankStatementsApi.fetchBankStatements(clientId, selectedYear)
      setBankStatements(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء جلب الكشوفات البنكية'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [clientId, selectedYear])

  useEffect(() => {
    void fetchStatements()
  }, [fetchStatements])

  const addBankStatement = async (data: BankStatementInsert): Promise<{ success: boolean; error?: string }> => {
    if (!clientId) return { success: false, error: 'لم يتم تحديد التاجر' }
    try {
      const yearNum = selectedYear === 'all'
        ? (data.start_date ? new Date(data.start_date).getFullYear() : new Date().getFullYear())
        : parseInt(selectedYear, 10)

      const payload: BankStatementInsert = {
        ...data,
        fiscal_year: isNaN(yearNum) ? 2026 : yearNum,
      }
      await bankStatementsApi.createBankStatement(clientId, payload)
      await fetchStatements()
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ في حفظ الكشف البنكي'
      return { success: false, error: msg }
    }
  }

  const uploadStatementDocument = async (file: File): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    if (!clientId) return { success: false, error: 'لم يتم تحديد التاجر' }
    try {
      const res = await invoicesApi.uploadInvoiceDocument(clientId, file)
      return { success: true, filePath: res.file_path }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء رفع الملف البنكي'
      return { success: false, error: msg }
    }
  }

  const updateBankStatement = async (id: string, data: BankStatementInsert): Promise<{ success: boolean; error?: string }> => {
    try {
      const yearNum = selectedYear === 'all'
        ? (data.start_date ? new Date(data.start_date).getFullYear() : new Date().getFullYear())
        : parseInt(selectedYear, 10)

      const payload: BankStatementInsert = {
        ...data,
        fiscal_year: isNaN(yearNum) ? (data.fiscal_year || 2026) : yearNum,
      }
      await bankStatementsApi.updateBankStatement(id, payload)
      await fetchStatements()
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء تعديل الكشف البنكي'
      return { success: false, error: msg }
    }
  }

  const deleteBankStatement = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await bankStatementsApi.deleteBankStatement(id)
      await fetchStatements()
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حذف الكشف البنكي'
      return { success: false, error: msg }
    }
  }

  const downloadBankZipArchive = () => {
    if (!clientId) return
    const downloadUrl = `/api/clients/${clientId}/export-bank-zip?year=${selectedYear}`
    window.open(downloadUrl, '_blank')
  }

  const totals = {
    debitTotal: bankStatements.reduce((acc, curr) => acc + (Number(curr.debit_total) || 0), 0),
    creditTotal: bankStatements.reduce((acc, curr) => acc + (Number(curr.credit_total) || 0), 0),
    balanceTotal: bankStatements.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0),
    count: bankStatements.length,
  }

  return {
    bankStatements,
    loading,
    error,
    totals,
    addBankStatement,
    uploadStatementDocument,
    updateBankStatement,
    deleteBankStatement,
    downloadBankZipArchive,
    refetch: fetchStatements,
  }
}

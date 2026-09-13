import { createContext, useContext, useState, ReactNode } from 'react'
import { useClients } from '../hooks/use-clients'
import { useInvoices } from '../hooks/use-invoices'
import { useBankStatements } from '../hooks/use-bank-statements'
import type { Client, ClientUpdate } from '../types/client'
import type { Invoice, InvoiceInsert, ClientFiscalYear } from '../types/invoice'
import type { BankStatement, BankStatementInsert } from '../types/bank-statement'

export type ClientTabType =
  | 'invoices'
  | 'create_pdf'
  | 'upload_doc'
  | 'export_zip'
  | 'bank_statements'
  | 'upload_bank_statement'
  | 'export_bank_statements'
  | 'profile'

interface ClientWorkspaceContextType {
  clientId: string
  client: Client | undefined
  loadingClient: boolean
  activeTab: ClientTabType
  setActiveTab: (tab: ClientTabType) => void
  invoices: Invoice[]
  fiscalYears: ClientFiscalYear[]
  selectedYear: string
  setSelectedYear: (y: string) => void
  isYearLocked: boolean
  toggleYearStatus: (y: number) => Promise<{ success: boolean; error?: string }>
  addFiscalYear: (yr: number, closePrev: boolean) => Promise<{ success: boolean; error?: string }>
  loadingInvoices: boolean
  totals: { sales: number; purchases: number; tvaSales: number; tvaPurchases: number }
  addInvoice: (inv: InvoiceInsert) => Promise<{ success: boolean; error?: string }>
  uploadInvoiceDocument: (file: File) => Promise<{ success: boolean; filePath?: string; error?: string }>
  deleteInvoice: (id: string) => Promise<{ success: boolean; error?: string }>
  updateInvoice: (id: string, inv: InvoiceInsert) => Promise<{ success: boolean; error?: string }>
  downloadZipArchive: () => void
  // Bank Statements
  bankStatements: BankStatement[]
  loadingBankStatements: boolean
  bankTotals: { debitTotal: number; creditTotal: number; balanceTotal: number; count: number }
  addBankStatement: (data: BankStatementInsert) => Promise<{ success: boolean; error?: string }>
  uploadStatementDocument: (file: File) => Promise<{ success: boolean; filePath?: string; error?: string }>
  updateBankStatement: (id: string, data: BankStatementInsert) => Promise<{ success: boolean; error?: string }>
  deleteBankStatement: (id: string) => Promise<{ success: boolean; error?: string }>
  downloadBankZipArchive: () => void
  // Modal states
  isNewYearModalOpen: boolean
  setIsNewYearModalOpen: (v: boolean) => void
  isEditOpen: boolean
  setIsEditOpen: (v: boolean) => void
  isDeleteOpen: boolean
  setIsDeleteOpen: (v: boolean) => void
  updateClient: (id: string, updatedData: ClientUpdate) => Promise<{ success: boolean; error?: string }>
  deleteClient: (id: string) => Promise<{ success: boolean; error?: string }>
}

const ClientWorkspaceContext = createContext<ClientWorkspaceContextType | null>(null)

export function ClientWorkspaceProvider({ clientId, children }: { clientId: string; children: ReactNode }) {
  const { clients, loading: loadingClient, updateClient, deleteClient } = useClients()
  const client = clients.find((c) => c.id === clientId)

  const [activeTab, setActiveTab] = useState<ClientTabType>('invoices')

  const {
    invoices,
    fiscalYears,
    selectedYear,
    setSelectedYear,
    isYearLocked,
    toggleYearStatus,
    addFiscalYear,
    loading: loadingInvoices,
    totals,
    addInvoice,
    uploadInvoiceDocument,
    deleteInvoice,
    updateInvoice,
    downloadZipArchive,
  } = useInvoices(clientId)

  const {
    bankStatements,
    loading: loadingBankStatements,
    totals: bankTotals,
    addBankStatement,
    uploadStatementDocument,
    updateBankStatement,
    deleteBankStatement,
    downloadBankZipArchive,
  } = useBankStatements(clientId, selectedYear)

  // Modals state
  const [isNewYearModalOpen, setIsNewYearModalOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const value: ClientWorkspaceContextType = {
    clientId,
    client,
    loadingClient,
    activeTab,
    setActiveTab,
    invoices,
    fiscalYears,
    selectedYear,
    setSelectedYear,
    isYearLocked,
    toggleYearStatus,
    addFiscalYear,
    loadingInvoices,
    totals,
    addInvoice,
    uploadInvoiceDocument,
    deleteInvoice,
    updateInvoice,
    downloadZipArchive,
    bankStatements,
    loadingBankStatements,
    bankTotals,
    addBankStatement,
    uploadStatementDocument,
    updateBankStatement,
    deleteBankStatement,
    downloadBankZipArchive,
    isNewYearModalOpen,
    setIsNewYearModalOpen,
    isEditOpen,
    setIsEditOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    updateClient,
    deleteClient,
  }

  return <ClientWorkspaceContext.Provider value={value}>{children}</ClientWorkspaceContext.Provider>
}

export function useClientWorkspace() {
  const ctx = useContext(ClientWorkspaceContext)
  return ctx
}

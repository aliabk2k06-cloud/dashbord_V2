import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Sparkles,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Eye,
  Search,
  CheckSquare,
  Square,
  FileText,
  Calculator,
  ShieldCheck,
  Layers,
  BookOpen,
  FolderTree,
  BarChart3,
  Loader2,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Activity,
  CircleDot,
  Hash,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import type { Invoice } from '../../types/invoice'
import type { Client } from '../../types/client'
import { toast } from 'sonner'
import { useClientWorkspace } from '../../context/client-workspace-context'

// ============ Type Definitions ============
interface ScfJournalEntry {
  status: string
  journal_code: string
  journal_name: string
  entry_date: string
  invoice_number: string
  total_debit: number
  total_credit: number
  is_balanced: boolean
  entries: Array<{
    line: number
    account_code: string
    account_name: string
    debit: number
    credit: number
    libelle: string
  }>
}

interface ScfAccount {
  id?: number
  code: string
  name: string
  type?: string
  is_postable?: number
}

interface SubAccount {
  id: number
  client_id: string
  code: string
  name: string
  parent_code: string
  entity_type: 'supplier' | 'client' | 'other'
}

type AiSubTab = 'ai_smart_processing' | 'ai_journal_entries' | 'ai_chart_of_accounts' | 'ai_reports'

// ============ Sub-Tab Configuration ============
const AI_SUB_TABS: { id: AiSubTab; label: string; icon: any; description: string }[] = [
  {
    id: 'ai_smart_processing',
    label: 'المعالجة الذكية',
    icon: Sparkles,
    description: 'استخراج بيانات الفواتير وتحليلها بالذكاء الاصطناعي',
  },
  {
    id: 'ai_journal_entries',
    label: 'القيود المحاسبية',
    icon: BookOpen,
    description: 'قيود اليومية المزدوجة المنشأة من الفواتير',
  },
  {
    id: 'ai_chart_of_accounts',
    label: 'مخطط الحسابات',
    icon: FolderTree,
    description: 'دليل الحسابات المحاسبية (SCF)',
  },
  {
    id: 'ai_reports',
    label: 'التقارير والإحصائيات',
    icon: BarChart3,
    description: 'لوحة تحليلات الأداء المحاسبي',
  },
]

// ============ Props ============
interface AiProcessingViewProps {
  client: Client | undefined
  invoices: Invoice[]
  onRefreshInvoices?: () => void
}

// ============ Main Component ============
export function AiProcessingView({ client, invoices, onRefreshInvoices }: AiProcessingViewProps) {
  const workspace = useClientWorkspace()
  const activeSubTab = (workspace?.activeTab as AiSubTab) || 'ai_smart_processing'

  // ─── Shared State ───
  const [journalEntriesMap, setJournalEntriesMap] = useState<Record<string, ScfJournalEntry>>({})
  const [accounts, setAccounts] = useState<ScfAccount[]>([])
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  // ─── Fetch SCF Accounts from Backend ───
  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const res = await fetch('/api/internal/accounts/reference')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data)
      }
    } catch (err) {
      console.error('Failed to fetch SCF accounts:', err)
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  // ─── Fetch Sub-Accounts for current client ───
  const fetchSubAccounts = useCallback(async () => {
    if (!client?.id) return
    try {
      const res = await fetch(`/api/internal/accounts/all-sub-accounts?client_id=${client.id}`)
      if (res.ok) {
        const data = await res.json()
        setSubAccounts(data.sub_accounts || [])
      }
    } catch (err) {
      console.error('Failed to fetch sub-accounts:', err)
    }
  }, [client?.id])

    useEffect(() => {
      void fetchAccounts()
      void fetchSubAccounts()
    }, [fetchAccounts, fetchSubAccounts])

    // Auto-populate journalEntriesMap for existing invoices
    useEffect(() => {
      if (invoices && invoices.length > 0) {
        setJournalEntriesMap((prev) => {
          const next = { ...prev }
          invoices.forEach((inv) => {
            if (!next[inv.id] && inv.amount_ttc > 0) {
              const isSale = inv.type === 'sale'
              const amountHt = Number(inv.amount_ht || 0)
              const tvaAmount = Number(inv.tva_amount || (inv.amount_ttc && inv.amount_ht ? inv.amount_ttc - inv.amount_ht : 0))
              const amountTtc = Number(inv.amount_ttc || (amountHt + tvaAmount))

              const entries: ScfJournalEntry['entries'] = []

              if (!isSale) {
                const chargeCode = inv.suggested_account_code || '380000'
                entries.push({
                  line: 1,
                  account_code: chargeCode,
                  account_name: chargeCode.startsWith('6') ? 'Prestations / Services & Travaux' : 'Achats de marchandises',
                  debit: amountHt,
                  credit: 0,
                  libelle: `Achat - ${inv.counterparty || 'Tiers'} (Facture ${inv.invoice_number})`,
                })

                if (tvaAmount > 0) {
                  entries.push({
                    line: 2,
                    account_code: '445600',
                    account_name: 'TVA déductible sur achats',
                    debit: tvaAmount,
                    credit: 0,
                    libelle: `TVA 19% - Facture ${inv.invoice_number}`,
                  })
                }

                const supplierCode = inv.matched_account_code || '401000'
                entries.push({
                  line: entries.length + 1,
                  account_code: supplierCode,
                  account_name: `Fournisseur: ${inv.counterparty || 'Tiers'}`,
                  debit: 0,
                  credit: amountTtc,
                  libelle: `Facture d'achat ${inv.invoice_number} - ${inv.counterparty}`,
                })
              } else {
                const clientCode = inv.matched_account_code || '411000'
                entries.push({
                  line: 1,
                  account_code: clientCode,
                  account_name: `Client: ${inv.counterparty || 'Client'}`,
                  debit: amountTtc,
                  credit: 0,
                  libelle: `Facture de vente ${inv.invoice_number} - ${inv.counterparty}`,
                })

                const saleCode = inv.suggested_account_code || '704000'
                entries.push({
                  line: 2,
                  account_code: saleCode,
                  account_name: saleCode.startsWith('704') ? 'Ventes de travaux / Décomptes' : 'Ventes de marchandises',
                  debit: 0,
                  credit: amountHt,
                  libelle: `Vente - ${inv.counterparty} (Facture ${inv.invoice_number})`,
                })

                if (tvaAmount > 0) {
                  entries.push({
                    line: 3,
                    account_code: '445700',
                    account_name: 'TVA collectée sur ventes',
                    debit: 0,
                    credit: tvaAmount,
                    libelle: `TVA 19% Collectée - Facture ${inv.invoice_number}`,
                  })
                }
              }

              const totalDebit = Number(entries.reduce((sum, e) => sum + e.debit, 0).toFixed(2))
              const totalCredit = Number(entries.reduce((sum, e) => sum + e.credit, 0).toFixed(2))
              const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

              next[inv.id] = {
                status: isBalanced ? 'SCF_BALANCED_SUCCESS' : 'SCF_UNBALANCED_ERROR',
                journal_code: isSale ? 'VTE' : 'ACH',
                journal_name: isSale ? 'Journal des Ventes' : 'Journal des Achats',
                entry_date: (inv.date || new Date().toISOString().split('T')[0]) as string,
                invoice_number: inv.invoice_number || 'FAC-000',
                total_debit: totalDebit,
                total_credit: totalCredit,
                is_balanced: isBalanced,
                entries,
              }
            }
          })
          return next
        })
      }
    }, [invoices])

  // ─── Computed Stats ───
  const stats = useMemo(() => {
    const total = invoices.length
    const approved = invoices.filter((i) => i.ai_status === 'approved').length
    const pending = invoices.filter((i) => i.ai_status === 'pending').length
    const unprocessed = invoices.filter((i) => !i.ai_status || i.ai_status === 'unprocessed').length
    const totalAmountTtc = invoices.reduce((acc, i) => acc + (i.amount_ttc || 0), 0)
    const journalCount = Object.keys(journalEntriesMap).length
    const balancedCount = Object.values(journalEntriesMap).filter((j) => j.is_balanced).length

    return { total, approved, pending, unprocessed, totalAmountTtc, journalCount, balancedCount }
  }, [invoices, journalEntriesMap])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── AI Section Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-500/25">
              <Bot className="h-6 w-6" />
            </div>
            <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-400 text-[8px] font-bold text-white ring-2 ring-background animate-pulse">
              AI
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              المحاسب الذكي
              <span className="inline-flex items-center rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 border border-purple-500/20">
                ✨ Powered by AI
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              {client?.owner_name} — {client?.business_name}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Sub-Tab Navigation Bar ─── */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-purple-500/5 border border-purple-500/15 overflow-x-auto">
        {AI_SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id
          const TabIcon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => workspace?.setActiveTab(tab.id)}
              className={`
                relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap
                ${isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                  : 'text-muted-foreground hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400'
                }
              `}
            >
              <TabIcon className="h-4 w-4 shrink-0" />
              {tab.label}
              {isActive && (
                <span className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-purple-500" />
              )}
            </button>
          )
        })}
      </div>

      {/* ─── Tab Content ─── */}
      {activeSubTab === 'ai_smart_processing' && (
        <SmartProcessingTab
          client={client}
          invoices={invoices}
          stats={stats}
          journalEntriesMap={journalEntriesMap}
          setJournalEntriesMap={setJournalEntriesMap}
          onRefreshInvoices={onRefreshInvoices}
        />
      )}
      {activeSubTab === 'ai_journal_entries' && (
        <JournalEntriesTab
          invoices={invoices}
          journalEntriesMap={journalEntriesMap}
          stats={stats}
        />
      )}
      {activeSubTab === 'ai_chart_of_accounts' && (
        <ChartOfAccountsTab
          accounts={accounts}
          subAccounts={subAccounts}
          loading={loadingAccounts}
          clientId={client?.id || ''}
          onRefreshSubAccounts={fetchSubAccounts}
        />
      )}
      {activeSubTab === 'ai_reports' && (
        <ReportsTab
          invoices={invoices}
          stats={stats}
          journalEntriesMap={journalEntriesMap}
          accounts={accounts}
        />
      )}
    </div>
  )
}

// ╔══════════════════════════════════════════════════════════════╗
// ║   TAB 1: المعالجة الذكية — Smart AI Processing             ║
// ╚══════════════════════════════════════════════════════════════╝
function SmartProcessingTab({
  client,
  invoices,
  stats,
  journalEntriesMap,
  setJournalEntriesMap,
  onRefreshInvoices,
}: {
  client: Client | undefined
  invoices: Invoice[]
  stats: any
  journalEntriesMap: Record<string, ScfJournalEntry>
  setJournalEntriesMap: React.Dispatch<React.SetStateAction<Record<string, ScfJournalEntry>>>
  onRefreshInvoices?: () => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [processingIds, setProcessingIds] = useState<string[]>([])
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        !searchQuery ||
        inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.counterparty?.toLowerCase().includes(searchQuery.toLowerCase())

      let matchesStatus = true
      if (statusFilter === 'approved') matchesStatus = inv.ai_status === 'approved'
      if (statusFilter === 'pending') matchesStatus = inv.ai_status === 'pending'
      if (statusFilter === 'unprocessed') matchesStatus = !inv.ai_status || inv.ai_status === 'unprocessed'

      return matchesSearch && matchesStatus
    })
  }, [invoices, statusFilter, searchQuery])

  // Checkbox handlers
  const handleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredInvoices.map((i) => i.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // ─── AI Processing Handler (calls real backend) ───
  const handleProcessSelectedAI = async () => {
    if (selectedIds.length === 0) return

    setIsBatchProcessing(true)
    setProcessingIds(selectedIds)
    toast.info(`جاري المعالجة الذكية لـ ${selectedIds.length} فاتورة...`)

    let successCount = 0
    let failCount = 0

    for (const invId of selectedIds) {
      const inv = invoices.find((i) => i.id === invId)
      if (!inv) continue

      try {
        const payload = {
          client_id: client?.id || '',
          invoice_id: inv.id,
          file_path: inv.file_path || '',
          invoice_number: inv.invoice_number,
          counterparty: inv.counterparty,
          type: inv.type,
          amount_ht: inv.amount_ht,
          amount_ttc: inv.amount_ttc,
          tva_amount: inv.tva_amount,
          date: inv.date,
        }

        const res = await fetch('/api/n8n/process-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (res.ok) {
          const resData = await res.json()
          if (resData.scf_journal_entry) {
            const rawEntry = resData.scf_journal_entry
            const normalizedEntry: ScfJournalEntry = {
              status: rawEntry.status || 'SCF_BALANCED_SUCCESS',
              journal_code: rawEntry.journal_code || 'OD',
              journal_name: rawEntry.journal_name || 'Journal',
              entry_date: rawEntry.entry_date || inv.date || new Date().toISOString().split('T')[0],
              invoice_number: rawEntry.invoice_number || inv.invoice_number || 'FAC-000',
              total_debit: Number(rawEntry.total_debit || 0),
              total_credit: Number(rawEntry.total_credit || 0),
              is_balanced: rawEntry.is_balanced !== undefined 
                ? rawEntry.is_balanced 
                : Math.abs(Number(rawEntry.total_debit || 0) - Number(rawEntry.total_credit || 0)) < 0.01,
              entries: Array.isArray(rawEntry.entries) ? rawEntry.entries : [],
            }
            setJournalEntriesMap((prev) => ({ ...prev, [inv.id]: normalizedEntry }))
          }
          successCount++
        } else {
          failCount++
        }
      } catch (err) {
        console.error(`Error processing invoice ${invId}:`, err)
        failCount++
      }

      setProcessingIds((prev) => prev.filter((id) => id !== invId))
    }

    setIsBatchProcessing(false)
    setProcessingIds([])
    setSelectedIds([])

    if (successCount > 0) {
      toast.success(`✅ تمت معالجة ${successCount} فاتورة بنجاح`)
    }
    if (failCount > 0) {
      toast.error(`❌ فشلت معالجة ${failCount} فاتورة`)
    }

    onRefreshInvoices?.()
  }

  const handleProcessSingle = async (inv: Invoice) => {
    setProcessingIds((prev) => [...prev, inv.id])
    toast.info(`جاري معالجة الفاتورة رقم ${inv.invoice_number || ''}...`)

    try {
      const payload = {
        client_id: client?.id || '',
        invoice_id: inv.id,
        file_path: inv.file_path || '',
        invoice_number: inv.invoice_number,
        counterparty: inv.counterparty,
        type: inv.type,
        amount_ht: inv.amount_ht,
        amount_ttc: inv.amount_ttc,
        tva_amount: inv.tva_amount,
        date: inv.date,
      }

      const res = await fetch('/api/n8n/process-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const resData = await res.json()
        console.log('✅ [AI Process] Raw API response:', JSON.stringify(resData, null, 2))

        if (resData.scf_journal_entry) {
          const rawEntry = resData.scf_journal_entry
          // Normalize the entry to match frontend ScfJournalEntry interface
          const normalizedEntry: ScfJournalEntry = {
            status: rawEntry.status || 'SCF_BALANCED_SUCCESS',
            journal_code: rawEntry.journal_code || 'OD',
            journal_name: rawEntry.journal_name || 'Journal',
            entry_date: rawEntry.entry_date || inv.date || new Date().toISOString().split('T')[0],
            invoice_number: rawEntry.invoice_number || inv.invoice_number || 'FAC-000',
            total_debit: Number(rawEntry.total_debit || 0),
            total_credit: Number(rawEntry.total_credit || 0),
            is_balanced: rawEntry.is_balanced !== undefined 
              ? rawEntry.is_balanced 
              : Math.abs(Number(rawEntry.total_debit || 0) - Number(rawEntry.total_credit || 0)) < 0.01,
            entries: Array.isArray(rawEntry.entries) ? rawEntry.entries : [],
          }

          console.log('✅ [AI Process] Normalized entry for invoice', inv.id, ':', JSON.stringify(normalizedEntry, null, 2))
          
          setJournalEntriesMap((prev) => {
            const next = { ...prev, [inv.id]: normalizedEntry }
            console.log('✅ [AI Process] Updated journalEntriesMap keys:', Object.keys(next))
            return next
          })
        } else {
          console.warn('⚠️ [AI Process] No scf_journal_entry in response')
        }
        toast.success(`✅ تمت معالجة الفاتورة رقم ${inv.invoice_number || ''} وتوليد القيد المحاسبي!`)
      } else {
        const errText = await res.text()
        console.error('❌ [AI Process] API error:', res.status, errText)
        toast.error(`❌ حدث خطأ أثناء معالجة الفاتورة ${inv.invoice_number || ''}`)
      }
    } catch (err) {
      console.error(`Error processing invoice ${inv.id}:`, err)
      toast.error(`❌ تعذر الاتصال بالخادم لمعالجة الفاتورة`)
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== inv.id))
      onRefreshInvoices?.()
    }
  }

  const getStatusBadge = (inv: Invoice) => {
    const isProcessing = processingIds.includes(inv.id)
    if (isProcessing) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Loader2 className="h-3 w-3 animate-spin" />
          جاري المعالجة
        </span>
      )
    }
    if (inv.ai_status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" />
          معالَجة ✓
        </span>
      )
    }
    if (inv.ai_status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20">
          <Clock className="h-3 w-3" />
          قيد الانتظار
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold bg-slate-500/15 text-slate-500 border border-slate-500/20">
        <CircleDot className="h-3 w-3" />
        غير معالَج
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="إجمالي الفواتير"
          value={stats.total}
          icon={<FileText className="h-4 w-4" />}
          color="purple"
        />
        <StatCard
          label="معالَجة بنجاح"
          value={stats.approved}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="green"
        />
        <StatCard
          label="غير معالَجة"
          value={stats.unprocessed}
          icon={<Clock className="h-4 w-4" />}
          color="slate"
        />
        <StatCard
          label="المبلغ الإجمالي TTC"
          value={`${stats.totalAmountTtc.toLocaleString('fr-DZ')} د.ج`}
          icon={<Calculator className="h-4 w-4" />}
          color="blue"
          isText
        />
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالرقم أو الطرف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 h-9 text-xs border-purple-500/20 focus:border-purple-500/40"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-40 text-xs border-purple-500/20">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="approved">✅ معالَجة</SelectItem>
              <SelectItem value="pending">⏳ قيد الانتظار</SelectItem>
              <SelectItem value="unprocessed">⬜ غير معالَجة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md">
              {selectedIds.length} محددة
            </span>
          )}
          <Button
            size="sm"
            onClick={handleProcessSelectedAI}
            disabled={selectedIds.length === 0 || isBatchProcessing}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20"
          >
            {isBatchProcessing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                معالجة بالذكاء الاصطناعي
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── Invoices Table ─── */}
      <Card className="border-purple-500/10 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-purple-500/5 hover:bg-purple-500/5">
                <TableHead className="w-10 text-center">
                  <button onClick={handleSelectAll} className="hover:opacity-80 transition-opacity">
                    {selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-purple-600" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="text-xs font-bold">رقم الفاتورة</TableHead>
                <TableHead className="text-xs font-bold">النوع</TableHead>
                <TableHead className="text-xs font-bold">الطرف المقابل</TableHead>
                <TableHead className="text-xs font-bold text-center">HT</TableHead>
                <TableHead className="text-xs font-bold text-center">TVA</TableHead>
                <TableHead className="text-xs font-bold text-center">TTC</TableHead>
                <TableHead className="text-xs font-bold text-center">التاريخ</TableHead>
                <TableHead className="text-xs font-bold text-center">الحالة</TableHead>
                <TableHead className="text-xs font-bold text-center">الحساب</TableHead>
                <TableHead className="text-xs font-bold text-center">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground text-sm">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="h-10 w-10 text-muted-foreground/30" />
                      <p>لا توجد فواتير مطابقة للتصفية</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv) => {
                  const isSelected = selectedIds.includes(inv.id)
                  const isProcessing = processingIds.includes(inv.id)
                  const journalEntry = journalEntriesMap[inv.id]

                  return (
                    <TableRow
                      key={inv.id}
                      className={`
                        transition-all text-xs
                        ${isSelected ? 'bg-purple-500/5' : ''}
                        ${isProcessing ? 'opacity-70 animate-pulse' : ''}
                      `}
                    >
                      <TableCell className="text-center">
                        <button onClick={() => toggleSelectOne(inv.id)} className="hover:opacity-80">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-purple-600" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono-code font-bold text-foreground">
                        {inv.invoice_number || '—'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${inv.type === 'sale'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                              : 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                            }`}
                        >
                          {inv.type === 'sale' ? 'مبيعات' : 'مشتريات'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium max-w-[140px] truncate">
                        {inv.counterparty || '—'}
                      </TableCell>
                      <TableCell className="text-center font-mono-code">
                        {inv.amount_ht?.toLocaleString('fr-DZ') || '—'}
                      </TableCell>
                      <TableCell className="text-center font-mono-code">
                        {inv.tva_amount?.toLocaleString('fr-DZ') || '—'}
                      </TableCell>
                      <TableCell className="text-center font-mono-code font-bold">
                        {inv.amount_ttc?.toLocaleString('fr-DZ') || '—'}
                      </TableCell>
                      <TableCell className="text-center font-mono-code text-muted-foreground">
                        {inv.date || '—'}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(inv)}</TableCell>
                      <TableCell className="text-center font-mono-code text-[10px]">
                        {inv.suggested_account_code || (journalEntry?.entries?.[0]?.account_code) || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleProcessSingle(inv)}
                            className="h-7 px-2 text-[11px] gap-1 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                            title="معالجة هذه الفاتورة وتوليد القيد"
                          >
                            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 text-purple-500" />}
                            معالجة
                          </Button>
                          {inv.file_path && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (inv.file_path?.endsWith('.pdf') || inv.file_path?.endsWith('.jpg') || inv.file_path?.endsWith('.png')) {
                                  window.open(`/storage/${inv.file_path.replace(/^.*[/\\]storage[/\\]/, '')}`, '_blank')
                                }
                              }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-purple-600"
                              title="عرض الملف"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

// ╔══════════════════════════════════════════════════════════════╗
// ║   TAB 2: القيود المحاسبية — Journal Entries                ║
// ╚══════════════════════════════════════════════════════════════╝
function JournalEntriesTab({
  invoices,
  journalEntriesMap,
  stats,
}: {
  invoices: Invoice[]
  journalEntriesMap: Record<string, ScfJournalEntry>
  stats: any
}) {
  const [journalFilter, setJournalFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter journal entries
  const entriesWithInvoice = useMemo(() => {
    return Object.entries(journalEntriesMap)
      .map(([invoiceId, entry]) => {
        const invoice = invoices.find((i) => String(i.id) === String(invoiceId))
        return {
          invoiceId,
          invoice,
          entry,
        }
      })
      .filter(({ invoice, entry }) => {
        if (!invoice) return false
        const matchesJournal = journalFilter === 'all' || entry.journal_code === journalFilter
        const matchesSearch =
          !searchQuery ||
          entry.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.counterparty?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesJournal && matchesSearch
      })
  }, [journalEntriesMap, invoices, journalFilter, searchQuery])

  // Global balance
  const globalBalance = useMemo(() => {
    let totalDebit = 0
    let totalCredit = 0
    Object.values(journalEntriesMap).forEach((entry) => {
      totalDebit += entry.total_debit || 0
      totalCredit += entry.total_credit || 0
    })
    const ecart = Math.abs(totalDebit - totalCredit)
    return { totalDebit, totalCredit, ecart, isBalanced: ecart < 0.01 }
  }, [journalEntriesMap])

  return (
    <div className="space-y-5">
      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="القيود المنشأة"
          value={stats.journalCount}
          icon={<BookOpen className="h-4 w-4" />}
          color="purple"
        />
        <StatCard
          label="متوازنة ✓"
          value={stats.balancedCount}
          icon={<ShieldCheck className="h-4 w-4" />}
          color="green"
        />
        <StatCard
          label="إجمالي المدين"
          value={`${globalBalance.totalDebit.toLocaleString('fr-DZ')} د.ج`}
          icon={<TrendingUp className="h-4 w-4" />}
          color="blue"
          isText
        />
        <StatCard
          label="إجمالي الدائن"
          value={`${globalBalance.totalCredit.toLocaleString('fr-DZ')} د.ج`}
          icon={<TrendingDown className="h-4 w-4" />}
          color="teal"
          isText
        />
      </div>

      {/* ─── Global Balance Indicator ─── */}
      <div
        className={`flex items-center gap-3 rounded-lg border p-3 text-xs font-bold ${globalBalance.isBalanced
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
          }`}
      >
        {globalBalance.isBalanced ? (
          <>
            <ShieldCheck className="h-5 w-5" />
            ✅ الميزان العام متوازن — المدين = الدائن
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5" />
            ⚠️ فرق في الميزان: {globalBalance.ecart.toLocaleString('fr-DZ')} د.ج
          </>
        )}
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في القيود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 h-9 text-xs border-purple-500/20"
            />
          </div>
          <Select value={journalFilter} onValueChange={setJournalFilter}>
            <SelectTrigger className="h-9 w-44 text-xs border-purple-500/20">
              <SelectValue placeholder="اليومية" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">كل اليوميات</SelectItem>
              <SelectItem value="ACH">📥 يومية المشتريات (ACH)</SelectItem>
              <SelectItem value="VTE">📤 يومية المبيعات (VTE)</SelectItem>
              <SelectItem value="OD">📋 عمليات متنوعة (OD)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Journal Entries List ─── */}
      {entriesWithInvoice.length === 0 ? (
        <Card className="border-dashed border-purple-500/20">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/20" />
            <div>
              <p className="text-sm font-bold text-muted-foreground">لا توجد قيود محاسبية بعد</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                قم بمعالجة الفواتير في تبويب "المعالجة الذكية" لإنشاء القيود تلقائياً
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entriesWithInvoice.map(({ invoiceId, invoice, entry }) => (
            <JournalEntryCard key={invoiceId} invoice={invoice!} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Journal Entry Card Component ───
function JournalEntryCard({ invoice, entry }: { invoice: Invoice; entry: ScfJournalEntry }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const journalColorClass =
    entry.journal_code === 'ACH'
      ? 'border-l-orange-500'
      : entry.journal_code === 'VTE'
        ? 'border-l-blue-500'
        : 'border-l-slate-500'

  return (
    <Card className={`border-s-4 ${journalColorClass} overflow-hidden transition-all`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-start hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${entry.journal_code === 'ACH'
                ? 'bg-orange-500'
                : entry.journal_code === 'VTE'
                  ? 'bg-blue-500'
                  : 'bg-slate-500'
              }`}
          >
            {entry.journal_code}
          </div>
          <div>
            <p className="text-xs font-bold">{entry.invoice_number} — {invoice.counterparty || 'غير محدد'}</p>
            <p className="text-[11px] text-muted-foreground">
              {entry.journal_name} • {entry.entry_date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="text-xs font-mono-code font-bold">{entry.total_debit.toLocaleString('fr-DZ')} د.ج</p>
            <p className="text-[10px] text-muted-foreground">مدين / دائن</p>
          </div>
          {entry.is_balanced ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          )}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-accent/30">
                <TableHead className="text-[10px] font-bold w-10">#</TableHead>
                <TableHead className="text-[10px] font-bold">رمز الحساب</TableHead>
                <TableHead className="text-[10px] font-bold">اسم الحساب</TableHead>
                <TableHead className="text-[10px] font-bold text-center">مدين (Débit)</TableHead>
                <TableHead className="text-[10px] font-bold text-center">دائن (Crédit)</TableHead>
                <TableHead className="text-[10px] font-bold">البيان</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.entries.map((line) => (
                <TableRow key={line.line} className="text-xs">
                  <TableCell className="font-mono-code text-muted-foreground">{line.line}</TableCell>
                  <TableCell className="font-mono-code font-bold text-purple-600 dark:text-purple-400">
                    {line.account_code}
                  </TableCell>
                  <TableCell className="text-[11px]">{line.account_name}</TableCell>
                  <TableCell className="text-center font-mono-code">
                    {line.debit > 0 ? (
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {line.debit.toLocaleString('fr-DZ')}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono-code">
                    {line.credit > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {line.credit.toLocaleString('fr-DZ')}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground max-w-[200px] truncate">
                    {line.libelle}
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals Row */}
              <TableRow className="bg-accent/50 font-bold text-xs border-t-2 border-border">
                <TableCell colSpan={3} className="text-end font-bold">
                  المجموع
                </TableCell>
                <TableCell className="text-center font-mono-code text-blue-600 dark:text-blue-400">
                  {entry.total_debit.toLocaleString('fr-DZ')}
                </TableCell>
                <TableCell className="text-center font-mono-code text-emerald-600 dark:text-emerald-400">
                  {entry.total_credit.toLocaleString('fr-DZ')}
                </TableCell>
                <TableCell>
                  {entry.is_balanced ? (
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">✅ متوازن</span>
                  ) : (
                    <span className="text-red-500 text-[10px]">⚠️ غير متوازن</span>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}

// ╔══════════════════════════════════════════════════════════════╗
// ║   TAB 3: مخطط الحسابات — Chart of Accounts (SCF)          ║
// ╚══════════════════════════════════════════════════════════════╝
function ChartOfAccountsTab({
  accounts,
  subAccounts,
  loading,
  clientId: _clientId,
  onRefreshSubAccounts: _onRefreshSubAccounts,
}: {
  accounts: ScfAccount[]
  subAccounts: SubAccount[]
  loading: boolean
  clientId: string
  onRefreshSubAccounts: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'main' | 'sub'>('main')

  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts
    return accounts.filter(
      (a) =>
        a.code.includes(searchQuery) ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [accounts, searchQuery])

  const filteredSubAccounts = useMemo(() => {
    if (!searchQuery) return subAccounts
    return subAccounts.filter(
      (a) =>
        a.code.includes(searchQuery) ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [subAccounts, searchQuery])

  // Group main accounts by class (first digit)
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, ScfAccount[]> = {}
    filteredAccounts.forEach((acc) => {
      const classKey = acc.code.charAt(0)
      if (!groups[classKey]) groups[classKey] = []
      groups[classKey].push(acc)
    })
    return groups
  }, [filteredAccounts])

  const classNames: Record<string, string> = {
    '1': 'حسابات رؤوس الأموال — Comptes de capitaux',
    '2': 'حسابات التثبيتات — Comptes d\'immobilisations',
    '3': 'حسابات المخزونات — Comptes de stocks',
    '4': 'حسابات الغير — Comptes de tiers',
    '5': 'الحسابات المالية — Comptes financiers',
    '6': 'حسابات الأعباء — Comptes de charges',
    '7': 'حسابات المنتجات — Comptes de produits',
  }

  return (
    <div className="space-y-5">
      {/* ─── Stats ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="حسابات SCF المرجعية"
          value={accounts.length}
          icon={<FolderTree className="h-4 w-4" />}
          color="purple"
        />
        <StatCard
          label="حسابات فرعية (الموردين/الزبائن)"
          value={subAccounts.length}
          icon={<Layers className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          label="فئات الحسابات"
          value={Object.keys(groupedAccounts).length}
          icon={<Hash className="h-4 w-4" />}
          color="teal"
        />
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالرمز أو الاسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 h-9 text-xs border-purple-500/20"
            />
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-accent/50 rounded-lg border border-border">
          <button
            onClick={() => setViewMode('main')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'main' ? 'bg-purple-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            الحسابات الرئيسية
          </button>
          <button
            onClick={() => setViewMode('sub')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'sub' ? 'bg-purple-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            الحسابات الفرعية ({subAccounts.length})
          </button>
        </div>
      </div>

      {/* ─── Content ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm font-medium">جاري تحميل مخطط الحسابات...</span>
        </div>
      ) : viewMode === 'main' ? (
        <div className="space-y-4">
          {Object.entries(groupedAccounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([classKey, accs]) => (
              <AccountClassGroup
                key={classKey}
                classKey={classKey}
                className={classNames[classKey] || `الفئة ${classKey}`}
                accounts={accs}
              />
            ))}
          {filteredAccounts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              لا توجد حسابات مطابقة
            </div>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden border-purple-500/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-purple-500/5">
                <TableHead className="text-xs font-bold">رمز الحساب</TableHead>
                <TableHead className="text-xs font-bold">اسم الحساب الفرعي</TableHead>
                <TableHead className="text-xs font-bold">الحساب الأب</TableHead>
                <TableHead className="text-xs font-bold text-center">النوع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                    لا توجد حسابات فرعية — ستُنشأ تلقائياً عند معالجة الفواتير
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubAccounts.map((sub) => (
                  <TableRow key={sub.id} className="text-xs">
                    <TableCell className="font-mono-code font-bold text-purple-600 dark:text-purple-400">
                      {sub.code}
                    </TableCell>
                    <TableCell className="font-medium">{sub.name}</TableCell>
                    <TableCell className="font-mono-code text-muted-foreground">{sub.parent_code}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${sub.entity_type === 'supplier'
                            ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                            : sub.entity_type === 'client'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                              : 'bg-slate-500/15 text-slate-500'
                          }`}
                      >
                        {sub.entity_type === 'supplier' ? 'مورد' : sub.entity_type === 'client' ? 'زبون' : 'أخرى'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

// ─── Account Class Group Component ───
function AccountClassGroup({
  classKey,
  className: classLabel,
  accounts,
}: {
  classKey: string
  className: string
  accounts: ScfAccount[]
}) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Card className="overflow-hidden border-purple-500/10">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-start"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold text-sm font-mono-code">
          {classKey}
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold">{classLabel}</p>
          <p className="text-[10px] text-muted-foreground">{accounts.length} حساب</p>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-border">
          {accounts.map((acc) => (
            <div
              key={acc.code}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors"
            >
              <span className="font-mono-code text-xs font-bold text-purple-600 dark:text-purple-400 w-16 shrink-0">
                {acc.code}
              </span>
              <span className="text-xs text-foreground">{acc.name}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ╔══════════════════════════════════════════════════════════════╗
// ║   TAB 4: التقارير والإحصائيات — Reports & Analytics        ║
// ╚══════════════════════════════════════════════════════════════╝
function ReportsTab({
  invoices,
  stats,
  journalEntriesMap,
  accounts,
}: {
  invoices: Invoice[]
  stats: any
  journalEntriesMap: Record<string, ScfJournalEntry>
  accounts: ScfAccount[]
}) {
  // Processing rate
  const processRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0

  // Revenue vs Expenses
  const financials = useMemo(() => {
    const sales = invoices.filter((i) => i.type === 'sale')
    const purchases = invoices.filter((i) => i.type === 'purchase')
    const totalSales = sales.reduce((acc, i) => acc + (i.amount_ttc || 0), 0)
    const totalPurchases = purchases.reduce((acc, i) => acc + (i.amount_ttc || 0), 0)
    const totalTvaSales = sales.reduce((acc, i) => acc + (i.tva_amount || 0), 0)
    const totalTvaPurchases = purchases.reduce((acc, i) => acc + (i.tva_amount || 0), 0)
    const tvaBalance = totalTvaSales - totalTvaPurchases

    return {
      salesCount: sales.length,
      purchasesCount: purchases.length,
      totalSales,
      totalPurchases,
      totalTvaSales,
      totalTvaPurchases,
      tvaBalance,
      netBalance: totalSales - totalPurchases,
    }
  }, [invoices])

  // Journal distribution
  const journalDistribution = useMemo(() => {
    const dist = { ACH: 0, VTE: 0, OD: 0 }
    Object.values(journalEntriesMap).forEach((entry) => {
      if (entry.journal_code === 'ACH') dist.ACH++
      else if (entry.journal_code === 'VTE') dist.VTE++
      else dist.OD++
    })
    return dist
  }, [journalEntriesMap])

  return (
    <div className="space-y-6">
      {/* ─── Processing Progress ─── */}
      <Card className="border-purple-500/15 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-600" />
            نسبة الإنجاز في المعالجة الذكية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">الفواتير المعالجة / الإجمالي</span>
              <span className="font-bold font-mono-code text-purple-600 dark:text-purple-400">
                {stats.approved} / {stats.total}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-purple-500/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-l from-purple-600 to-purple-400 transition-all duration-700 ease-out"
                style={{ width: `${processRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">نسبة الإنجاز</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">{processRate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Financial Summary Cards ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Sales Card */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                المبيعات / الإيرادات
              </h3>
              <span className="text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                {financials.salesCount} فاتورة
              </span>
            </div>
            <p className="text-xl font-bold font-mono-code text-blue-600 dark:text-blue-400">
              {financials.totalSales.toLocaleString('fr-DZ')} <span className="text-sm">د.ج</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              TVA محصلة: {financials.totalTvaSales.toLocaleString('fr-DZ')} د.ج
            </p>
          </CardContent>
        </Card>

        {/* Purchases Card */}
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4" />
                المشتريات / المصاريف
              </h3>
              <span className="text-[10px] bg-orange-500/15 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold">
                {financials.purchasesCount} فاتورة
              </span>
            </div>
            <p className="text-xl font-bold font-mono-code text-orange-600 dark:text-orange-400">
              {financials.totalPurchases.toLocaleString('fr-DZ')} <span className="text-sm">د.ج</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              TVA مستردة: {financials.totalTvaPurchases.toLocaleString('fr-DZ')} د.ج
            </p>
          </CardContent>
        </Card>

        {/* TVA Balance Card */}
        <Card className={`border-${financials.tvaBalance >= 0 ? 'emerald' : 'red'}-500/20 bg-${financials.tvaBalance >= 0 ? 'emerald' : 'red'}-500/5`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-purple-600" />
                رصيد TVA
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${financials.tvaBalance >= 0
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/15 text-red-600 dark:text-red-400'
                  }`}
              >
                {financials.tvaBalance >= 0 ? 'لصالح المؤسسة' : 'مستحق للدفع'}
              </span>
            </div>
            <p
              className={`text-xl font-bold font-mono-code ${financials.tvaBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
                }`}
            >
              {Math.abs(financials.tvaBalance).toLocaleString('fr-DZ')} <span className="text-sm">د.ج</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              محصلة - مستردة = {financials.tvaBalance.toLocaleString('fr-DZ')} د.ج
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Journal Distribution ─── */}
      <Card className="border-purple-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-purple-600" />
            توزيع القيود حسب اليومية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
              <span className="text-2xl font-bold font-mono-code text-orange-600 dark:text-orange-400">
                {journalDistribution.ACH}
              </span>
              <span className="text-[10px] font-bold text-orange-600/70">📥 يومية المشتريات (ACH)</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <span className="text-2xl font-bold font-mono-code text-blue-600 dark:text-blue-400">
                {journalDistribution.VTE}
              </span>
              <span className="text-[10px] font-bold text-blue-600/70">📤 يومية المبيعات (VTE)</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-500/5 border border-slate-500/20">
              <span className="text-2xl font-bold font-mono-code text-slate-500">
                {journalDistribution.OD}
              </span>
              <span className="text-[10px] font-bold text-slate-500/70">📋 عمليات متنوعة (OD)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Accounts Summary ─── */}
      <Card className="border-purple-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-purple-600" />
            ملخص مخطط الحسابات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center p-3 rounded-lg bg-accent/50">
              <p className="text-lg font-bold font-mono-code">{accounts.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">حساب SCF مرجعي</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-accent/50">
              <p className="text-lg font-bold font-mono-code">{stats.journalCount}</p>
              <p className="text-[10px] text-muted-foreground font-medium">قيد محاسبي منشأ</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-accent/50">
              <p className="text-lg font-bold font-mono-code">{stats.balancedCount}</p>
              <p className="text-[10px] text-muted-foreground font-medium">قيد متوازن ✅</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-accent/50">
              <p className="text-lg font-bold font-mono-code">{processRate}%</p>
              <p className="text-[10px] text-muted-foreground font-medium">نسبة الإنجاز</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ╔══════════════════════════════════════════════════════════════╗
// ║   Shared Components                                        ║
// ╚══════════════════════════════════════════════════════════════╝
function StatCard({
  label,
  value,
  icon,
  color,
  isText = false,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: 'purple' | 'green' | 'blue' | 'teal' | 'slate' | 'orange'
  isText?: boolean
}) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    slate: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  }

  const iconBgClasses: Record<string, string> = {
    purple: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
    green: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    teal: 'bg-teal-500/20 text-teal-600 dark:text-teal-400',
    slate: 'bg-slate-500/20 text-slate-500',
    orange: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
  }

  return (
    <Card className={`border ${colorClasses[color]} transition-all hover:shadow-md`}>
      <CardContent className="p-3.5 flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBgClasses[color]}`}>
          {icon}
        </div>
        <div className="overflow-hidden">
          <p className="text-[10px] font-medium text-muted-foreground truncate">{label}</p>
          <p className={`font-bold truncate ${isText ? 'text-xs' : 'text-lg font-mono-code'}`}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

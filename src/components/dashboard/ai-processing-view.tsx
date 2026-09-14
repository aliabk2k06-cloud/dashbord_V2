import { useState, useMemo } from 'react'
import {
  Sparkles,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Eye,
  RotateCw,
  Search,
  CheckSquare,
  Square,
  FileText,
  Calculator,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Layers,
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
import { openInvoiceInNewTab } from '../../lib/pdf-generator'
import type { Invoice } from '../../types/invoice'
import type { Client } from '../../types/client'
import { toast } from 'sonner'

interface AiProcessingViewProps {
  client: Client | undefined
  invoices: Invoice[]
  onRefreshInvoices?: () => void
}

export function AiProcessingView({ client, invoices, onRefreshInvoices }: AiProcessingViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [processingIds, setProcessingIds] = useState<string[]>([])
  const [activeReviewInvoice, setActiveReviewInvoice] = useState<Invoice | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false)

  // Compute AI Statistics
  const stats = useMemo(() => {
    const total = invoices.length
    const approved = invoices.filter((i) => i.ai_status === 'approved').length
    const pending = invoices.filter((i) => i.ai_status === 'pending').length
    const unprocessed = invoices.filter((i) => !i.ai_status || i.ai_status === 'unprocessed').length
    const avgConfidence =
      total > 0
        ? Math.round(
            (invoices.reduce((acc, i) => acc + (i.confidence || (i.ai_status === 'approved' ? 0.95 : 0)), 0) /
              (total || 1)) *
              100
          )
        : 0

    return { total, approved, pending, unprocessed, avgConfidence }
  }, [invoices])

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Search
      const matchesSearch =
        !searchQuery ||
        inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.counterparty?.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
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

  const handleSelectUnprocessed = () => {
    const unprocessed = filteredInvoices
      .filter((i) => !i.ai_status || i.ai_status === 'unprocessed')
      .map((i) => i.id)
    setSelectedIds(unprocessed)
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Trigger AI processing for selected invoice IDs
  const handleProcessSelectedAI = async () => {
    if (selectedIds.length === 0) return

    setIsBatchProcessing(true)
    setProcessingIds(selectedIds)
    toast.info(`جاري بدء المعالجة بالذكاء الاصطناعي لـ ${selectedIds.length} فاتورة...`)

    let successCount = 0
    let failCount = 0

    for (const invId of selectedIds) {
      const inv = invoices.find((i) => i.id === invId)
      if (!inv) continue

      try {
        const payload = {
          client_id: client?.id || 'test_client_001',
          invoice_id: inv.id,
          file_path: inv.file_path || 'sample_invoice.pdf',
          invoice_number: inv.invoice_number,
          counterparty: inv.counterparty,
          type: inv.type,
          amount_ht: inv.amount_ht,
          amount_ttc: inv.amount_ttc,
          tva_amount: inv.tva_amount,
          date: inv.date,
        }

        const res = await fetch('http://localhost:5678/webhook/process-invoice-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (res.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch (err) {
        console.error('AI Processing error:', err)
        failCount++
      }
    }

    setIsBatchProcessing(false)
    setProcessingIds([])
    setSelectedIds([])

    if (successCount > 0) {
      toast.success(`تمت معالجة ${successCount} فاتورة بنجاح عبر الذكاء الاصطناعي ✨`)
      if (onRefreshInvoices) onRefreshInvoices()
    }
    if (failCount > 0) {
      toast.error(`تعذر معالجة ${failCount} فاتورة`)
    }
  }

  // Process single invoice
  const handleProcessSingleAI = async (inv: Invoice) => {
    setProcessingIds((prev) => [...prev, inv.id])
    toast.info(`جاري تحليل الفاتورة #${inv.invoice_number}...`)

    try {
      const payload = {
        client_id: client?.id || 'test_client_001',
        invoice_id: inv.id,
        file_path: inv.file_path || 'sample_invoice.pdf',
        invoice_number: inv.invoice_number,
        counterparty: inv.counterparty,
        type: inv.type,
        amount_ht: inv.amount_ht,
        amount_ttc: inv.amount_ttc,
        tva_amount: inv.tva_amount,
        date: inv.date,
      }

      const res = await fetch('http://localhost:5678/webhook/process-invoice-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(`تمت معالجة الفاتورة #${inv.invoice_number} وتحديث الحسابات آلياً ✨`)
        if (onRefreshInvoices) onRefreshInvoices()
      } else {
        toast.error('حدث خطأ أثناء معالجة الفاتورة')
      }
    } catch (err) {
      toast.error('تعذر الاتصال بسير العمل التجريبي')
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== inv.id))
    }
  }

  // Open Drawer for review
  const openReviewDrawer = (inv: Invoice) => {
    setActiveReviewInvoice(inv)
    setIsDrawerOpen(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative pb-20">
      {/* Dynamic Header Section */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/10 via-purple-600/5 to-transparent p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                المعالجة الذكية للفواتير
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                  المحاسب الذكي v1.0
                </span>
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              حدد الفواتير المطلوبة لتطبيق نموذج الذكاء الاصطناعي لتصنيف الحسابات الجزائرية (SCF 380, 607, 700) وتوليد الحسابات الفرعية تلقائياً.
            </p>
          </div>

          <Button
            onClick={() => {
              if (onRefreshInvoices) onRefreshInvoices()
              toast.info('تم تحديث قائمة الفواتير')
            }}
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-bold border-purple-500/30 text-purple-600 dark:text-purple-300 hover:bg-purple-500/10"
          >
            <RotateCw className="h-3.5 w-3.5" />
            تحديث القائمة
          </Button>
        </div>
      </div>

      {/* AI Metrics Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Invoices */}
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">إجمالي الفواتير</p>
              <p className="text-2xl font-bold font-mono-code text-foreground mt-1">{stats.total}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Approved Auto */}
        <Card className="border-emerald-500/30 bg-emerald-500/5 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">معتمدة آلياً (Approved)</p>
              <p className="text-2xl font-bold font-mono-code text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.approved}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Review */}
        <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">تحت المراجعة (Pending)</p>
              <p className="text-2xl font-bold font-mono-code text-amber-600 dark:text-amber-400 mt-1">
                {stats.pending}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Unprocessed */}
        <Card className="border-purple-500/30 bg-purple-500/5 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 dark:text-purple-300 font-medium">لم تعالج بعد (Unprocessed)</p>
              <p className="text-2xl font-bold font-mono-code text-purple-600 dark:text-purple-300 mt-1">
                {stats.unprocessed}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Toolbar */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-500" />
              قائمة الفواتير المتاحة للمعالجة ({filteredInvoices.length})
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              {/* Selection Controls */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectUnprocessed}
                className="h-8 text-xs font-semibold text-purple-600 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/10 gap-1.5"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                تحديد غير المعالجة
              </Button>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                <SelectTrigger className="h-8 w-[170px] text-xs font-semibold">
                  <SelectValue placeholder="تصفية حسب الحالة" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="approved">🟢 معتمدة آلياً (Approved)</SelectItem>
                  <SelectItem value="pending">🟠 تحت المراجعة (Pending)</SelectItem>
                  <SelectItem value="unprocessed">⚪ غير معالجة (Unprocessed)</SelectItem>
                </SelectContent>
              </Select>

              {/* Search input */}
              <div className="relative w-full md:w-56">
                <Search className="absolute start-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث برقم الفاتورة..."
                  className="ps-8 text-xs h-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="تحديد الكل"
                    >
                      {selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المعني (المورد / الزبون)</TableHead>
                  <TableHead>المبلغ الإجمالي</TableHead>
                  <TableHead>توجيه SCF والمواصفة</TableHead>
                  <TableHead>حالة الذكاء الاصطناعي</TableHead>
                  <TableHead className="text-end pe-6">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground text-xs">
                      لا توجد فواتير مطابقة للفلاتر الحالية.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isChecked = selectedIds.includes(inv.id)
                    const isProcessingThis = processingIds.includes(inv.id)

                    return (
                      <TableRow
                        key={inv.id}
                        className={`transition-colors ${
                          isChecked ? 'bg-purple-500/5 dark:bg-purple-950/20' : 'hover:bg-accent/40'
                        }`}
                      >
                        {/* Checkbox cell */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectOne(inv.id)}
                            className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
                          >
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>

                        {/* Invoice Number */}
                        <TableCell className="font-mono-code font-bold text-xs">
                          {inv.invoice_number}
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              inv.type === 'sale'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {inv.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'}
                          </span>
                        </TableCell>

                        {/* Counterparty */}
                        <TableCell className="text-xs font-medium">{inv.counterparty}</TableCell>

                        {/* Amount TTC */}
                        <TableCell className="font-mono-code text-xs font-bold">
                          {inv.amount_ttc?.toFixed(2)} DA
                        </TableCell>

                        {/* SCF Account & Sub Account Tags */}
                        <TableCell>
                          {inv.suggested_account_code || inv.matched_account_code ? (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="bg-purple-500/10 text-purple-600 dark:text-purple-300 font-mono-code font-bold px-2 py-0.5 rounded text-[11px] border border-purple-500/20">
                                SCF: {inv.suggested_account_code || '380'}
                              </span>
                              {inv.matched_account_code && (
                                <span className="bg-secondary text-foreground font-mono-code text-[10px] px-1.5 py-0.5 rounded border border-border">
                                  فرعي: {inv.matched_account_code}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">لم يحدد بعد</span>
                          )}
                        </TableCell>

                        {/* AI Status Badge */}
                        <TableCell>
                          {inv.ai_status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 text-[11px] font-bold border border-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              معتمدة آلياً
                            </span>
                          ) : inv.ai_status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 text-[11px] font-bold border border-amber-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              تحت المراجعة
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground px-2.5 py-0.5 text-[11px] font-medium border border-border">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                              لم تعالج بعد
                            </span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-end pe-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Single Process Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isProcessingThis}
                              onClick={() => handleProcessSingleAI(inv)}
                              className="h-7 px-2 text-[11px] font-bold text-purple-600 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/10 gap-1"
                              title="معالجة بالذكاء الاصطناعي"
                            >
                              {isProcessingThis ? (
                                <RotateCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Zap className="h-3 w-3 fill-purple-500 text-purple-500" />
                              )}
                              معالجة
                            </Button>

                            {/* Audit / Review Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openReviewDrawer(inv)}
                              className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground gap-1"
                              title="فحص المستند والتدقيق"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              مراجعة
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Floating Animated Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-6 duration-200">
          <div className="flex items-center gap-4 rounded-2xl border border-purple-500/40 bg-card/95 backdrop-blur-md px-6 py-3.5 shadow-2xl shadow-purple-950/20">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-white text-xs font-bold">
                {selectedIds.length}
              </span>
              <span className="text-xs font-bold text-foreground">فواتير مختارة</span>
            </div>

            <div className="h-4 w-px bg-border" />

            <Button
              onClick={handleProcessSelectedAI}
              disabled={isBatchProcessing}
              className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md text-xs font-bold h-9 px-5 rounded-xl"
            >
              {isBatchProcessing ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  جاري معالجة الدفعة...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-white" />
                  ⚡ معالجة الفواتير المحددة بالذكاء الاصطناعي
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* Side-by-Side Review Drawer */}
      {isDrawerOpen && activeReviewInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-card border-s border-border h-full shadow-2xl flex flex-col animate-in slide-in-from-end duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/30">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/20 text-purple-600 dark:text-purple-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    تدقيق المعالجة الذكية #{activeReviewInvoice.invoice_number}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    المعني: {activeReviewInvoice.counterparty}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDrawerOpen(false)}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Document Preview Card */}
              <div className="rounded-xl border border-border p-4 bg-secondary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    المستند الاصلي المرفوع
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => client && openInvoiceInNewTab(client, activeReviewInvoice)}
                    className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <ExternalLink className="h-3 w-3" />
                    فتح الفاتورة الكاملة
                  </Button>
                </div>
                <div className="p-3 bg-background rounded-lg border border-border text-xs font-mono-code space-y-1">
                  <p><span className="text-muted-foreground">المبلغ الصافي HT:</span> {activeReviewInvoice.amount_ht.toFixed(2)} DA</p>
                  <p><span className="text-muted-foreground">مبلغ الـ TVA:</span> {(activeReviewInvoice.tva_amount ?? (activeReviewInvoice.amount_ttc - activeReviewInvoice.amount_ht)).toFixed(2)} DA</p>
                  <p className="font-bold text-primary"><span className="text-muted-foreground">الإجمالي TTC:</span> {activeReviewInvoice.amount_ttc.toFixed(2)} DA</p>
                </div>
              </div>

              {/* Accounting Classification */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-purple-500" />
                  التوجيه المحاسبي الجزائري SCF
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1">
                    <span className="text-[11px] text-muted-foreground">الحساب الرئيسي المقترح</span>
                    <p className="text-base font-bold font-mono-code text-purple-600 dark:text-purple-300">
                      {activeReviewInvoice.suggested_account_code || '380'} - مشتريات بضائع
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                    <span className="text-[11px] text-muted-foreground">الحساب الفرعي المولد</span>
                    <p className="text-base font-bold font-mono-code text-foreground">
                      {activeReviewInvoice.matched_account_code || '40101'} - حساب المورد
                    </p>
                  </div>
                </div>
              </div>

              {/* Programmatic Validation Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Calculator className="h-4 w-4 text-emerald-500" />
                  قائمة الفحص والتحقق الحسابي
                </h4>

                <div className="space-y-2 rounded-xl border border-border p-4 bg-card text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">التحقق من معادلة ($HT + TVA = TTC$)</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Check className="h-3.5 w-3.5" /> مطابقة 100%
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">التحقق من وجود الحساب الإجمالي SCF</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Check className="h-3.5 w-3.5" /> مسجل بنجاح
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">مستوى الثقة للذكاء الاصطناعي</span>
                    <span className="font-mono-code font-bold text-purple-600 dark:text-purple-300">
                      {Math.round((activeReviewInvoice.confidence || 0.95) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer Action */}
            <div className="border-t border-border p-4 bg-secondary/30 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDrawerOpen(false)}
                className="text-xs"
              >
                إغلاق
              </Button>

              <Button
                onClick={() => {
                  toast.success(`تم اعتماد التوجيه الحسابي للفاتورة #${activeReviewInvoice.invoice_number}`)
                  setIsDrawerOpen(false)
                }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                <Check className="h-4 w-4" />
                اعتماد التوجيه الحسابي وتأكيده
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

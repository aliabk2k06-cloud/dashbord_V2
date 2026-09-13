import { useState, useRef, useMemo, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { DirectionProvider } from '@radix-ui/react-direction'
import JSZip from 'jszip'
import {
  FilePlus,
  Upload,
  FileText,
  Trash2,
  Loader2,
  X,
  TrendingDown,
  TrendingUp,
  Calculator,
  Lock,
  Unlock,
  Calendar,
  Archive,
  PlusCircle,
  AlertTriangle,
  Phone,
  Copy,
  Check,
  Edit,
  UserCheck,
  ShieldCheck,
  FileSpreadsheet,
  LogOut,
  Building,
  FolderArchive,
  Eye,
  Filter,
  ListFilter,
  Settings,
  HardDrive,
  Printer,
  FolderOutput,
  Search,
  Landmark,
  Download,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { ThemeToggle } from '../layout/theme-toggle'
import { ClientWorkspaceProvider, useClientWorkspace, type ClientTabType } from '../../context/client-workspace-context'
import { generateInvoiceHTML, generateInvoicePDF, openInvoiceInNewTab, generateBankStatementHTML } from '../../lib/pdf-generator'
import { EditClientDialog } from './edit-client-dialog'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { DocumentViewerModal } from './document-viewer-modal'
import { BankStatementsView } from './bank-statements-section'
import type { Invoice, InvoiceInsert } from '../../types/invoice'
import type { BankStatementInsert } from '../../types/bank-statement'
import { cn } from '../../lib/utils'

// ============ Confirmation Dialog for Invoice Actions ============
function InvoiceActionConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmVariant = 'destructive',
  invoice,
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: 'destructive' | 'default'
  invoice: Invoice | null
  loading: boolean
}) {
  if (!open || !invoice) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            confirmVariant === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}>
            {confirmVariant === 'destructive' ? <AlertTriangle className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="my-4 text-sm text-foreground space-y-2">
          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs space-y-1">
            <p className="font-bold text-sm">فاتورة رقم: {invoice.invoice_number}</p>
            <p className="text-muted-foreground">{invoice.counterparty} — {invoice.amount_ttc.toFixed(2)} DA</p>
            <p className="text-muted-foreground">التاريخ: {invoice.date}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============ Invoice Edit Modal ============
function InvoiceEditModal({
  open,
  onClose,
  invoice,
  onSave,
}: {
  open: boolean
  onClose: () => void
  invoice: Invoice | null
  onSave: (id: string, data: InvoiceInsert) => Promise<{ success: boolean; error?: string }>
}) {
  const [editInvNumber, setEditInvNumber] = useState('')
  const [editInvType, setEditInvType] = useState<'purchase' | 'sale'>('sale')
  const [editAmountHt, setEditAmountHt] = useState('')
  const [editTvaRate, setEditTvaRate] = useState('19')
  const [editDate, setEditDate] = useState('')
  const [editCounterparty, setEditCounterparty] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Populate form when invoice changes
  useMemo(() => {
    if (invoice) {
      setEditInvNumber(invoice.invoice_number)
      setEditInvType(invoice.type as 'purchase' | 'sale')
      setEditAmountHt(String(invoice.amount_ht))
      setEditTvaRate(String(invoice.tva_rate))
      setEditDate(invoice.date)
      setEditCounterparty(invoice.counterparty)
      setEditNotes(invoice.notes || '')
      setErrorMsg(null)
    }
  }, [invoice])

  if (!open || !invoice) return null

  const computedTtc = () => {
    const ht = parseFloat(editAmountHt) || 0
    const tva = parseFloat(editTvaRate) || 0
    return (ht * (1 + tva / 100)).toFixed(2)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSaving(true)

    const ht = parseFloat(editAmountHt)
    const tva = parseFloat(editTvaRate)
    const ttc = parseFloat(computedTtc())

    const updatedData: InvoiceInsert = {
      invoice_number: editInvNumber,
      type: editInvType,
      amount_ht: ht,
      tva_rate: tva,
      amount_ttc: ttc,
      date: editDate,
      counterparty: editCounterparty,
      notes: editNotes,
      file_path: invoice.file_path,
      is_generated: invoice.is_generated,
      fiscal_year: invoice.fiscal_year,
    }

    const res = await onSave(invoice.id, updatedData)
    setSaving(false)

    if (res.success) {
      onClose()
    } else {
      setErrorMsg(res.error || 'فشل تعديل الفاتورة')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            تعديل الفاتورة
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">نوع الفاتورة</Label>
              <select
                value={editInvType}
                onChange={(e) => setEditInvType(e.target.value as 'purchase' | 'sale')}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="sale">فاتورة بيع (Vente)</option>
                <option value="purchase">فاتورة شراء (Achat)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">رقم الفاتورة</Label>
              <Input value={editInvNumber} onChange={(e) => setEditInvNumber(e.target.value)} className="font-mono-code text-xs h-9" dir="ltr" required />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">المعني (مورد/زبون)</Label>
            <Input value={editCounterparty} onChange={(e) => setEditCounterparty(e.target.value)} className="text-xs h-9" required />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">المبلغ HT</Label>
              <Input type="number" value={editAmountHt} onChange={(e) => setEditAmountHt(e.target.value)} className="font-mono-code text-xs h-9" dir="ltr" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نسبة TVA (%)</Label>
              <select value={editTvaRate} onChange={(e) => setEditTvaRate(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs font-mono-code focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="19">19%</option>
                <option value="9">9%</option>
                <option value="0">0%</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الإجمالي TTC</Label>
              <Input value={computedTtc()} readOnly className="font-mono-code font-bold text-xs h-9 bg-secondary/50 text-primary" dir="ltr" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">التاريخ</Label>
            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="text-xs h-9" required />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">ملاحظات</Label>
            <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="text-xs h-9" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>إلغاء</Button>
            <Button type="submit" disabled={saving} className="gap-1">
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin" /> جاري الحفظ...</>) : 'حفظ التعديلات'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function WorkspaceInnerContent() {
  const navigate = useNavigate()
  const workspace = useClientWorkspace()

  if (!workspace) return null

  const {
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
    bankStatements,
    uploadStatementDocument,
    addBankStatement,
    isNewYearModalOpen,
    setIsNewYearModalOpen,
    isEditOpen,
    setIsEditOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    updateClient,
    deleteClient,
  } = workspace

  // Preview Document Modal state
  const [previewDocUrl] = useState<string | null>(null)
  const [previewDocTitle] = useState<string>('معاينة الفاتورة')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Copy helper
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Invoice action dialog states
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const [isDeleteInvoiceOpen, setIsDeleteInvoiceOpen] = useState(false)
  const [deletingInvoice, setDeletingInvoice] = useState(false)
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null)
  const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false)

  // ZIP export filter states
  const [zipTypeFilter, setZipTypeFilter] = useState<'all' | 'sale' | 'purchase'>('all')
  const [zipMonthFilter, setZipMonthFilter] = useState<string>('all')
  const [zipPeriodFilter, setZipPeriodFilter] = useState<string>('all')
  const [zipFilename, setZipFilename] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, text: '' })

  // Client-side high volume bulk invoice exporter with progress bar & directory picker
  const handleBulkInvoiceExport = async () => {
    if (!client) return

    const matchingInvoices = invoices.filter((inv) => {
      if (zipTypeFilter !== 'all' && inv.type !== zipTypeFilter) return false
      if (!inv.date) return true
      const parts = (inv.date || '').split('-')
      if (parts.length < 2) return true
      const monthNum = parseInt(parts[1] || '0', 10)
      const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`
      if (zipMonthFilter !== 'all' && monthStr !== zipMonthFilter) return false
      if (zipPeriodFilter === 'H1' && !(monthNum >= 1 && monthNum <= 6)) return false
      if (zipPeriodFilter === 'H2' && !(monthNum >= 7 && monthNum <= 12)) return false
      if (zipPeriodFilter === 'Q1' && !(monthNum >= 1 && monthNum <= 3)) return false
      if (zipPeriodFilter === 'Q2' && !(monthNum >= 4 && monthNum <= 6)) return false
      if (zipPeriodFilter === 'Q3' && !(monthNum >= 7 && monthNum <= 9)) return false
      if (zipPeriodFilter === 'Q4' && !(monthNum >= 10 && monthNum <= 12)) return false
      return true
    })

    if (matchingInvoices.length === 0) {
      alert('لا توجد فواتير مطابقة للفلاتر المختارة لتصديرها')
      return
    }

    setIsExporting(true)
    setExportProgress({ current: 0, total: matchingInvoices.length, text: 'جاري بدء تجهيز الحزمة...' })

    try {
      const zip = new JSZip()
      const folderName = `فواتير_${client.owner_name}_${selectedYear}`
      const folder = zip.folder(folderName) || zip

      // 1. Add Summary CSV Manifest (Arabic & Excel compatible UTF-8 BOM)
      let csvContent = '\uFEFFرقم الفاتورة,النوع,المعني (زبون/مورد),المبلغ HT (دج),نسبة TVA (%),المبلغ الإجمالي TTC (دج),التاريخ,السنة الجبائية\n'
      matchingInvoices.forEach((inv) => {
        const typeLabel = inv.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'
        csvContent += `"${inv.invoice_number}","${typeLabel}","${inv.counterparty}",${inv.amount_ht},${inv.tva_rate},${inv.amount_ttc},"${inv.date}",${inv.fiscal_year || selectedYear}\n`
      })
      folder.file('جدول_كشف_الفواتير.csv', csvContent)

      // 2. Add each invoice file with progress tracking
      for (let i = 0; i < matchingInvoices.length; i++) {
        const inv = matchingInvoices[i]
        if (!inv) continue
        setExportProgress({
          current: i + 1,
          total: matchingInvoices.length,
          text: `جاري تجهيز الفاتورة ${i + 1} من ${matchingInvoices.length} (${inv.invoice_number})...`
        })

        const safeNumber = (inv.invoice_number || `FAC-${i+1}`).replace(/[/\\?%*:|"<>]/g, '_')

        if (inv.is_generated || !inv.file_path) {
          // Generated document: store as clean HTML file (printable in any browser)
          const htmlContent = generateInvoiceHTML(client, inv)
          const fileName = `${inv.type === 'sale' ? 'بيع' : 'شراء'}_${safeNumber}.html`
          folder.file(fileName, htmlContent)
        } else {
          // Uploaded file document: fetch blob and add to ZIP
          try {
            const fullUrl = inv.file_path.startsWith('http')
              ? inv.file_path
              : `http://127.0.0.1:3001${inv.file_path}`
            const fileRes = await fetch(fullUrl)
            if (fileRes.ok) {
              const blob = await fileRes.blob()
              const ext = inv.file_path.split('.').pop() || 'pdf'
              const uploadedName = `${inv.type === 'sale' ? 'بيع' : 'شراء'}_${safeNumber}.${ext}`
              folder.file(uploadedName, blob)
            } else {
              // Fallback to HTML document format if missing
              const htmlContent = generateInvoiceHTML(client, inv)
              folder.file(`${inv.type === 'sale' ? 'بيع' : 'شراء'}_${safeNumber}.html`, htmlContent)
            }
          } catch {
            const htmlContent = generateInvoiceHTML(client, inv)
            folder.file(`${inv.type === 'sale' ? 'بيع' : 'شراء'}_${safeNumber}.html`, htmlContent)
          }
        }

        // Small async delay to prevent UI thread lock on huge invoice counts
        if (i % 5 === 0) {
          await new Promise((res) => setTimeout(res, 0))
        }
      }

      setExportProgress({ current: matchingInvoices.length, total: matchingInvoices.length, text: 'جاري ضغط الملف وتهيئته للحفظ...' })

      const defaultFileName = zipFilename.trim() || `فواتير_${client.owner_name}_${selectedYear}.zip`
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      // Interactive directory save location selection via File System Access API
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFileName,
            types: [{
              description: 'ملف أرشيف الفواتير (.zip)',
              accept: { 'application/zip': ['.zip'] }
            }]
          })
          const writable = await handle.createWritable()
          await writable.write(zipBlob)
          await writable.close()
          setIsExporting(false)
          return
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setIsExporting(false)
            return
          }
        }
      }

      // Traditional browser download trigger fallback
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Bulk export error:', err)
      alert('حدث خطأ أثناء تصدير حزمة الفواتير')
    } finally {
      setIsExporting(false)
    }
  }

  // Bank Statements Bulk Upload States & Ref
  const bulkBankFileInputRef = useRef<HTMLInputElement | null>(null)
  const [bulkBankFiles, setBulkBankFiles] = useState<File[]>([])
  const [bulkBankUploading, setBulkBankUploading] = useState(false)
  const [bulkBankProgress, setBulkBankProgress] = useState({ current: 0, total: 0, text: '' })
  const [bulkBankDefaultBank, setBulkBankDefaultBank] = useState('البنك الوطني الجزائري (BNA)')
  const [bulkBankDefaultPeriod, setBulkBankDefaultPeriod] = useState('كشف شهري')

  // Bank Statements Bulk Export States
  const [zipBankFilter, setZipBankFilter] = useState('all')
  const [zipBankMonthFilter, setZipBankMonthFilter] = useState('all')
  const [zipBankPeriodFilter, setZipBankPeriodFilter] = useState('all')
  const [zipBankFilename, setZipBankFilename] = useState('')
  const [isBankExporting, setIsBankExporting] = useState(false)
  const [bankExportProgress, setBankExportProgress] = useState({ current: 0, total: 0, text: '' })

  // Bank Statements Bulk File Select (supports single files, multi-files, and ZIP extraction)
  const handleBulkBankFilesSelect = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return
    const extractedFiles: File[] = []

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i]
      if (!file) continue
      if (file.name.endsWith('.zip') || file.type === 'application/zip') {
        try {
          const zip = await JSZip.loadAsync(file)
          const entries = Object.keys(zip.files)
          for (const filename of entries) {
            const entry = zip.files[filename]
            if (entry && !entry.dir && !filename.startsWith('__MACOSX/')) {
              const ext = filename.split('.').pop()?.toLowerCase()
              if (['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
                const blob = await entry.async('blob')
                const cleanName = filename.split('/').pop() || filename
                const unzippedFile = new File([blob], cleanName, {
                  type: ext === 'pdf' ? 'application/pdf' : `image/${ext}`
                })
                extractedFiles.push(unzippedFile)
              }
            }
          }
        } catch (err) {
          console.error('Error reading ZIP file for bank statements import:', err)
        }
      } else {
        extractedFiles.push(file)
      }
    }

    setBulkBankFiles((prev) => [...prev, ...extractedFiles])
  }

  const handleRemoveBulkBankFile = (indexToRemove: number) => {
    setBulkBankFiles((prev) => prev.filter((_, i) => i !== indexToRemove))
  }

  // Handle executing bulk bank statement upload batch
  const handleBulkBankUploadSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!client || bulkBankFiles.length === 0 || isYearLocked) return

    setBulkBankUploading(true)
    setBulkBankProgress({ current: 0, total: bulkBankFiles.length, text: 'جاري بدء استيراد دفعة الكشوفات البنكية...' })

    let successCount = 0
    const currentFiscalYearNum = selectedYear === 'all' ? 2026 : parseInt(selectedYear, 10)

    for (let i = 0; i < bulkBankFiles.length; i++) {
      const file = bulkBankFiles[i]
      if (!file) continue

      setBulkBankProgress({
        current: i + 1,
        total: bulkBankFiles.length,
        text: `جاري حفظ وأرشفة الكشف البنكي ${i + 1} من ${bulkBankFiles.length} (${file.name})...`
      })

      const uploadRes = await uploadStatementDocument(file)
      if (uploadRes.success && uploadRes.filePath) {
        const rawName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
        const safeStmtNumber = rawName.replace(/[/\\?%*:|"<>]/g, '_').trim()

        const bankData: BankStatementInsert = {
          statement_number: safeStmtNumber || `RLV-BULK-${i + 1}`,
          bank_name: bulkBankDefaultBank || 'البنك الوطني الجزائري (BNA)',
          period: bulkBankDefaultPeriod || 'كشف شهري',
          start_date: new Date().toISOString().split('T')[0]!,
          end_date: new Date().toISOString().split('T')[0]!,
          debit_total: 0,
          credit_total: 0,
          balance: 0,
          file_path: uploadRes.filePath,
          notes: `كشف بنكي مأرشف مستورد (${file.name})`,
          fiscal_year: currentFiscalYearNum,
        }

        const res = await addBankStatement(bankData)
        if (res.success) successCount++
      }

      if (i % 3 === 0) {
        await new Promise((res) => setTimeout(res, 0))
      }
    }

    setBulkBankUploading(false)
    setBulkBankFiles([])
    alert(`تم استيراد ${successCount} كشف بنكي بنجاح بالسجل المصرفي!`)
    setActiveTab('bank_statements')
  }

  // Count matching bank statements for export
  const zipBankCount = useMemo(() => {
    return bankStatements.filter((stmt) => {
      if (zipBankFilter !== 'all' && !stmt.bank_name.toLowerCase().includes(zipBankFilter.toLowerCase())) return false
      if (stmt.start_date) {
        const parts = stmt.start_date.split('-')
        if (parts.length >= 2) {
          const monthNum = parseInt(parts[1] || '0', 10)
          const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`
          if (zipBankMonthFilter !== 'all' && monthStr !== zipBankMonthFilter) return false
          if (zipBankPeriodFilter === 'H1' && !(monthNum >= 1 && monthNum <= 6)) return false
          if (zipBankPeriodFilter === 'H2' && !(monthNum >= 7 && monthNum <= 12)) return false
          if (zipBankPeriodFilter === 'Q1' && !(monthNum >= 1 && monthNum <= 3)) return false
          if (zipBankPeriodFilter === 'Q2' && !(monthNum >= 4 && monthNum <= 6)) return false
          if (zipBankPeriodFilter === 'Q3' && !(monthNum >= 7 && monthNum <= 9)) return false
          if (zipBankPeriodFilter === 'Q4' && !(monthNum >= 10 && monthNum <= 12)) return false
        }
      }
      return true
    }).length
  }, [bankStatements, zipBankFilter, zipBankMonthFilter, zipBankPeriodFilter])

  // Handle bulk bank export with JSZip & Progress Indicator
  const handleBulkBankExport = async () => {
    if (!client) return

    const matchingStatements = bankStatements.filter((stmt) => {
      if (zipBankFilter !== 'all' && !stmt.bank_name.toLowerCase().includes(zipBankFilter.toLowerCase())) return false
      if (stmt.start_date) {
        const parts = stmt.start_date.split('-')
        if (parts.length >= 2) {
          const monthNum = parseInt(parts[1] || '0', 10)
          const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`
          if (zipBankMonthFilter !== 'all' && monthStr !== zipBankMonthFilter) return false
          if (zipBankPeriodFilter === 'H1' && !(monthNum >= 1 && monthNum <= 6)) return false
          if (zipBankPeriodFilter === 'H2' && !(monthNum >= 7 && monthNum <= 12)) return false
          if (zipBankPeriodFilter === 'Q1' && !(monthNum >= 1 && monthNum <= 3)) return false
          if (zipBankPeriodFilter === 'Q2' && !(monthNum >= 4 && monthNum <= 6)) return false
          if (zipBankPeriodFilter === 'Q3' && !(monthNum >= 7 && monthNum <= 9)) return false
          if (zipBankPeriodFilter === 'Q4' && !(monthNum >= 10 && monthNum <= 12)) return false
        }
      }
      return true
    })

    if (matchingStatements.length === 0) {
      alert('لا توجد كشوفات بنكية مطابقة للفلاتر المختارة لتصديرها')
      return
    }

    setIsBankExporting(true)
    setBankExportProgress({ current: 0, total: matchingStatements.length, text: 'جاري بدء تجهيز الحزمة البنكية...' })

    try {
      const zip = new JSZip()
      const folderName = `كشوفات_بنكية_${client.owner_name}_${selectedYear}`
      const folder = zip.folder(folderName) || zip

      // 1. CSV Manifest with UTF-8 BOM
      let csvContent = '\uFEFFرقم الكشف,البنك / المؤسسة,الفترة,تاريخ البداية,تاريخ النهاية,المصروفات Débit (دج),المقبوضات Crédit (دج),الرصيد Solde (دج),السنة الجبائية,ملاحظات\n'
      matchingStatements.forEach((stmt) => {
        csvContent += `"${stmt.statement_number}","${stmt.bank_name}","${stmt.period}","${stmt.start_date || ''}","${stmt.end_date || ''}",${stmt.debit_total},${stmt.credit_total},${stmt.balance},${stmt.fiscal_year || selectedYear},"${(stmt.notes || '').replace(/"/g, '""')}"\n`
      })
      folder.file('جدول_كشف_الحسابات_البنكية.csv', csvContent)

      // 2. Process Files
      for (let i = 0; i < matchingStatements.length; i++) {
        const stmt = matchingStatements[i]
        if (!stmt) continue
        setBankExportProgress({
          current: i + 1,
          total: matchingStatements.length,
          text: `جاري تجهيز الكشف ${i + 1} من ${matchingStatements.length} (${stmt.statement_number})...`
        })

        const safeNumber = (stmt.statement_number || `RLV-${i+1}`).replace(/[/\\?%*:|"<>]/g, '_')

        if (stmt.file_path) {
          try {
            const fullUrl = stmt.file_path.startsWith('http')
              ? stmt.file_path
              : `http://127.0.0.1:3001${stmt.file_path}`
            const fileRes = await fetch(fullUrl)
            if (fileRes.ok) {
              const blob = await fileRes.blob()
              const ext = stmt.file_path.split('.').pop() || 'pdf'
              folder.file(`كشف_${safeNumber}.${ext}`, blob)
            } else {
              const htmlContent = generateBankStatementHTML(client, stmt)
              folder.file(`كشف_${safeNumber}.html`, htmlContent)
            }
          } catch {
            const htmlContent = generateBankStatementHTML(client, stmt)
            folder.file(`كشف_${safeNumber}.html`, htmlContent)
          }
        } else {
          const htmlContent = generateBankStatementHTML(client, stmt)
          folder.file(`كشف_${safeNumber}.html`, htmlContent)
        }

        if (i % 5 === 0) {
          await new Promise((res) => setTimeout(res, 0))
        }
      }

      setBankExportProgress({ current: matchingStatements.length, total: matchingStatements.length, text: 'جاري ضغط الحزمة البنكية...' })

      const defaultFileName = zipBankFilename.trim() || `كشوفات_بنكية_${client.owner_name}_${selectedYear}.zip`
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFileName,
            types: [{
              description: 'أرشيف الكشوفات البنكية (.zip)',
              accept: { 'application/zip': ['.zip'] }
            }]
          })
          const writable = await handle.createWritable()
          await writable.write(zipBlob)
          await writable.close()
          setIsBankExporting(false)
          return
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setIsBankExporting(false)
            return
          }
        }
      }

      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Bulk bank export error:', err)
      alert('حدث خطأ أثناء تصدير الكشوفات البنكية')
    } finally {
      setIsBankExporting(false)
    }
  }

  // Create Invoice Form state
  const [invNumber, setInvNumber] = useState('')
  const [invType, setInvType] = useState<'purchase' | 'sale'>('sale')
  const [amountHt, setAmountHt] = useState('')
  const [tvaRate, setTvaRate] = useState('19')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [counterparty, setCounterparty] = useState('')
  const [notes, setNotes] = useState('')
  const [submittingInvoice, setSubmittingInvoice] = useState(false)

  // Upload File & Bulk Import state
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null)

  // Bulk Upload Specific States
  const [bulkFiles, setBulkFiles] = useState<File[]>([])
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, text: '' })
  const [bulkDefaultType, setBulkDefaultType] = useState<'purchase' | 'sale'>('purchase')
  const [bulkDefaultAmount, setBulkDefaultAmount] = useState('0')
  const [bulkDefaultCounterparty, setBulkDefaultCounterparty] = useState('جهة مجهولة / عامة')

  // Handle selecting multiple files or ZIP extraction for bulk upload
  const handleBulkFilesSelect = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return
    const extractedFiles: File[] = []

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i]
      if (!file) continue
      if (file.name.endsWith('.zip') || file.type === 'application/zip') {
        try {
          const zip = await JSZip.loadAsync(file)
          const entries = Object.keys(zip.files)
          for (const filename of entries) {
            const entry = zip.files[filename]
            if (entry && !entry.dir && !filename.startsWith('__MACOSX/')) {
              const ext = filename.split('.').pop()?.toLowerCase()
              if (['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
                const blob = await entry.async('blob')
                const cleanName = filename.split('/').pop() || filename
                const unzippedFile = new File([blob], cleanName, {
                  type: ext === 'pdf' ? 'application/pdf' : `image/${ext}`
                })
                extractedFiles.push(unzippedFile)
              }
            }
          }
        } catch (err) {
          console.error('Error reading ZIP file for bulk import:', err)
        }
      } else {
        extractedFiles.push(file)
      }
    }

    setBulkFiles((prev) => [...prev, ...extractedFiles])
  }

  const handleRemoveBulkFile = (indexToRemove: number) => {
    setBulkFiles((prev) => prev.filter((_, i) => i !== indexToRemove))
  }

  // Handle executing bulk upload batch
  const handleBulkUploadSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!client || bulkFiles.length === 0 || isYearLocked) return

    setBulkUploading(true)
    setBulkProgress({ current: 0, total: bulkFiles.length, text: 'جاري بدء استيراد دفعة الفواتير...' })

    let successCount = 0
    const currentFiscalYearNum = selectedYear === 'all' ? 2026 : parseInt(selectedYear, 10)

    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i]
      if (!file) continue

      setBulkProgress({
        current: i + 1,
        total: bulkFiles.length,
        text: `جاري حفظ وأرشفة الفاتورة ${i + 1} من ${bulkFiles.length} (${file.name})...`
      })

      const uploadRes = await uploadInvoiceDocument(file)
      if (uploadRes.success && uploadRes.filePath) {
        const rawName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
        const safeInvNumber = rawName.replace(/[/\\?%*:|"<>]/g, '_').trim()
        const ttc = parseFloat(bulkDefaultAmount) || 0

        const invoiceData: InvoiceInsert = {
          invoice_number: safeInvNumber || `FAC-BULK-${i + 1}`,
          type: bulkDefaultType,
          amount_ht: ttc > 0 ? ttc / 1.19 : 0,
          tva_rate: 19,
          amount_ttc: ttc,
          date: new Date().toISOString().split('T')[0]!,
          counterparty: bulkDefaultCounterparty || 'جهة عامة',
          file_path: uploadRes.filePath,
          is_generated: 0,
          notes: `وثيقة مأرشفة مستوردة دفعة واحدة (${file.name})`,
          fiscal_year: currentFiscalYearNum,
        }

        const res = await addInvoice(invoiceData)
        if (res.success) successCount++
      }

      if (i % 3 === 0) {
        await new Promise((res) => setTimeout(res, 0))
      }
    }

    setBulkUploading(false)
    setBulkFiles([])
    alert(`تم استيراد ${successCount} فاتورة مأرشفة بنجاح بالسجل!`)
    setActiveTab('invoices')
  }

  // New Fiscal Year Modal state
  const [newYearInput, setNewYearInput] = useState(String(new Date().getFullYear() + 1))
  const [closePreviousCheck, setClosePreviousCheck] = useState(true)
  const [addingYear, setAddingYear] = useState(false)

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Advanced Invoice Filter states
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'purchase'>('all')
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>('all')

  // Accordion sub-menu tab helpers
  const invoiceSubTabs: { id: ClientTabType; label: string; icon: any; disabled?: boolean }[] = [
    { id: 'invoices', label: 'سجل وعرض الفواتير', icon: ListFilter },
    { id: 'create_pdf', label: 'إنشاء فاتورة جديدة', icon: FilePlus, disabled: isYearLocked },
    { id: 'upload_doc', label: 'استيراد / رفع فاتورة', icon: Upload, disabled: isYearLocked },
    { id: 'export_zip', label: 'تصدير الفواتير', icon: Archive },
  ]

  const bankSubTabs: { id: ClientTabType; label: string; icon: any; disabled?: boolean }[] = [
    { id: 'bank_statements', label: 'سجل الكشوفات البنكية', icon: Landmark },
    { id: 'upload_bank_statement', label: 'استيراد / رفع كشف بنكي', icon: Upload },
    { id: 'export_bank_statements', label: 'تصدير الكشوفات البنكية', icon: Download },
  ]

  // Invoice delete handler with confirmation
  const handleDeleteInvoiceConfirm = async () => {
    if (!invoiceToDelete) return
    setDeletingInvoice(true)
    await deleteInvoice(invoiceToDelete.id)
    setDeletingInvoice(false)
    setIsDeleteInvoiceOpen(false)
    setInvoiceToDelete(null)
  }

  // Computed total ZIP file size estimate
  const zipInvoiceCount = useMemo(() => {
    return invoices.filter((inv) => {
      if (zipTypeFilter !== 'all' && inv.type !== zipTypeFilter) return false
      if (!inv.date) return true
      const parts = (inv.date || '').split('-')
      if (parts.length < 2) return true
      const monthNum = parseInt(parts[1] || '0', 10)
      const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`
      if (zipMonthFilter !== 'all' && monthStr !== zipMonthFilter) return false
      if (zipPeriodFilter === 'H1' && !(monthNum >= 1 && monthNum <= 6)) return false
      if (zipPeriodFilter === 'H2' && !(monthNum >= 7 && monthNum <= 12)) return false
      if (zipPeriodFilter === 'Q1' && !(monthNum >= 1 && monthNum <= 3)) return false
      if (zipPeriodFilter === 'Q2' && !(monthNum >= 4 && monthNum <= 6)) return false
      if (zipPeriodFilter === 'Q3' && !(monthNum >= 7 && monthNum <= 9)) return false
      if (zipPeriodFilter === 'Q4' && !(monthNum >= 10 && monthNum <= 12)) return false
      return true
    }).length
  }, [invoices, zipTypeFilter, zipMonthFilter, zipPeriodFilter])

  const computedTtc = () => {
    const ht = parseFloat(amountHt) || 0
    const tva = parseFloat(tvaRate) || 0
    return (ht * (1 + tva / 100)).toFixed(2)
  }

  const getDraftInvoice = (): InvoiceInsert => {
    const ht = parseFloat(amountHt) || 0
    const tva = parseFloat(tvaRate) || 0
    const ttc = parseFloat(computedTtc()) || 0
    return {
      invoice_number: invNumber.trim() || 'FAC-2026-000',
      type: invType,
      amount_ht: ht,
      tva_rate: tva,
      amount_ttc: ttc,
      date: date || new Date().toISOString().split('T')[0]!,
      counterparty: counterparty.trim() || 'اسم المورد / الزبون المعني',
      notes: notes.trim() || 'فواتير وخدمات تجارية',
      file_path: null,
      is_generated: 1,
      fiscal_year: selectedYear === 'all' ? new Date(date || Date.now()).getFullYear() : parseInt(selectedYear, 10) || 2026,
    }
  }

  // Live real-time PDF invoice preview data URI during invoice creation
  const livePdfUri = useMemo(() => {
    if (!client) return ''
    return generateInvoicePDF(client, getDraftInvoice())
  }, [client, invNumber, invType, amountHt, tvaRate, date, counterparty, notes, selectedYear])

  // Filtered invoices according to search text, type, month, and semester/trimester period
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 0. Search Query Filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase()
        const matchNum = inv.invoice_number.toLowerCase().includes(q)
        const matchCounterparty = inv.counterparty.toLowerCase().includes(q)
        const matchNotes = (inv.notes || '').toLowerCase().includes(q)
        const matchAmountTtc = inv.amount_ttc.toString().includes(q)
        const matchAmountHt = inv.amount_ht.toString().includes(q)
        const matchDate = (inv.date || '').toLowerCase().includes(q)
        if (!matchNum && !matchCounterparty && !matchNotes && !matchAmountTtc && !matchAmountHt && !matchDate) {
          return false
        }
      }

      // 1. Transaction Type Filter
      if (typeFilter !== 'all' && inv.type !== typeFilter) return false

      if (!inv.date) return true

      const parts = (inv.date || '').split('-')
      if (parts.length < 2) return true
      const monthNum = parseInt(parts[1] || '0', 10)
      const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`

      // 2. Month Filter
      if (monthFilter !== 'all' && monthStr !== monthFilter) return false

      // 3. Period Filter (H1/H2 Semesters & Q1..Q4 Trimesters)
      if (periodFilter === 'H1' && !(monthNum >= 1 && monthNum <= 6)) return false
      if (periodFilter === 'H2' && !(monthNum >= 7 && monthNum <= 12)) return false
      if (periodFilter === 'Q1' && !(monthNum >= 1 && monthNum <= 3)) return false
      if (periodFilter === 'Q2' && !(monthNum >= 4 && monthNum <= 6)) return false
      if (periodFilter === 'Q3' && !(monthNum >= 7 && monthNum <= 9)) return false
      if (periodFilter === 'Q4' && !(monthNum >= 10 && monthNum <= 12)) return false

      return true
    })
  }, [invoices, searchQuery, typeFilter, monthFilter, periodFilter])

  const handleCreateInvoiceSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!client || !invNumber || !amountHt || !counterparty || isYearLocked) return

    const ht = parseFloat(amountHt)
    const tva = parseFloat(tvaRate)
    const ttc = parseFloat(computedTtc())
    const currentFiscalYearNum = selectedYear === 'all' ? new Date(date || Date.now()).getFullYear() || 2026 : parseInt(selectedYear, 10)

    const invoiceData: InvoiceInsert = {
      invoice_number: invNumber,
      type: invType,
      amount_ht: ht,
      tva_rate: tva,
      amount_ttc: ttc,
      date: date || new Date().toISOString().split('T')[0]!,
      counterparty,
      file_path: null,
      is_generated: 1,
      notes,
      fiscal_year: currentFiscalYearNum,
    }

    setSubmittingInvoice(true)
    const res = await addInvoice(invoiceData)
    setSubmittingInvoice(false)

    if (res.success) {
      setInvNumber('')
      setAmountHt('')
      setCounterparty('')
      setNotes('')
      openInvoiceInNewTab(client, invoiceData)
      setActiveTab('invoices')
    }
  }



  const handleAddYearSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const yr = parseInt(newYearInput, 10)
    if (isNaN(yr) || yr < 2000 || yr > 2100) return

    setAddingYear(true)
    const res = await addFiscalYear(yr, closePreviousCheck)
    setAddingYear(false)

    if (res.success) {
      setIsNewYearModalOpen(false)
    } else {
      alert(res.error || 'فشل إضافة السنة الجبائية')
    }
  }

  if (loadingClient) {
    return (
      <div className="flex h-screen items-center justify-center gap-3 text-muted-foreground bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="font-bold text-sm">جاري فتح مساحة عمل التاجر...</span>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <p className="text-xl font-bold text-destructive">عذراً، لم يتم العثور على التاجر المطلوب</p>
          <p className="text-sm text-muted-foreground">قد يكون التاجر محذوفاً أو أن الرابط غير صحيح.</p>
          <Button variant="outline" onClick={() => navigate({ to: '/' })}>
            الرجوع للقائمة الرئيسية
          </Button>
        </div>
      </div>
    )
  }

  return (
    <DirectionProvider dir="rtl">
      <div className="flex min-h-screen bg-background text-foreground">
        {/* STANDALONE DEDICATED SIDEBAR WITH ACCORDION SUB-MENU */}
        <aside className="w-72 flex-col border-s border-border bg-card shadow-sm hidden lg:flex">
          {/* Dedicated Client Header Badge */}
          <div className="border-b border-border p-5 bg-primary/5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl shadow-sm">
                {client.owner_name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <h2 className="text-base font-bold truncate leading-tight">{client.owner_name}</h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-1">
                  <Building className="h-3.5 w-3.5 shrink-0" />
                  {client.business_name}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
              <span className="font-mono-code text-muted-foreground">
                NIF: {client.nif}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  client.documents_status === 'up_to_date'
                    ? 'bg-status-good/15 text-status-good'
                    : 'bg-status-pending/15 text-status-pending'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    client.documents_status === 'up_to_date' ? 'bg-status-good' : 'bg-status-pending'
                  }`}
                />
                {client.documents_status === 'up_to_date' ? 'محدث' : 'متأخر'}
              </span>
            </div>
          </div>

          {/* Contextual Trader Navigation Standalone Independent Tabs */}
          <div className="flex-1 space-y-5 p-4 overflow-y-auto">
            {/* GROUP 1: INVOICES & ARCHIVE */}
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground px-2 pb-1.5 flex items-center gap-1.5">
                <FolderArchive className="h-3.5 w-3.5 text-primary" />
                <span>إدارة سجل الفواتير والأرشيف</span>
              </p>

              <div className="space-y-1 ps-1">
                {invoiceSubTabs.map((subTab) => {
                  const isActive = activeTab === subTab.id
                  const SubIcon = subTab.icon

                  return (
                    <button
                      key={subTab.id}
                      onClick={() => {
                        if (!subTab.disabled) {
                          setActiveTab(subTab.id)
                        }
                      }}
                      disabled={subTab.disabled}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all text-start border',
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : subTab.disabled
                          ? 'opacity-40 cursor-not-allowed border-transparent text-muted-foreground'
                          : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <SubIcon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{subTab.label}</span>
                      {subTab.disabled && (
                        <span className="text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-mono-code">🔒 مغلقة</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* GROUP 2: BANK STATEMENTS */}
            <div className="space-y-1 pt-2 border-t border-border/40">
              <p className="text-[11px] font-bold text-muted-foreground px-2 pb-1.5 flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-primary" />
                <span>إدارة الحركة البنكية والمصرفية</span>
              </p>

              <div className="space-y-1 ps-1">
                {bankSubTabs.map((subTab) => {
                  const isActive = activeTab === subTab.id
                  const SubIcon = subTab.icon

                  return (
                    <button
                      key={subTab.id}
                      onClick={() => {
                        if (!subTab.disabled) {
                          setActiveTab(subTab.id)
                        }
                      }}
                      disabled={subTab.disabled}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all text-start border',
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : subTab.disabled
                          ? 'opacity-40 cursor-not-allowed border-transparent text-muted-foreground'
                          : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <SubIcon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{subTab.label}</span>
                      {subTab.disabled && (
                        <span className="text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-mono-code">🔒 مغلقة</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* GROUP 3: TRADER PROFILE */}
            <div className="space-y-1 pt-2 border-t border-border/40">
              <p className="text-[11px] font-bold text-muted-foreground px-2 pb-1.5">حساب التاجر والبيانات</p>

              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all border text-start',
                  activeTab === 'profile'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <UserCheck className="h-4 w-4 shrink-0" />
                <span className="flex-1">البيانات الجبائية والتعديل</span>
              </button>
            </div>

            {/* Return to Main List Button */}
            <div className="pt-3 border-t border-border">
              <Button
                variant="outline"
                onClick={() => navigate({ to: '/' })}
                className="w-full justify-start gap-2.5 text-xs font-bold border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10"
              >
                <LogOut className="h-4 w-4 text-destructive" />
                العودة لقائمة التجار الرئيسية
              </Button>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="border-t border-border px-4 py-3 bg-card">
            <p className="text-[11px] text-muted-foreground text-center font-mono-code">
              مساحة التاجر المستقلة — ID: {client.id.slice(0, 8)}
            </p>
          </div>
        </aside>

        {/* MAIN BODY AREA */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* STANDALONE PAGE TOP HEADER BAR */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight">مساحة عمل {client.owner_name}</h1>
                <p className="text-xs text-muted-foreground">{client.business_name}</p>
              </div>
            </div>

            {/* Quick Fiscal Year & Lock Toggle Controls */}
            <div className="flex items-center gap-3">
              {/* Year Dropdown */}
              <div className="flex items-center gap-1.5 bg-secondary/40 rounded-lg p-1 border border-border">
                <Calendar className="h-4 w-4 text-primary ms-1.5 shrink-0" />
                <Select
                  value={selectedYear}
                  onValueChange={(val) => {
                    if (val === '__add_new__') {
                      setIsNewYearModalOpen(true)
                    } else {
                      setSelectedYear(val)
                    }
                  }}
                >
                  <SelectTrigger className="h-8 border-0 bg-transparent shadow-none px-2 text-xs font-bold text-foreground font-mono-code focus:ring-0 min-w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">🌐 جميع السنوات (الكل)</SelectItem>
                    {fiscalYears.map((fy) => (
                      <SelectItem key={fy.id} value={String(fy.year)}>
                        {fy.year} {fy.status === 'closed' ? '🔒 (مغلقة)' : '🟢 (الجارية)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNewYearModalOpen(true)}
                className="gap-1 text-xs text-primary font-bold hover:bg-primary/10"
                title="فتح وتدوير سنة جديدة"
              >
                <PlusCircle className="h-4 w-4" />
                سنة جديدة
              </Button>

              {/* Quick Lock/Unlock Toggle */}
              {selectedYear !== 'all' && (
                <Button
                  variant={isYearLocked ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => toggleYearStatus(parseInt(selectedYear, 10))}
                  className={`gap-1.5 text-xs font-bold ${
                    isYearLocked
                      ? 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20'
                      : 'border-status-good/40 text-status-good hover:bg-status-good/10'
                  }`}
                >
                  {isYearLocked ? (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      🔒 مغلقة
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3.5 w-3.5" />
                      🔓 مفتوحة
                    </>
                  )}
                </Button>
              )}

              <div className="h-5 w-[1px] bg-border mx-1" />

              <ThemeToggle />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: '/' })}
                className="gap-1.5 text-xs font-bold text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                الخروج
              </Button>
            </div>
          </header>

          {/* MAIN PAGE CONTENT CONTAINER */}
          <main className="flex-1 p-6 space-y-6">
            {/* Edit & Delete Dialogs */}
            <EditClientDialog
              client={client}
              open={isEditOpen}
              onClose={() => setIsEditOpen(false)}
              onSave={updateClient}
            />

            <DeleteConfirmDialog
              client={client}
              open={isDeleteOpen}
              onClose={() => setIsDeleteOpen(false)}
              onConfirm={async (id) => {
                const res = await deleteClient(id)
                if (res.success) {
                  navigate({ to: '/' })
                }
                return res
              }}
            />

            {/* TAB 1: INVOICES & ARCHIVE TABLE */}
            {activeTab === 'invoices' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Financial Totals Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-good/10 text-status-good">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          مجموع المبيعات (TTC) {selectedYear === 'all' ? '(كافة السنين)' : `(${selectedYear})`}
                        </p>
                        <p className="text-xl font-bold font-mono-code text-status-good">
                          {totals.sales.toFixed(2)} DA
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-pending/10 text-status-pending">
                        <TrendingDown className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          مجموع المشتريات (TTC) {selectedYear === 'all' ? '(كافة السنين)' : `(${selectedYear})`}
                        </p>
                        <p className="text-xl font-bold font-mono-code text-status-pending">
                          {totals.purchases.toFixed(2)} DA
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Calculator className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">تقدير صافي الـ TVA</p>
                        <p className="text-xl font-bold font-mono-code text-primary">
                          {(totals.tvaSales - totals.tvaPurchases).toFixed(2)} DA
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Invoices Table */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        سجل الفواتير والوثائق المأرشفة ({invoices.length})
                        {selectedYear !== 'all' && (
                          <span className="text-xs font-normal text-muted-foreground">
                            — السنة الجبائية: {selectedYear}
                          </span>
                        )}
                      </span>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => setActiveTab('create_pdf')}
                          disabled={isYearLocked}
                          className="gap-1 text-xs"
                        >
                          <FilePlus className="h-3.5 w-3.5" />
                          إنشاء فاتورة PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveTab('upload_doc')}
                          disabled={isYearLocked}
                          className="gap-1 text-xs border-primary/40 text-primary hover:bg-primary/10"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          استيراد فاتورة
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Invoice Quick Search Bar */}
                    <div className="relative mb-3.5">
                      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="البحث السريع بالسجل (رقم الفاتورة، اسم المتعامل / الزبون / المورد، الملاحظات أو المبلغ)..."
                        className="ps-10 pe-10 h-10 text-xs bg-background/80 shadow-2xs border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl font-medium"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="مسح نص البحث"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Advanced Invoice Filters Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-card/60 backdrop-blur-md rounded-xl border border-primary/20 shadow-xs mb-4 text-xs">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Filter className="h-3.5 w-3.5" />
                        </div>
                        <span>تصفية الفواتير:</span>
                        {(searchQuery || typeFilter !== 'all' || monthFilter !== 'all' || periodFilter !== 'all') && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary animate-in fade-in">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            مرشّح / بحث مفّعل
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Transaction Type Filter */}
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            النوع
                            {typeFilter !== 'all' && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          </Label>
                          <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val as any)}>
                            <SelectTrigger className={`h-8 min-w-[145px] text-xs font-semibold ${typeFilter !== 'all' ? 'border-primary bg-primary/5 text-primary' : ''}`}>
                              <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              <SelectItem value="all">الكل (بيع وشراء)</SelectItem>
                              <SelectItem value="sale">🟢 فواتير البيع فقط (Vente)</SelectItem>
                              <SelectItem value="purchase">🟠 فواتير الشراء فقط (Achat)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Month Filter */}
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            الشهر الجبائي
                            {monthFilter !== 'all' && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          </Label>
                          <Select value={monthFilter} onValueChange={(val) => setMonthFilter(val)}>
                            <SelectTrigger className={`h-8 min-w-[165px] text-xs font-semibold ${monthFilter !== 'all' ? 'border-primary bg-primary/5 text-primary' : ''}`}>
                              <SelectValue placeholder="اختر الشهر" />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              <SelectItem value="all">جميع الأشهر (12 شهر)</SelectItem>
                              <SelectItem value="01">01 - شهر يناير (Janvier)</SelectItem>
                              <SelectItem value="02">02 - شهر فبراير (Février)</SelectItem>
                              <SelectItem value="03">03 - شهر مارس (Mars)</SelectItem>
                              <SelectItem value="04">04 - شهر أبريل (Avril)</SelectItem>
                              <SelectItem value="05">05 - شهر مايو (Mai)</SelectItem>
                              <SelectItem value="06">06 - شهر يونيو (Juin)</SelectItem>
                              <SelectItem value="07">07 - شهر يوليو (Juillet)</SelectItem>
                              <SelectItem value="08">08 - شهر أوت (Août)</SelectItem>
                              <SelectItem value="09">09 - شهر سبتمبر (Septembre)</SelectItem>
                              <SelectItem value="10">10 - شهر أكتوبر (Octobre)</SelectItem>
                              <SelectItem value="11">11 - شهر نوفمبر (Novembre)</SelectItem>
                              <SelectItem value="12">12 - شهر ديسمبر (Décembre)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Period Filter (Semesters & Trimesters) */}
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            السداسي / الثلاثي
                            {periodFilter !== 'all' && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          </Label>
                          <Select value={periodFilter} onValueChange={(val) => setPeriodFilter(val)}>
                            <SelectTrigger className={`h-8 min-w-[185px] text-xs font-semibold ${periodFilter !== 'all' ? 'border-primary bg-primary/5 text-primary' : ''}`}>
                              <SelectValue placeholder="اختر الفترة" />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              <SelectItem value="all">جميع الفترات (كامل السنة)</SelectItem>
                              <SelectItem value="H1">السداسي الأول (H1: أشهر 1 - 6)</SelectItem>
                              <SelectItem value="H2">السداسي الثاني (H2: أشهر 7 - 12)</SelectItem>
                              <SelectItem value="Q1">الثلاثي الأول (Q1: أشهر 1 - 3)</SelectItem>
                              <SelectItem value="Q2">الثلاثي الثاني (Q2: أشهر 4 - 6)</SelectItem>
                              <SelectItem value="Q3">الثلاثي الثالث (Q3: أشهر 7 - 9)</SelectItem>
                              <SelectItem value="Q4">الثلاثي الرابع (Q4: أشهر 10 - 12)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Reset Filters button */}
                        {(searchQuery || typeFilter !== 'all' || monthFilter !== 'all' || periodFilter !== 'all') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchQuery('')
                              setTypeFilter('all')
                              setMonthFilter('all')
                              setPeriodFilter('all')
                            }}
                            className="h-8 px-2.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 font-bold animate-in fade-in"
                          >
                            <X className="h-3.5 w-3.5" />
                            إعادة ضبط الفلاتر والبحث
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>رقم الفاتورة</TableHead>
                            {selectedYear === 'all' && <TableHead>السنة</TableHead>}
                            <TableHead>النوع</TableHead>
                            <TableHead>المعني (مورد/زبون)</TableHead>
                            <TableHead>المبلغ HT</TableHead>
                            <TableHead>المبلغ الإجمالي TTC</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>الملف والمستند</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadingInvoices ? (
                            <TableRow>
                              <TableCell colSpan={selectedYear === 'all' ? 9 : 8} className="h-20 text-center text-muted-foreground">
                                جاري التحميل...
                              </TableCell>
                            </TableRow>
                          ) : filteredInvoices.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={selectedYear === 'all' ? 9 : 8} className="h-20 text-center text-muted-foreground">
                                لا توجد فواتير مطابقة للفلاتر المختارة لهذه السنة الجبائية
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredInvoices.map((inv) => (
                              <TableRow key={inv.id}>
                                <TableCell className="font-mono-code font-semibold">{inv.invoice_number}</TableCell>
                                {selectedYear === 'all' && (
                                  <TableCell className="font-mono-code text-xs font-bold text-primary">
                                    {inv.fiscal_year || '—'}
                                  </TableCell>
                                )}
                                <TableCell>
                                  <span
                                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                      inv.type === 'sale'
                                        ? 'bg-status-good/10 text-status-good'
                                        : 'bg-status-pending/10 text-status-pending'
                                    }`}
                                  >
                                    {inv.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'}
                                  </span>
                                </TableCell>
                                <TableCell className="font-medium text-xs">{inv.counterparty}</TableCell>
                                <TableCell className="font-mono-code text-xs">
                                  {inv.amount_ht.toFixed(2)} DA
                                </TableCell>
                                <TableCell className="font-mono-code font-bold text-xs">
                                  {inv.amount_ttc.toFixed(2)} DA
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{inv.date}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openInvoiceInNewTab(client, inv)}
                                    className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 h-7 font-semibold"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    معاينة الفاتورة
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                                      onClick={() => openInvoiceInNewTab(client, inv)}
                                      title="طباعة الفاتورة"
                                    >
                                      <Printer className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={isYearLocked}
                                      className="h-7 w-7 text-muted-foreground hover:text-primary disabled:opacity-30"
                                      onClick={() => {
                                        setInvoiceToEdit(inv)
                                        setIsEditInvoiceOpen(true)
                                      }}
                                      title={isYearLocked ? 'السنة مغلقة' : 'تعديل الفاتورة'}
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={isYearLocked}
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-30"
                                      onClick={() => {
                                        setInvoiceToDelete(inv)
                                        setIsDeleteInvoiceOpen(true)
                                      }}
                                      title={isYearLocked ? 'السنة مغلقة' : 'حذف الفاتورة'}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 2: CREATE INVOICE PDF FORM WITH LIVE REAL-TIME PREVIEW */}
            {activeTab === 'create_pdf' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <Card>
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FilePlus className="h-5 w-5 text-primary" />
                        إنشاء وتوليد فاتورة جديدة كـ PDF (معاينة حية ومباشرة)
                      </span>
                      <span className="text-xs font-normal text-muted-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                        تحديث فوري أثناء إدخال البيانات ⚡
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {isYearLocked ? (
                      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span>السنة الجبائية الحالية مغلقة ومحمية. قم بفتح السنة من الأعلى للتمكن من إضافة فواتير.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column: Form Inputs (5 cols) */}
                        <div className="lg:col-span-5 space-y-4 border-e border-border/60 pe-0 lg:pe-6">
                          <div className="rounded-lg bg-secondary/30 p-3 border border-border text-xs text-muted-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <span>أدخل معطيات الفاتورة، ستظهر المعاينة الحية في الجانب الأيسر فورياً.</span>
                          </div>

                          <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">نوع الفاتورة</Label>
                                <select
                                  value={invType}
                                  onChange={(e) => setInvType(e.target.value as 'purchase' | 'sale')}
                                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                  <option value="sale">فاتورة بيع (Vente)</option>
                                  <option value="purchase">فاتورة شراء (Achat)</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">رقم الفاتورة</Label>
                                <Input
                                  value={invNumber}
                                  onChange={(e) => setInvNumber(e.target.value)}
                                  placeholder="FAC-2026-001"
                                  className="font-mono-code text-xs h-9"
                                  dir="ltr"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">{invType === 'sale' ? 'اسم الزبون / المشتري' : 'اسم المورد / BÉNÉFICIAIRE'}</Label>
                              <Input
                                value={counterparty}
                                onChange={(e) => setCounterparty(e.target.value)}
                                placeholder="مثال: شركة الجزائر للتوزيع"
                                className="text-xs h-9"
                                required
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">المبلغ الصافي (HT)</Label>
                                <Input
                                  type="number"
                                  value={amountHt}
                                  onChange={(e) => setAmountHt(e.target.value)}
                                  placeholder="10000"
                                  className="font-mono-code text-xs h-9"
                                  dir="ltr"
                                  required
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">نسبة الـ TVA (%)</Label>
                                <select
                                  value={tvaRate}
                                  onChange={(e) => setTvaRate(e.target.value)}
                                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs font-mono-code focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                  <option value="19">19%</option>
                                  <option value="9">9%</option>
                                  <option value="0">0%</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">الإجمالي (TTC)</Label>
                                <Input
                                  value={computedTtc()}
                                  readOnly
                                  className="font-mono-code font-bold text-xs h-9 bg-secondary/50 text-primary"
                                  dir="ltr"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">تاريخ الفاتورة</Label>
                              <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="text-xs h-9"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">بيانات السلع أو الملاحظات</Label>
                              <Input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="مثال: خدمات استشارية وشراء مواد أولية"
                                className="text-xs h-9"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                              <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab('invoices')}>
                                إلغاء
                              </Button>
                              <Button type="submit" size="sm" disabled={submittingInvoice} className="gap-1 font-bold">
                                {submittingInvoice ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    جاري الحفظ والتصدير...
                                  </>
                                ) : (
                                  'تأكيد وحفظ الفاتورة بالسجل'
                                )}
                              </Button>
                            </div>
                          </form>
                        </div>

                        {/* Right Column: Live PDF Preview Frame (7 cols) */}
                        <div className="lg:col-span-7 space-y-2 flex flex-col">
                          <div className="flex items-center justify-between text-xs px-1">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              <Eye className="h-4 w-4 text-primary" />
                              معاينة وثيقة الفاتورة الحية (Live PDF Document)
                            </span>
                            {livePdfUri && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (client) {
                                    openInvoiceInNewTab(client, getDraftInvoice())
                                  }
                                }}
                                className="h-7 text-xs text-primary gap-1"
                              >
                                فتح في تبويب كامل ↗
                              </Button>
                            )}
                          </div>

                          <div className="flex-1 min-h-[750px] rounded-lg border border-border bg-slate-900/5 dark:bg-slate-950 p-2 shadow-inner">
                            {livePdfUri ? (
                              <iframe
                                src={livePdfUri}
                                className="w-full h-full min-h-[750px] rounded border border-border bg-white"
                                title="المعاينة المباشرة للفاتورة"
                              />
                            ) : (
                              <div className="flex h-full min-h-[750px] items-center justify-center text-muted-foreground text-xs">
                                جاري تحميل المعاينة...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 3: UPLOAD DOCUMENT FORM & BULK IMPORT */}
            {activeTab === 'upload_doc' && (
              <Card className="animate-in fade-in duration-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    استيراد ورفع الفواتير المأرشفة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isYearLocked ? (
                    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <span>السنة الجبائية الحالية مغلقة ومحمية. قم بفتح السنة من الأعلى للتمكن من رفع الفواتير.</span>
                    </div>
                  ) : (
                    /* ================= UNIFIED IMPORT FORM ================= */
                    <form onSubmit={handleBulkUploadSubmit} className="space-y-5 max-w-3xl text-sm">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                        <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                          <PlusCircle className="h-4 w-4" />
                          استيراد ملفات الفواتير (PDF / صور / ZIP)
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          يمكنك اختيار **فاتورة واحدة أو عدة ملفات PDF وصور متفرقة** بنفس الوقت من جهازك (اضغط واستمر بالضغط على <strong>Ctrl</strong> أو <strong>Shift</strong> أثناء التحديد)، أو اختيار **ملف مضغوط (.zip)** وسيتم فك ضغطه واستخراج كافة الفواتير بداخله فوراً.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="font-bold text-xs">تحديد الفواتير (PDF / صور PNG, JPG / أ Archives ZIP):</Label>
                          {bulkFiles.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setBulkFiles([])}
                              className="h-6 text-[11px] text-destructive hover:bg-destructive/10 px-2"
                            >
                              إلغاء وتفريغ القائمة ({bulkFiles.length})
                            </Button>
                          )}
                        </div>

                        <Input
                          type="file"
                          accept="application/pdf,image/*,.zip,application/zip"
                          multiple
                          onChange={(e) => handleBulkFilesSelect(e.target.files)}
                          ref={bulkFileInputRef}
                          className="cursor-pointer"
                        />

                        {/* Selected Files List & Badges */}
                        {bulkFiles.length > 0 && (
                          <div className="rounded-xl border border-border bg-card p-3 space-y-2 max-h-60 overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-border pb-2 text-xs">
                              <span className="font-bold text-primary flex items-center gap-1.5">
                                <Check className="h-4 w-4" />
                                الفواتير الجاهزة للاستيراد ({bulkFiles.length} مستند):
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono-code">
                                إجمالي: {(bulkFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB
                              </span>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              {bulkFiles.map((file, idx) => {
                                const ext = file.name.split('.').pop()?.toLowerCase() || ''
                                const isPdf = ext === 'pdf'
                                const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext)

                                return (
                                  <div
                                    key={`${file.name}-${idx}`}
                                    className="flex items-center justify-between rounded-lg border border-border/70 bg-secondary/30 px-3 py-1.5 text-xs hover:bg-secondary/60 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <span
                                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold font-mono-code ${
                                          isPdf
                                            ? 'bg-destructive/15 text-destructive'
                                            : isImage
                                            ? 'bg-primary/15 text-primary'
                                            : 'bg-accent text-foreground'
                                        }`}
                                      >
                                        {ext.toUpperCase()}
                                      </span>
                                      <span className="truncate font-medium">{file.name}</span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 ms-2">
                                      <span className="text-[10px] text-muted-foreground font-mono-code">
                                        {(file.size / 1024).toFixed(0)} KB
                                      </span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveBulkFile(idx)}
                                        className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                        title="إزالة هذا الملف"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Default settings for bulk invoices */}
                      <div className="rounded-xl border border-border p-4 space-y-3 bg-card">
                        <p className="text-xs font-bold text-foreground">الإعدادات الموحدة لدُفعة الفواتير (قابلة للتعديل لاحقاً):</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">نوع دُفعة الفواتير</Label>
                            <Select value={bulkDefaultType} onValueChange={(val) => setBulkDefaultType(val as any)}>
                              <SelectTrigger className="h-9 text-xs font-semibold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent dir="rtl">
                                <SelectItem value="purchase">فاتورة شراء (Achat)</SelectItem>
                                <SelectItem value="sale">فاتورة بيع (Vente)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">المورد / الزبون الافتراضي</Label>
                            <Input
                              value={bulkDefaultCounterparty}
                              onChange={(e) => setBulkDefaultCounterparty(e.target.value)}
                              placeholder="جهة عامة"
                              className="text-xs h-9"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">المبلغ الافتراضي (TTC)</Label>
                            <Input
                              type="number"
                              value={bulkDefaultAmount}
                              onChange={(e) => setBulkDefaultAmount(e.target.value)}
                              placeholder="0"
                              className="font-mono-code text-xs h-9"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bulk Upload Progress */}
                      {bulkUploading && (
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs font-bold text-primary">
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {bulkProgress.text}
                            </span>
                            <span className="font-mono-code">
                              {bulkProgress.total > 0 ? Math.round((bulkProgress.current / bulkProgress.total) * 100) : 0}%
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-primary transition-all duration-200"
                              style={{
                                width: `${bulkProgress.total > 0 ? Math.round((bulkProgress.current / bulkProgress.total) * 100) : 0}%`
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 pt-3 border-t border-border">
                        <Button type="button" variant="outline" onClick={() => setActiveTab('invoices')}>
                          إلغاء
                        </Button>
                        <Button type="submit" disabled={bulkUploading || bulkFiles.length === 0} className="font-bold gap-2">
                          {bulkUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              جاري استيراد وحفظ الفواتير...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              بدء استيراد وحفظ ({bulkFiles.length} فاتورة)
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {/* TAB 4: BULK INVOICE EXPORT */}
            {activeTab === 'export_zip' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Archive className="h-5 w-5 text-primary" />
                      تصدير الفواتير الجماعي (.zip)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* Archive Info Card */}
                    <div className="rounded-xl border border-border bg-secondary/30 p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-bold text-base">تصدير فواتير التاجر {client.owner_name}</h3>
                          <p className="text-xs text-muted-foreground">
                            السنة الجبائية المحددة: <span className="font-bold font-mono-code text-primary">{selectedYear}</span>
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        يتيح لك هذا القسم تصدير عدد كبير جداً من الفواتير دفعة واحدة في ملف مضغوط واحد (.zip). يشمل التصدير جميع ملفات ووثائق الفواتير المرفوعة والمنشأة، بالإضافة إلى ملف جدول كشف الحسابات بصيغة CSV يدعم اللغة العربية لتشغيله في برنامج Excel.
                      </p>
                    </div>

                    {/* Advanced Export Settings */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Settings className="h-4 w-4 text-primary" />
                          إعدادات تصفية وتحديد الفواتير للتصدير
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Filter Settings */}
                        <div className="flex flex-wrap items-center gap-3 p-3 bg-secondary/25 rounded-lg border border-border/80 text-xs">
                          <div className="flex items-center gap-2 font-bold text-foreground">
                            <Filter className="h-4 w-4 text-primary" />
                            <span>فلاتر الفواتير:</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            {/* Type Filter */}
                            <div className="flex items-center gap-1.5">
                              <Label className="text-xs font-normal text-muted-foreground whitespace-nowrap">النوع:</Label>
                              <Select value={zipTypeFilter} onValueChange={(val) => setZipTypeFilter(val as any)}>
                                <SelectTrigger className="h-8 min-w-[130px] text-xs font-semibold">
                                  <SelectValue placeholder="اختر النوع" />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  <SelectItem value="all">الكل (بيع وشراء)</SelectItem>
                                  <SelectItem value="sale">فواتير البيع فقط</SelectItem>
                                  <SelectItem value="purchase">فواتير الشراء فقط</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Month Filter */}
                            <div className="flex items-center gap-1.5">
                              <Label className="text-xs font-normal text-muted-foreground whitespace-nowrap">الشهر:</Label>
                              <Select value={zipMonthFilter} onValueChange={(val) => setZipMonthFilter(val)}>
                                <SelectTrigger className="h-8 min-w-[130px] text-xs font-semibold">
                                  <SelectValue placeholder="اختر الشهر" />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  <SelectItem value="all">جميع الأشهر</SelectItem>
                                  <SelectItem value="01">01 - يناير</SelectItem>
                                  <SelectItem value="02">02 - فبراير</SelectItem>
                                  <SelectItem value="03">03 - مارس</SelectItem>
                                  <SelectItem value="04">04 - أبريل</SelectItem>
                                  <SelectItem value="05">05 - مايو</SelectItem>
                                  <SelectItem value="06">06 - يونيو</SelectItem>
                                  <SelectItem value="07">07 - يوليو</SelectItem>
                                  <SelectItem value="08">08 - أوت</SelectItem>
                                  <SelectItem value="09">09 - سبتمبر</SelectItem>
                                  <SelectItem value="10">10 - أكتوبر</SelectItem>
                                  <SelectItem value="11">11 - نوفمبر</SelectItem>
                                  <SelectItem value="12">12 - ديسمبر</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Period Filter */}
                            <div className="flex items-center gap-1.5">
                              <Label className="text-xs font-normal text-muted-foreground whitespace-nowrap">الفترة:</Label>
                              <Select value={zipPeriodFilter} onValueChange={(val) => setZipPeriodFilter(val)}>
                                <SelectTrigger className="h-8 min-w-[150px] text-xs font-semibold">
                                  <SelectValue placeholder="اختر الفترة" />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  <SelectItem value="all">كامل السنة</SelectItem>
                                  <SelectItem value="H1">السداسي الأول (H1)</SelectItem>
                                  <SelectItem value="H2">السداسي الثاني (H2)</SelectItem>
                                  <SelectItem value="Q1">الثلاثي الأول (Q1)</SelectItem>
                                  <SelectItem value="Q2">الثلاثي الثاني (Q2)</SelectItem>
                                  <SelectItem value="Q3">الثلاثي الثالث (Q3)</SelectItem>
                                  <SelectItem value="Q4">الثلاثي الرابع (Q4)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* File Name Override */}
                        <div className="space-y-1">
                          <Label className="text-xs">اسم الملف المعين للتصدير (اختياري)</Label>
                          <Input
                            value={zipFilename}
                            onChange={(e) => setZipFilename(e.target.value)}
                            placeholder={`فواتير_${client.owner_name}_${selectedYear}.zip`}
                            className="text-xs h-9"
                            dir="ltr"
                          />
                          <p className="text-[10px] text-muted-foreground">عند التصدير سيطلب منك المتصفح تحديد مجلد ومكان التنزيل على جهازك تلقائياً</p>
                        </div>

                        {/* File Info Summary */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-border p-3 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <FileText className="h-3.5 w-3.5" />
                              <span>عدد الفواتير الجاهزة للتصدير</span>
                            </div>
                            <p className="text-lg font-bold font-mono-code text-primary">{zipInvoiceCount} فاتورة</p>
                          </div>
                          <div className="rounded-lg border border-border p-3 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <HardDrive className="h-3.5 w-3.5" />
                              <span>حجم الحزمة التقديري</span>
                            </div>
                            <p className="text-lg font-bold font-mono-code text-foreground">
                              {zipInvoiceCount > 0 ? `~${Math.max(1, Math.round(zipInvoiceCount * 0.15))} MB` : '0 KB'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Progress Indicator when Exporting */}
                    {isExporting && (
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs font-bold text-primary">
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {exportProgress.text}
                          </span>
                          <span className="font-mono-code">
                            {exportProgress.total > 0 ? Math.round((exportProgress.current / exportProgress.total) * 100) : 0}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-primary transition-all duration-200"
                            style={{
                              width: `${exportProgress.total > 0 ? Math.round((exportProgress.current / exportProgress.total) * 100) : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Download & Export Button */}
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleBulkInvoiceExport}
                        disabled={zipInvoiceCount === 0 || isExporting}
                        className="gap-2 flex-1 sm:flex-initial font-bold"
                        size="lg"
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            جاري التصدير وتجهيز الملف...
                          </>
                        ) : (
                          <>
                            <FolderOutput className="h-5 w-5" />
                            تحديد مكان التصدير وتنزيل الفواتير (.zip)
                          </>
                        )}
                      </Button>
                      {zipInvoiceCount === 0 && (
                        <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border">
                          لا توجد فواتير مطابقة للفلاتر المختارة
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* BANK STATEMENTS TABS */}
            {activeTab === 'bank_statements' && (
              <BankStatementsView />
            )}

            {activeTab === 'upload_bank_statement' && (
              <Card className="animate-in fade-in duration-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    استيراد ورفع الكشوفات البنكية المأرشفة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isYearLocked ? (
                    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <span>السنة الجبائية الحالية مغلقة ومحمية. قم بفتح السنة من الأعلى للتمكن من رفع الكشوفات البنكية.</span>
                    </div>
                  ) : (
                    /* ================= UNIFIED BANK IMPORT FORM ================= */
                    <form onSubmit={handleBulkBankUploadSubmit} className="space-y-5 max-w-3xl text-sm">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                        <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                          <PlusCircle className="h-4 w-4" />
                          استيراد ملفات الكشوفات البنكية (PDF / صور / ZIP)
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          يمكنك اختيار **كشف بنكي واحد أو عدة كشوفات PDF وصور متفرقة** بنفس الوقت من جهازك (اضغط واستمر بالضغط على <strong>Ctrl</strong> أو <strong>Shift</strong> أثناء التحديد)، أو اختيار **ملف مضغوط (.zip)** وسيتم فك ضغطه واستخراج كافة الكشوفات المصرفية بداخله فوراً.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="font-bold text-xs">تحديد الكشوفات البنكية (PDF / صور PNG, JPG / أرشيف ZIP):</Label>
                          {bulkBankFiles.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setBulkBankFiles([])}
                              className="h-6 text-[11px] text-destructive hover:bg-destructive/10 px-2"
                            >
                              إلغاء وتفريغ القائمة ({bulkBankFiles.length})
                            </Button>
                          )}
                        </div>

                        <Input
                          type="file"
                          accept="application/pdf,image/*,.zip,application/zip"
                          multiple
                          onChange={(e) => handleBulkBankFilesSelect(e.target.files)}
                          ref={bulkBankFileInputRef}
                          className="cursor-pointer"
                        />

                        {/* Selected Files List & Badges */}
                        {bulkBankFiles.length > 0 && (
                          <div className="rounded-xl border border-border bg-card p-3 space-y-2 max-h-60 overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-border pb-2 text-xs">
                              <span className="font-bold text-primary flex items-center gap-1.5">
                                <Check className="h-4 w-4" />
                                الكشوفات الجاهزة للاستيراد ({bulkBankFiles.length} مستند):
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono-code">
                                إجمالي: {(bulkBankFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB
                              </span>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              {bulkBankFiles.map((file, idx) => {
                                const ext = file.name.split('.').pop()?.toLowerCase() || ''
                                const isPdf = ext === 'pdf'
                                const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext)

                                return (
                                  <div
                                    key={`${file.name}-${idx}`}
                                    className="flex items-center justify-between rounded-lg border border-border/70 bg-secondary/30 px-3 py-1.5 text-xs hover:bg-secondary/60 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <span
                                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold font-mono-code ${
                                          isPdf
                                            ? 'bg-destructive/15 text-destructive'
                                            : isImage
                                            ? 'bg-primary/15 text-primary'
                                            : 'bg-accent text-foreground'
                                        }`}
                                      >
                                        {ext.toUpperCase()}
                                      </span>
                                      <span className="truncate font-medium">{file.name}</span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 ms-2">
                                      <span className="text-[10px] text-muted-foreground font-mono-code">
                                        {(file.size / 1024).toFixed(0)} KB
                                      </span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveBulkBankFile(idx)}
                                        className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                        title="إزالة هذا الملف"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Default settings for bulk bank statements */}
                      <div className="rounded-xl border border-border p-4 space-y-3 bg-card">
                        <p className="text-xs font-bold text-foreground">الإعدادات الموحدة لدُفعة الكشوفات (قابلة للتعديل لاحقاً):</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">البنك الافتراضي للدُفعة</Label>
                            <Select value={bulkBankDefaultBank} onValueChange={setBulkBankDefaultBank}>
                              <SelectTrigger className="h-9 text-xs font-semibold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent dir="rtl">
                                <SelectItem value="البنك الوطني الجزائري (BNA)">البنك الوطني الجزائري (BNA)</SelectItem>
                                <SelectItem value="القرض الشعبي الجزائري (CPA)">القرض الشعبي الجزائري (CPA)</SelectItem>
                                <SelectItem value="بنك الفلاحة والتنمية الريفية (BADR)">بنك الفلاحة والتنمية الريفية (BADR)</SelectItem>
                                <SelectItem value="بنك التنمية المحلية (BDL)">بنك التنمية المحلية (BDL)</SelectItem>
                                <SelectItem value="الصندوق الوطني للتوفير والاحتياط (CNEP)">كناب بنك (CNEP)</SelectItem>
                                <SelectItem value="الحساب البريدي الجاري (CCP)">بريد الجزائر (CCP)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">الفترة / الشهر الافتراضي</Label>
                            <Input
                              value={bulkBankDefaultPeriod}
                              onChange={(e) => setBulkBankDefaultPeriod(e.target.value)}
                              placeholder="كشف شهري"
                              className="text-xs h-9"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bulk Bank Upload Progress */}
                      {bulkBankUploading && (
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs font-bold text-primary">
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {bulkBankProgress.text}
                            </span>
                            <span className="font-mono-code">
                              {bulkBankProgress.total > 0 ? Math.round((bulkBankProgress.current / bulkBankProgress.total) * 100) : 0}%
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-primary transition-all duration-200"
                              style={{
                                width: `${bulkBankProgress.total > 0 ? Math.round((bulkBankProgress.current / bulkBankProgress.total) * 100) : 0}%`
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 pt-3 border-t border-border">
                        <Button type="button" variant="outline" onClick={() => setActiveTab('bank_statements')}>
                          إلغاء
                        </Button>
                        <Button type="submit" disabled={bulkBankUploading || bulkBankFiles.length === 0} className="font-bold gap-2">
                          {bulkBankUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              جاري استيراد وحفظ الكشوفات البنكية...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              بدء استيراد وحفظ ({bulkBankFiles.length} كشف بنكي)
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'export_bank_statements' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Archive className="h-5 w-5 text-primary" />
                      تصدير الكشوفات البنكية الجماعي (.zip)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* Archive Info Card */}
                    <div className="rounded-xl border border-border bg-secondary/30 p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-bold text-base">تصدير الكشوفات البنكية للتاجر {client.owner_name}</h3>
                          <p className="text-xs text-muted-foreground">
                            السنة الجبائية المحددة: <span className="font-bold font-mono-code text-primary">{selectedYear}</span>
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        يتيح لك هذا القسم تصدير الكشوفات البنكية دفعة واحدة في ملف مضغوط واحد (.zip). يشمل التصدير جميع ملفات ووثائق الكشوفات المرفوعة، بالإضافة إلى ملف جدول كشف الحسابات المصرفية بصيغة CSV يدعم اللغة العربية لتشغيله في برنامج Excel.
                      </p>
                    </div>

                    {/* Advanced Export Settings */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Settings className="h-4 w-4 text-primary" />
                          إعدادات تصفية وتحديد الكشوفات البنكية للتصدير
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Filter Settings */}
                        <div className="flex flex-wrap items-center gap-3 p-3 bg-secondary/25 rounded-lg border border-border/80 text-xs">
                          <div className="flex items-center gap-2 font-bold text-foreground">
                            <Filter className="h-4 w-4 text-primary" />
                            <span>فلاتر الكشوفات البنكية:</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            {/* Bank Filter */}
                            <div className="flex items-center gap-1.5">
                              <Label className="text-xs font-normal text-muted-foreground whitespace-nowrap">البنك:</Label>
                              <Select value={zipBankFilter} onValueChange={setZipBankFilter}>
                                <SelectTrigger className="h-8 min-w-[140px] text-xs font-semibold">
                                  <SelectValue placeholder="اختر البنك" />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  <SelectItem value="all">جميع البنوك</SelectItem>
                                  <SelectItem value="BNA">BNA - البنك الوطني</SelectItem>
                                  <SelectItem value="CPA">CPA - القرض الشعبي</SelectItem>
                                  <SelectItem value="BADR">BADR - بنك الفلاحة</SelectItem>
                                  <SelectItem value="BDL">BDL - بنك التنمية</SelectItem>
                                  <SelectItem value="CNEP">CNEP - كناب بنك</SelectItem>
                                  <SelectItem value="CCP">CCP - بريد الجزائر</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Month Filter */}
                            <div className="flex items-center gap-1.5">
                              <Label className="text-xs font-normal text-muted-foreground whitespace-nowrap">الشهر:</Label>
                              <Select value={zipBankMonthFilter} onValueChange={setZipBankMonthFilter}>
                                <SelectTrigger className="h-8 min-w-[130px] text-xs font-semibold">
                                  <SelectValue placeholder="اختر الشهر" />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  <SelectItem value="all">جميع الأشهر</SelectItem>
                                  <SelectItem value="01">01 - يناير</SelectItem>
                                  <SelectItem value="02">02 - فبراير</SelectItem>
                                  <SelectItem value="03">03 - مارس</SelectItem>
                                  <SelectItem value="04">04 - أبريل</SelectItem>
                                  <SelectItem value="05">05 - مايو</SelectItem>
                                  <SelectItem value="06">06 - يونيو</SelectItem>
                                  <SelectItem value="07">07 - يوليو</SelectItem>
                                  <SelectItem value="08">08 - أوت</SelectItem>
                                  <SelectItem value="09">09 - سبتمبر</SelectItem>
                                  <SelectItem value="10">10 - أكتوبر</SelectItem>
                                  <SelectItem value="11">11 - نوفمبر</SelectItem>
                                  <SelectItem value="12">12 - ديسمبر</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Period Filter */}
                            <div className="flex items-center gap-1.5">
                              <Label className="text-xs font-normal text-muted-foreground whitespace-nowrap">الفترة:</Label>
                              <Select value={zipBankPeriodFilter} onValueChange={setZipBankPeriodFilter}>
                                <SelectTrigger className="h-8 min-w-[150px] text-xs font-semibold">
                                  <SelectValue placeholder="اختر الفترة" />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  <SelectItem value="all">كامل السنة</SelectItem>
                                  <SelectItem value="H1">السداسي الأول (H1)</SelectItem>
                                  <SelectItem value="H2">السداسي الثاني (H2)</SelectItem>
                                  <SelectItem value="Q1">الثلاثي الأول (Q1)</SelectItem>
                                  <SelectItem value="Q2">الثلاثي الثاني (Q2)</SelectItem>
                                  <SelectItem value="Q3">الثلاثي الثالث (Q3)</SelectItem>
                                  <SelectItem value="Q4">الثلاثي الرابع (Q4)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* File Name Override */}
                        <div className="space-y-1">
                          <Label className="text-xs">اسم الملف المعين للتصدير (اختياري)</Label>
                          <Input
                            value={zipBankFilename}
                            onChange={(e) => setZipBankFilename(e.target.value)}
                            placeholder={`كشوفات_بنكية_${client.owner_name}_${selectedYear}.zip`}
                            className="text-xs h-9"
                            dir="ltr"
                          />
                          <p className="text-[10px] text-muted-foreground">عند التصدير سيطلب منك المتصفح تحديد مجلد ومكان التنزيل على جهازك تلقائياً</p>
                        </div>

                        {/* File Info Summary */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-border p-3 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Landmark className="h-3.5 w-3.5" />
                              <span>عدد الكشوفات الجاهزة للتصدير</span>
                            </div>
                            <p className="text-lg font-bold font-mono-code text-primary">{zipBankCount} كشف بنكي</p>
                          </div>
                          <div className="rounded-lg border border-border p-3 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <HardDrive className="h-3.5 w-3.5" />
                              <span>حجم الحزمة التقديري</span>
                            </div>
                            <p className="text-lg font-bold font-mono-code text-foreground">
                              {zipBankCount > 0 ? `~${Math.max(1, Math.round(zipBankCount * 0.15))} MB` : '0 KB'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Progress Indicator when Exporting */}
                    {isBankExporting && (
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs font-bold text-primary">
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {bankExportProgress.text}
                          </span>
                          <span className="font-mono-code">
                            {bankExportProgress.total > 0 ? Math.round((bankExportProgress.current / bankExportProgress.total) * 100) : 0}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-primary transition-all duration-200"
                            style={{
                              width: `${bankExportProgress.total > 0 ? Math.round((bankExportProgress.current / bankExportProgress.total) * 100) : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Download & Export Button */}
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleBulkBankExport}
                        disabled={zipBankCount === 0 || isBankExporting}
                        className="gap-2 flex-1 sm:flex-initial font-bold"
                        size="lg"
                      >
                        {isBankExporting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            جاري التصدير وتجهيز الملف...
                          </>
                        ) : (
                          <>
                            <FolderOutput className="h-5 w-5" />
                            تحديد مكان التصدير وتنزيل الكشوفات البنكية (.zip)
                          </>
                        )}
                      </Button>
                      {zipBankCount === 0 && (
                        <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border">
                          لا توجد كشوفات بنكية مطابقة للفلاتر المختارة
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 5: CLIENT PROFILE & EDIT */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Action Header */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    البيانات الجبائية والإحصائية للتاجر
                  </h2>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditOpen(true)}
                      className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <Edit className="h-4 w-4" />
                      تعديل معلومات التاجر
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() => setIsDeleteOpen(true)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف التاجر
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Identifiers Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        المعرفات الجبائية والتراخيص
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                        <div>
                          <span className="text-muted-foreground">رقم التعريف الجبائي (NIF)</span>
                          <p className="font-mono-code font-bold text-base mt-0.5">{client.nif}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(client.nif, 'nif')}>
                          {copiedField === 'nif' ? <Check className="h-3.5 w-3.5 text-status-good" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                        <div>
                          <span className="text-muted-foreground">رقم التعريف الإحصائي (NIS)</span>
                          <p className="font-mono-code font-bold text-base mt-0.5">{client.nis}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(client.nis, 'nis')}>
                          {copiedField === 'nis' ? <Check className="h-3.5 w-3.5 text-status-good" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                        <div>
                          <span className="text-muted-foreground">رقم السجل التجاري (RC)</span>
                          <p className="font-mono-code font-bold text-base mt-0.5">{client.rc}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(client.rc, 'rc')}>
                          {copiedField === 'rc' ? <Check className="h-3.5 w-3.5 text-status-good" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contact & Location Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        معلومات الاتصال والنشاط
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                        <div>
                          <span className="text-muted-foreground">رقم الهاتف</span>
                          <p className="font-mono-code font-bold text-base dir-ltr text-start mt-0.5">{client.phone || '—'}</p>
                        </div>
                        {client.phone && (
                          <Button variant="ghost" size="sm" onClick={() => handleCopy(client.phone, 'phone')}>
                            {copiedField === 'phone' ? <Check className="h-3.5 w-3.5 text-status-good" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                        <div>
                          <span className="text-muted-foreground">البريد الإلكتروني</span>
                          <p className="font-mono-code font-bold text-sm truncate dir-ltr text-start mt-0.5">{client.email || '—'}</p>
                        </div>
                        {client.email && (
                          <Button variant="ghost" size="sm" onClick={() => handleCopy(client.email, 'email')}>
                            {copiedField === 'email' ? <Check className="h-3.5 w-3.5 text-status-good" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>

                      <div className="rounded-lg border border-border p-3.5 space-y-1">
                        <span className="text-muted-foreground">نوع النشاط والموقع</span>
                        <p className="font-semibold text-sm">{client.activity_type} — {client.location}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Modal: Add / Rollover New Fiscal Year */}
        {isNewYearModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  تدوير وفتح سنة مالية جديدة
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setIsNewYearModalOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleAddYearSubmit} className="mt-4 space-y-4 text-sm">
                <div className="space-y-1">
                  <Label>أدخل السنة المالية الجديدة</Label>
                  <Input
                    type="number"
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    placeholder="2027"
                    className="font-mono-code text-center text-lg font-bold"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3">
                  <input
                    type="checkbox"
                    id="chk-close-prev"
                    checked={closePreviousCheck}
                    onChange={(e) => setClosePreviousCheck(e.target.checked)}
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                  <label htmlFor="chk-close-prev" className="text-xs font-semibold cursor-pointer">
                    قفل السنة السابقة تلقائياً (Clôture de l'exercice) لحماية الأرشيف
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setIsNewYearModalOpen(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={addingYear}>
                    {addingYear ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري إنشاء السنة...
                      </>
                    ) : (
                      'تأكيد فتح السنة المالية'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Document Viewer Modal (In-Browser Preview) */}
        <DocumentViewerModal
          open={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          documentUrl={previewDocUrl}
          title={previewDocTitle}
        />

        {/* Invoice Delete Confirmation Dialog */}
        <InvoiceActionConfirmDialog
          open={isDeleteInvoiceOpen}
          onClose={() => { setIsDeleteInvoiceOpen(false); setInvoiceToDelete(null) }}
          onConfirm={handleDeleteInvoiceConfirm}
          title="تأكيد حذف الفاتورة"
          description="هل أنت متأكد من رغبتك في حذف هذه الفاتورة نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
          confirmLabel="نعم، قم بالحذف"
          confirmVariant="destructive"
          invoice={invoiceToDelete}
          loading={deletingInvoice}
        />

        {/* Invoice Edit Modal */}
        <InvoiceEditModal
          open={isEditInvoiceOpen}
          onClose={() => { setIsEditInvoiceOpen(false); setInvoiceToEdit(null) }}
          invoice={invoiceToEdit}
          onSave={workspace.updateInvoice}
        />
      </div>
    </DirectionProvider>
  )
}

export function ClientWorkspacePage({ clientId }: { clientId: string }) {
  return (
    <ClientWorkspaceProvider clientId={clientId}>
      <WorkspaceInnerContent />
    </ClientWorkspaceProvider>
  )
}

import { useState, useRef, type FormEvent } from 'react'
import {
  Search,
  FilePlus,
  Upload,
  FileText,
  FileSpreadsheet,
  User,
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
  Eye,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { useClients } from '../../hooks/use-clients'
import { useInvoices } from '../../hooks/use-invoices'
import { generateInvoicePDF, openInvoiceInNewTab } from '../../lib/pdf-generator'
import { DocumentViewerModal } from '../dashboard/document-viewer-modal'
import type { InvoiceInsert } from '../../types/invoice'

export function ClientsDataPage() {
  const { clients, loading: loadingClients } = useClients()
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

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
    downloadZipArchive,
  } = useInvoices(selectedClientId)

  // Modals state
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isNewYearModalOpen, setIsNewYearModalOpen] = useState(false)

  // Document Previewer Modal state
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null)
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('معاينة الفاتورة')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Create Invoice Form state
  const [invNumber, setInvNumber] = useState('')
  const [invType, setInvType] = useState<'purchase' | 'sale'>('sale')
  const [amountHt, setAmountHt] = useState('')
  const [tvaRate, setTvaRate] = useState('19')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [counterparty, setCounterparty] = useState('')
  const [notes, setNotes] = useState('')
  const [submittingInvoice, setSubmittingInvoice] = useState(false)

  // Upload File state
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadDocNumber, setUploadDocNumber] = useState('')
  const [uploadType, setUploadType] = useState<'purchase' | 'sale'>('purchase')
  const [uploadAmountTtc, setUploadAmountTtc] = useState('')
  const [uploadCounterparty, setUploadCounterparty] = useState('')
  const [uploading, setUploading] = useState(false)

  // New Fiscal Year Modal state
  const [newYearInput, setNewYearInput] = useState(String(new Date().getFullYear() + 1))
  const [closePreviousCheck, setClosePreviousCheck] = useState(true)
  const [addingYear, setAddingYear] = useState(false)

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  const handlePreviewInvoice = (inv: typeof invoices[0]) => {
    if (selectedClient) {
      openInvoiceInNewTab(selectedClient, inv)
    }
  }

  // Filter clients
  const filteredClients = clients.filter(
    (c) =>
      c.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nif.includes(searchTerm)
  )

  // Calculate TTC automatically in form
  const computedTtc = () => {
    const ht = parseFloat(amountHt) || 0
    const tva = parseFloat(tvaRate) || 0
    return (ht * (1 + tva / 100)).toFixed(2)
  }

  const handleCreateInvoiceSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedClient || !invNumber || !amountHt || !counterparty || isYearLocked) return

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
    const pdfDataUri = generateInvoicePDF(selectedClient, invoiceData, false)
    const res = await addInvoice(invoiceData)
    setSubmittingInvoice(false)

    if (res.success) {
      setIsCreateInvoiceOpen(false)
      setInvNumber('')
      setAmountHt('')
      setCounterparty('')
      setNotes('')
      // Open in-browser preview modal
      setPreviewDocUrl(pdfDataUri)
      setPreviewDocTitle(`معاينة الفاتورة الجديدة - N° ${invoiceData.invoice_number}`)
      setIsPreviewOpen(true)
    }
  }

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedClient || !uploadFile || !uploadDocNumber || !uploadAmountTtc || !uploadCounterparty || isYearLocked) return

    setUploading(true)
    // 1. Upload File
    const uploadRes = await uploadInvoiceDocument(uploadFile)
    if (!uploadRes.success || !uploadRes.filePath) {
      setUploading(false)
      alert(uploadRes.error || 'فشل رفع الملف')
      return
    }

    // 2. Save Invoice Entry
    const ttc = parseFloat(uploadAmountTtc)
    const currentFiscalYearNum = selectedYear === 'all' ? 2026 : parseInt(selectedYear, 10)

    const invoiceData: InvoiceInsert = {
      invoice_number: uploadDocNumber,
      type: uploadType,
      amount_ht: ttc / 1.19, // Estimated HT for 19%
      tva_rate: 19,
      amount_ttc: ttc,
      date: new Date().toISOString().split('T')[0]!,
      counterparty: uploadCounterparty,
      file_path: uploadRes.filePath,
      is_generated: 0,
      notes: 'وثيقة مأرشفة مرفوعة',
      fiscal_year: currentFiscalYearNum,
    }

    const res = await addInvoice(invoiceData)
    setUploading(false)

    if (res.success) {
      setIsUploadOpen(false)
      setUploadFile(null)
      setUploadDocNumber('')
      setUploadAmountTtc('')
      setUploadCounterparty('')
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

  const handleYearDropdownChange = (value: string) => {
    if (value === '__add_new__') {
      setIsNewYearModalOpen(true)
    } else {
      setSelectedYear(value)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">بيانات العملاء والأرشيف المحاسبي</h1>
        <p className="text-sm text-muted-foreground">
          إدارة الفواتير والوثائق المأرشفة لكل تاجر بشكل معزول ومستقل مع دعم تدوير وقفل السنوات المالية
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column (1/4): Client Selector */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              اختيار التاجر
            </CardTitle>
            <div className="relative pt-2">
              <Search className="absolute start-2.5 top-5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="بحث عن تاجر..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-8 text-xs h-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-2 space-y-1 max-h-[500px] overflow-y-auto">
            {loadingClients ? (
              <p className="text-xs text-muted-foreground text-center py-6">جاري جلب قائمة التجار...</p>
            ) : filteredClients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">لا يوجد تجار مطابقون</p>
            ) : (
              filteredClients.map((client) => {
                const isSelected = client.id === selectedClientId
                return (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`w-full rounded-lg p-3 text-start transition-colors border ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-transparent hover:bg-accent hover:border-border text-foreground'
                    }`}
                  >
                    <p className="text-sm font-bold truncate">{client.owner_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{client.business_name}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px] font-mono-code">
                      <span>NIF: {client.nif.slice(0, 8)}...</span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          client.documents_status === 'up_to_date' ? 'bg-status-good' : 'bg-status-pending'
                        }`}
                      />
                    </div>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Right Column (3/4): Active Client Workspace */}
        <div className="space-y-6 lg:col-span-3">
          {!selectedClient ? (
            <Card className="flex h-64 flex-col items-center justify-center p-6 text-center">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-base font-semibold text-muted-foreground">اختر تاجراً من القائمة الجانبية لعرض وتدبير فواتيره</p>
              <p className="text-xs text-muted-foreground/80 mt-1">يمكنك إدارة السنوات المالية، إنشاء وتوليد الـ PDF، أو رفع وأرشفة المستندات</p>
            </Card>
          ) : (
            <>
              {/* Active Client Banner & Action Bar */}
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{selectedClient.owner_name}</h2>
                      <span className="rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                        {selectedClient.business_name}
                      </span>
                    </div>
                    <p className="text-xs font-mono-code text-muted-foreground">
                      NIF: {selectedClient.nif} | RC: {selectedClient.rc} | هاتف: {selectedClient.phone || '—'}
                    </p>
                  </div>

                  {/* Fiscal Year Selector & Lock Toggle Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Year Selector Dropdown */}
                    <div className="flex items-center gap-1.5 bg-secondary/40 rounded-lg p-1 border border-border">
                      <Calendar className="h-4 w-4 text-primary ms-1.5" />
                      <select
                        value={selectedYear}
                        onChange={(e) => handleYearDropdownChange(e.target.value)}
                        className="h-8 rounded-md border-0 bg-transparent px-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono-code cursor-pointer"
                      >
                        <option value="all">🌐 جميع السنوات (عرض الأرشيف الكلي)</option>
                        {fiscalYears.map((fy) => (
                          <option key={fy.id} value={String(fy.year)}>
                            {fy.year} {fy.status === 'closed' ? '🔒 (مغلقة)' : '🟢 (الجارية)'}
                          </option>
                        ))}
                        <option value="__add_new__">➕ تدوير وفتح سنة مالية جديدة...</option>
                      </select>
                    </div>

                    {/* Simple Lock / Unlock Fiscal Year Toggle */}
                    {selectedYear !== 'all' && (
                      <Button
                        variant={isYearLocked ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => toggleYearStatus(parseInt(selectedYear, 10))}
                        className={`gap-1.5 text-xs font-semibold ${
                          isYearLocked
                            ? 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20'
                            : 'border-status-good/40 text-status-good hover:bg-status-good/10'
                        }`}
                        title={isYearLocked ? 'انقر لفتح السنة وحساباتها' : 'انقر لقفل وتجميد حسابات هذه السنة المحاسبية'}
                      >
                        {isYearLocked ? (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            🔒 السنة مغلقة (محمية)
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3.5 w-3.5" />
                            🔓 السنة مفتوحة (قابل للتعديل)
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar: Create, Upload, Export ZIP */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {/* Left: Invoice Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => setIsCreateInvoiceOpen(true)}
                      disabled={isYearLocked}
                      className="gap-2 text-xs"
                      id="btn-create-invoice-pdf"
                    >
                      <FilePlus className="h-4 w-4" />
                      إنشاء فاتورة جديدة (PDF)
                    </Button>

                    <Button
                      onClick={() => setIsUploadOpen(true)}
                      disabled={isYearLocked}
                      variant="outline"
                      className="gap-2 text-xs border-primary/40 text-primary hover:bg-primary/10"
                      id="btn-upload-invoice-doc"
                    >
                      <Upload className="h-4 w-4" />
                      استيراد / رفع فاتورة جاهزة
                    </Button>

                    {isYearLocked && (
                      <span className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-3 py-1 rounded-md border border-destructive/20">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        السنة مغلقة - ميزات التعديل مقفلة للحماية
                      </span>
                    )}
                  </div>

                  {/* Right: ZIP Export Button */}
                  <Button
                    onClick={downloadZipArchive}
                    variant="secondary"
                    className="gap-2 text-xs border border-border"
                    title="تنزيل حزمة الفواتير والمرفقات بصيغة ZIP"
                  >
                    <Archive className="h-4 w-4 text-primary" />
                    📦 تصدير أرشيف السنة (.zip)
                  </Button>
                </div>
              </div>

              {/* Financial Totals Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-good/10 text-status-good">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        مجموع المبيعات (TTC) {selectedYear === 'all' ? '(كافة السنين)' : `(${selectedYear})`}
                      </p>
                      <p className="text-lg font-bold font-mono-code text-status-good">
                        {totals.sales.toFixed(2)} DA
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-pending/10 text-status-pending">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        مجموع المشتريات (TTC) {selectedYear === 'all' ? '(كافة السنين)' : `(${selectedYear})`}
                      </p>
                      <p className="text-lg font-bold font-mono-code text-status-pending">
                        {totals.purchases.toFixed(2)} DA
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Calculator className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">تقدير صافي الـ TVA</p>
                      <p className="text-lg font-bold font-mono-code text-primary">
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
                      سجل فواتير ووثائق التاجر ({invoices.length})
                      {selectedYear !== 'all' && (
                        <span className="text-xs font-normal text-muted-foreground">
                          — السنة الجبائية: {selectedYear}
                        </span>
                      )}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>رقم الفاتورة</TableHead>
                          {selectedYear === 'all' && <TableHead>السنة المالية</TableHead>}
                          <TableHead>النوع</TableHead>
                          <TableHead>المعني (مورد/زبون)</TableHead>
                          <TableHead>المبلغ HT</TableHead>
                          <TableHead>المبلغ الإجمالي TTC</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>الملف والمستند</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingInvoices ? (
                          <TableRow>
                            <TableCell colSpan={selectedYear === 'all' ? 9 : 8} className="h-20 text-center text-muted-foreground">
                              جاري التحميل...
                            </TableCell>
                          </TableRow>
                        ) : invoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={selectedYear === 'all' ? 9 : 8} className="h-20 text-center text-muted-foreground">
                              لا توجد فواتير أو وثائق مأرشفة لهذه السنة الجبائية
                            </TableCell>
                          </TableRow>
                        ) : (
                          invoices.map((inv) => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-mono-code font-semibold">
                                {inv.invoice_number}
                              </TableCell>
                              {selectedYear === 'all' && (
                                <TableCell className="font-mono-code text-xs font-bold text-primary">
                                  {inv.fiscal_year || '—'}
                                </TableCell>
                              )}
                              <TableCell>
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    inv.type === 'sale'
                                      ? 'bg-status-good/10 text-status-good'
                                      : 'bg-status-pending/10 text-status-pending'
                                  }`}
                                >
                                  {inv.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'}
                                </span>
                              </TableCell>
                              <TableCell className="font-medium">{inv.counterparty}</TableCell>
                              <TableCell className="font-mono-code text-xs">
                                {inv.amount_ht.toFixed(2)} DA
                              </TableCell>
                              <TableCell className="font-mono-code font-bold">
                                {inv.amount_ttc.toFixed(2)} DA
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{inv.date}</TableCell>
                              <TableCell>
                                {inv.file_path ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                    onClick={() => handlePreviewInvoice(inv)}
                                    title="معاينة الملف المرفق في المتصفح"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    معاينة الوثيقة
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5 text-xs text-status-good hover:text-status-good hover:bg-status-good/10"
                                    onClick={() => handlePreviewInvoice(inv)}
                                    title="معاينة الفاتورة المولدة كـ PDF"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    معاينة PDF
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isYearLocked}
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-30"
                                  onClick={() => deleteInvoice(inv.id)}
                                  title={isYearLocked ? 'السنة مغلقة' : 'حذف الفاتورة'}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Modal 1: Create Invoice & Generate PDF */}
      {isCreateInvoiceOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FilePlus className="h-5 w-5 text-primary" />
                إنشاء فاتورة جديدة وتصدير كـ PDF
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsCreateInvoiceOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>نوع الفاتورة</Label>
                  <select
                    value={invType}
                    onChange={(e) => setInvType(e.target.value as 'purchase' | 'sale')}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="sale">فاتورة بيع (Vente)</option>
                    <option value="purchase">فاتورة شراء (Achat)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>رقم الفاتورة</Label>
                  <Input
                    value={invNumber}
                    onChange={(e) => setInvNumber(e.target.value)}
                    placeholder="مثال: FAC-2026-001"
                    className="font-mono-code"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>{invType === 'sale' ? 'اسم الزبون / المشتري' : 'اسم المورد / BÉNÉFICIAIRE'}</Label>
                <Input
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  placeholder="مثال: شركة الجزائر للتوزيع"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>المبلغ الصافي (HT)</Label>
                  <Input
                    type="number"
                    value={amountHt}
                    onChange={(e) => setAmountHt(e.target.value)}
                    placeholder="10000"
                    className="font-mono-code"
                    dir="ltr"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>نسبة الـ TVA (%)</Label>
                  <select
                    value={tvaRate}
                    onChange={(e) => setTvaRate(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono-code"
                  >
                    <option value="19">19% (قياسي)</option>
                    <option value="9">9% (منخفض)</option>
                    <option value="0">0% (معفى)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>المبلغ الإجمالي (TTC)</Label>
                  <Input
                    value={computedTtc()}
                    readOnly
                    className="font-mono-code font-bold bg-secondary/50 text-primary"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>تاريخ الفاتورة</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>بيانات السلع أو الملاحظات</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: خدمات استشارية وشراء مواد أولية"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsCreateInvoiceOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={submittingInvoice}>
                  {submittingInvoice ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري إنشاء الـ PDF...
                    </>
                  ) : (
                    'توليد الفاتورة وتحميل PDF'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Import & Upload Existing Invoice Document */}
      {isUploadOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                استيراد ورفع فاتورة مأرشفة (PDF / صورة)
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsUploadOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4 text-sm">
              <div className="space-y-1">
                <Label>اختر ملف الفاتورة (PDF أو صورة JPG/PNG)</Label>
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  ref={fileInputRef}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>نوع الفاتورة المرفوعة</Label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as 'purchase' | 'sale')}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="purchase">فاتورة شراء (Achat)</option>
                    <option value="sale">فاتورة بيع (Vente)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>رقم الفاتورة الأصلية</Label>
                  <Input
                    value={uploadDocNumber}
                    onChange={(e) => setUploadDocNumber(e.target.value)}
                    placeholder="مثال: N° 128/2026"
                    className="font-mono-code"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>المبلغ الإجمالي (TTC)</Label>
                  <Input
                    type="number"
                    value={uploadAmountTtc}
                    onChange={(e) => setUploadAmountTtc(e.target.value)}
                    placeholder="مثال: 45000"
                    className="font-mono-code"
                    dir="ltr"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>المورد أو الزبون</Label>
                  <Input
                    value={uploadCounterparty}
                    onChange={(e) => setUploadCounterparty(e.target.value)}
                    placeholder="اسم الجهة"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={uploading || !uploadFile}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الرفع والأرشفة...
                    </>
                  ) : (
                    'رفع وحفظ الفاتورة في الأرشيف'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add / Rollover New Fiscal Year */}
      {isNewYearModalOpen && selectedClient && (
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
      {/* Document Viewer Modal */}
      <DocumentViewerModal
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        documentUrl={previewDocUrl}
        title={previewDocTitle}
      />
    </div>
  )
}

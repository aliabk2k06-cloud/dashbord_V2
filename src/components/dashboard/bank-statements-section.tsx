import { useState, useMemo, type FormEvent } from 'react'
import {
  Landmark,
  PlusCircle,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  TrendingDown,
  TrendingUp,
  Filter,
  Upload,
  Printer,
  Calculator,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useClientWorkspace } from '../../context/client-workspace-context'
import type { BankStatement, BankStatementInsert } from '../../types/bank-statement'
import { openBankStatementInNewTab } from '../../lib/pdf-generator'
import { cn } from '../../lib/utils'

// List of standard Algerian banks
const ALGERIAN_BANKS = [
  'البنك الوطني الجزائري (BNA)',
  'القرض الشعبي الجزائري (CPA)',
  'بنك الفلاحة والتنمية الريفية (BADR)',
  'بنك التنمية المحلية (BDL)',
  'الصندوق الوطني للتوفير والاحتياط (CNEP)',
  'الحساب البريدي الجاري (CCP)',
  'بنك البركة الجزائري (Al Baraka)',
  'بنك السلام الجزائري (AGB / Gulf)',
  'مؤسسة مصرفية أخرى',
]

// ================= Bank Statement Add / Edit Modal =================
export function BankStatementModal({
  open,
  onClose,
  statement,
  onSave,
}: {
  open: boolean
  onClose: () => void
  statement?: BankStatement | null
  onSave: (data: BankStatementInsert) => Promise<{ success: boolean; error?: string }>
}) {
  const workspace = useClientWorkspace()
  const [stmtNumber, setStmtNumber] = useState(statement?.statement_number || '')
  const [bankName, setBankName] = useState(statement?.bank_name || 'البنك الوطني الجزائري (BNA)')
  const [customBank, setCustomBank] = useState('')
  const [period, setPeriod] = useState(statement?.period || '')
  const [startDate, setStartDate] = useState(statement?.start_date || '')
  const [endDate, setEndDate] = useState(statement?.end_date || '')
  const [debitTotal, setDebitTotal] = useState(statement?.debit_total !== undefined ? String(statement.debit_total) : '0')
  const [creditTotal, setCreditTotal] = useState(statement?.credit_total !== undefined ? String(statement.credit_total) : '0')
  const [notes, setNotes] = useState(statement?.notes || '')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Compute live net balance (Credit - Debit)
  const computedBalance = useMemo(() => {
    const d = parseFloat(debitTotal) || 0
    const c = parseFloat(creditTotal) || 0
    return c - d
  }, [debitTotal, creditTotal])

  if (!open) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSaving(true)

    try {
      let uploadedFilePath = statement?.file_path || null
      if (file && workspace) {
        const uploadRes = await workspace.uploadStatementDocument(file)
        if (uploadRes.success && uploadRes.filePath) {
          uploadedFilePath = uploadRes.filePath
        }
      }

      const finalBank = bankName === 'مؤسسة مصرفية أخرى' ? (customBank.trim() || 'بنك آخر') : bankName

      const payload: BankStatementInsert = {
        statement_number: stmtNumber.trim() || `RLV-${Date.now().toString().slice(-4)}`,
        bank_name: finalBank,
        period: period.trim() || 'كشف شهري',
        start_date: startDate,
        end_date: endDate,
        debit_total: parseFloat(debitTotal) || 0,
        credit_total: parseFloat(creditTotal) || 0,
        balance: computedBalance,
        file_path: uploadedFilePath,
        notes: notes.trim(),
        fiscal_year: workspace?.selectedYear === 'all' ? new Date().getFullYear() : parseInt(workspace?.selectedYear || '2026', 10),
      }

      const res = await onSave(payload)
      setSaving(false)
      if (res.success) {
        onClose()
      } else {
        setErrorMsg(res.error || 'فشل حفظ الكشف البنكي')
      }
    } catch {
      setSaving(false)
      setErrorMsg('حدث خطأ غير متوقع أثناء الحفظ')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-background p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {statement ? 'تعديل بيانات الكشف البنكي' : 'إضافة كشف بنكي جديد'}
              </h3>
              <p className="text-xs text-muted-foreground">أدخل التفاصيل والبيانات الحسابية للكشف المصرفي</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Main Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">رقم الكشف / المرجع المصرفي</Label>
              <Input
                value={stmtNumber}
                onChange={(e) => setStmtNumber(e.target.value)}
                placeholder="مثال: RLV-2026-01"
                className="font-mono-code text-xs h-10"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">البنك / المؤسسة المالية</Label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {ALGERIAN_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {bankName === 'مؤسسة مصرفية أخرى' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">اسم البنك المخصص</Label>
              <Input
                value={customBank}
                onChange={(e) => setCustomBank(e.target.value)}
                placeholder="أدخل اسم البنك..."
                className="text-xs h-10"
                required
              />
            </div>
          )}

          {/* Period & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">الفترة / الشهر</Label>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="مثال: يناير 2026"
                className="text-xs h-10"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">تاريخ بداية الكشف</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="font-mono-code text-xs h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">تاريخ نهاية الكشف</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="font-mono-code text-xs h-10"
              />
            </div>
          </div>

          {/* Financial Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-border bg-secondary/20">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-status-pending flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5" />
                المصروفات (مدينة / Débit)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={debitTotal}
                onChange={(e) => setDebitTotal(e.target.value)}
                placeholder="0.00"
                className="font-mono-code text-xs h-10 text-status-pending font-bold"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-status-good flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                المقبوضات (دائن / Crédit)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={creditTotal}
                onChange={(e) => setCreditTotal(e.target.value)}
                placeholder="0.00"
                className="font-mono-code text-xs h-10 text-status-good font-bold"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-primary flex items-center gap-1">
                <Landmark className="h-3.5 w-3.5" />
                الرصيد الصافي (Solde Net)
              </Label>
              <Input
                value={`${computedBalance.toFixed(2)} DA`}
                readOnly
                className={cn(
                  'font-mono-code text-xs h-10 font-bold bg-background',
                  computedBalance >= 0 ? 'text-status-good' : 'text-status-pending'
                )}
                dir="ltr"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">ملاحظات الكشف البنكي</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات تفصيلية حول حركة الحساب البنكي..."
              className="text-xs h-10"
            />
          </div>

          {/* File Attachment */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">إرفاق نسخة الكشف المأرشفة (PDF / صورة)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-xs h-10 cursor-pointer flex-1"
              />
              {file && (
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                  ✓ تم التحديد
                </span>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="h-10">
              إلغاء
            </Button>
            <Button type="submit" disabled={saving} className="h-10 font-bold gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ والربط...
                </>
              ) : (
                'حفظ الكشف البنكي'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ================= Bank Statement Main Registry View =================
export function BankStatementsView() {
  const workspace = useClientWorkspace()
  const [searchQuery, setSearchQuery] = useState('')
  const [bankFilter, setBankFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [statementToEdit, setStatementToEdit] = useState<BankStatement | null>(null)
  const [statementToDelete, setStatementToDelete] = useState<BankStatement | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (!workspace) return null

  const {
    client,
    bankStatements,
    loadingBankStatements,
    bankTotals,
    addBankStatement,
    updateBankStatement,
    deleteBankStatement,
    isYearLocked,
    selectedYear,
    setActiveTab,
  } = workspace

  // Advanced Filtering
  const filteredStatements = useMemo(() => {
    return bankStatements.filter((stmt) => {
      // 1. Search Query Filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase()
        const matchNum = stmt.statement_number.toLowerCase().includes(q)
        const matchBank = stmt.bank_name.toLowerCase().includes(q)
        const matchPeriod = stmt.period.toLowerCase().includes(q)
        const matchNotes = (stmt.notes || '').toLowerCase().includes(q)
        const matchDebit = stmt.debit_total.toString().includes(q)
        const matchCredit = stmt.credit_total.toString().includes(q)
        const matchBalance = stmt.balance.toString().includes(q)
        if (!matchNum && !matchBank && !matchPeriod && !matchNotes && !matchDebit && !matchCredit && !matchBalance) {
          return false
        }
      }

      // 2. Bank Name Filter
      if (bankFilter !== 'all' && !stmt.bank_name.toLowerCase().includes(bankFilter.toLowerCase())) {
        return false
      }

      // 3. Month Filter
      if (monthFilter !== 'all') {
        const startDateMonth = stmt.start_date ? stmt.start_date.split('-')[1] : null
        if (startDateMonth !== monthFilter && !stmt.period.includes(monthFilter)) {
          return false
        }
      }

      // 4. Period Filter (Semesters/Trimesters)
      if (periodFilter !== 'all' && stmt.start_date) {
        const monthNum = parseInt(stmt.start_date.split('-')[1] || '0', 10)
        if (periodFilter === 'H1' && !(monthNum >= 1 && monthNum <= 6)) return false
        if (periodFilter === 'H2' && !(monthNum >= 7 && monthNum <= 12)) return false
        if (periodFilter === 'Q1' && !(monthNum >= 1 && monthNum <= 3)) return false
        if (periodFilter === 'Q2' && !(monthNum >= 4 && monthNum <= 6)) return false
        if (periodFilter === 'Q3' && !(monthNum >= 7 && monthNum <= 9)) return false
        if (periodFilter === 'Q4' && !(monthNum >= 10 && monthNum <= 12)) return false
      }

      return true
    })
  }, [bankStatements, searchQuery, bankFilter, monthFilter, periodFilter])

  const hasActiveFilters = searchQuery !== '' || bankFilter !== 'all' || monthFilter !== 'all' || periodFilter !== 'all'

  const resetFilters = () => {
    setSearchQuery('')
    setBankFilter('all')
    setMonthFilter('all')
    setPeriodFilter('all')
  }

  const handleDeleteConfirm = async () => {
    if (!statementToDelete) return
    setDeleting(true)
    await deleteBankStatement(statementToDelete.id)
    setDeleting(false)
    setStatementToDelete(null)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Financial Totals Cards (Matching Invoice Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border border-border shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-good/10 text-status-good">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                مجموع المقبوضات (Crédit) {selectedYear === 'all' ? '(كافة السنين)' : `(${selectedYear})`}
              </p>
              <p className="text-xl font-bold font-mono-code text-status-good">
                {bankTotals.creditTotal.toFixed(2)} DA
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-pending/10 text-status-pending">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                مجموع المصروفات (Débit) {selectedYear === 'all' ? '(كافة السنين)' : `(${selectedYear})`}
              </p>
              <p className="text-xl font-bold font-mono-code text-status-pending">
                {bankTotals.debitTotal.toFixed(2)} DA
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">الرصيد الصافي (Solde Net)</p>
              <p className={cn("text-xl font-bold font-mono-code", bankTotals.balanceTotal >= 0 ? "text-status-good" : "text-status-pending")}>
                {bankTotals.balanceTotal.toFixed(2)} DA
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Bank Statements Registry Card */}
      <Card className="border border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              سجل الكشوفات البنكية والمصرفية ({bankStatements.length})
              {selectedYear !== 'all' && (
                <span className="text-xs font-normal text-muted-foreground">
                  — السنة الجبائية: {selectedYear}
                </span>
              )}
            </span>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsAddOpen(true)}
                disabled={isYearLocked}
                className="gap-1 text-xs font-bold shadow-xs"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                إضافة كشف بنكي جديد
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('upload_bank_statement')}
                disabled={isYearLocked}
                className="gap-1 text-xs border-primary/40 text-primary hover:bg-primary/10 font-bold"
              >
                <Upload className="h-3.5 w-3.5" />
                استيراد كشف بنكي
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Quick Bank Statements Search Bar */}
          <div className="relative mb-3.5">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث السريع بالسجل المصرفي (رقم الكشف، اسم البنك، الفترة، المبالغ أو الملاحظات)..."
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

          {/* Advanced Filters Bar (Matching Invoice Filter Bar Design) */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-card/60 backdrop-blur-md rounded-xl border border-primary/20 shadow-xs mb-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Filter className="h-3.5 w-3.5" />
              </div>
              <span>تصفية الكشوفات البنكية:</span>
              {hasActiveFilters && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary animate-in fade-in">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  مرشّح / بحث مفّعل
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Bank Filter */}
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
                  البنك
                  {bankFilter !== 'all' && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </Label>
                <Select value={bankFilter} onValueChange={setBankFilter}>
                  <SelectTrigger className={`h-8 min-w-[155px] text-xs font-semibold ${bankFilter !== 'all' ? 'border-primary bg-primary/5 text-primary' : ''}`}>
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
                    <SelectItem value="Al Baraka">بنك البركة</SelectItem>
                    <SelectItem value="AGB">بنك السلام / AGB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
                  الشهر الجبائي
                  {monthFilter !== 'all' && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </Label>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
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
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
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
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 px-2.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 font-bold animate-in fade-in"
                >
                  <X className="h-3.5 w-3.5" />
                  إعادة ضبط الفلاتر والبحث
                </Button>
              )}
            </div>
          </div>

          {/* Bank Statements Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الكشف / المرجع</TableHead>
                  {selectedYear === 'all' && <TableHead>السنة</TableHead>}
                  <TableHead>البنك / المؤسسة</TableHead>
                  <TableHead>الفترة والتواريخ</TableHead>
                  <TableHead>المصروفات (Débit)</TableHead>
                  <TableHead>المقبوضات (Crédit)</TableHead>
                  <TableHead>الرصيد الصافي (Solde)</TableHead>
                  <TableHead>الملف والمستند</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingBankStatements ? (
                  <TableRow>
                    <TableCell colSpan={selectedYear === 'all' ? 9 : 8} className="h-20 text-center text-muted-foreground">
                      جاري تحميل السجل المصرفي...
                    </TableCell>
                  </TableRow>
                ) : filteredStatements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={selectedYear === 'all' ? 9 : 8} className="h-20 text-center text-muted-foreground">
                      لا توجد كشوفات بنكية مطابقة للفلاتر المختارة لهذه السنة الجبائية
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStatements.map((stmt) => {
                    return (
                      <TableRow key={stmt.id}>
                        <TableCell className="font-mono-code font-semibold">{stmt.statement_number}</TableCell>

                        {selectedYear === 'all' && (
                          <TableCell className="font-mono-code text-xs font-bold text-primary">
                            {stmt.fiscal_year || '—'}
                          </TableCell>
                        )}

                        <TableCell>
                          <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
                            {stmt.bank_name}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-medium text-xs text-foreground">{stmt.period}</span>
                            {stmt.start_date && (
                              <p className="text-[10px] font-mono-code text-muted-foreground">
                                {stmt.start_date} {stmt.end_date ? `إلى ${stmt.end_date}` : ''}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="font-mono-code font-bold text-xs text-status-pending">
                          {stmt.debit_total.toFixed(2)} DA
                        </TableCell>

                        <TableCell className="font-mono-code font-bold text-xs text-status-good">
                          {stmt.credit_total.toFixed(2)} DA
                        </TableCell>

                        <TableCell className={cn("font-mono-code font-bold text-xs", stmt.balance >= 0 ? "text-status-good" : "text-status-pending")}>
                          {stmt.balance.toFixed(2)} DA
                        </TableCell>

                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (client) {
                                openBankStatementInNewTab(client, stmt)
                              }
                            }}
                            className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 h-7 font-semibold"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            معاينة الكشف
                          </Button>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => client && openBankStatementInNewTab(client, stmt)}
                              title="طباعة الكشف البنكي"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isYearLocked}
                              className="h-7 w-7 text-muted-foreground hover:text-primary disabled:opacity-30"
                              onClick={() => setStatementToEdit(stmt)}
                              title={isYearLocked ? 'السنة مغلقة' : 'تعديل الكشف'}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isYearLocked}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-30"
                              onClick={() => setStatementToDelete(stmt)}
                              title={isYearLocked ? 'السنة مغلقة' : 'حذف الكشف'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add / Edit Statement Modal */}
      {isAddOpen && (
        <BankStatementModal
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSave={addBankStatement}
        />
      )}

      {statementToEdit && (
        <BankStatementModal
          open={Boolean(statementToEdit)}
          onClose={() => setStatementToEdit(null)}
          statement={statementToEdit}
          onSave={(data) => updateBankStatement(statementToEdit.id, data)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {statementToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">تأكيد حذف الكشف البنكي</h2>
                <p className="text-xs text-muted-foreground">هل أنت متأكد من رغبتك في حذف هذا الكشف البنكي؟</p>
              </div>
            </div>

            <div className="my-4 rounded-lg border border-border bg-secondary/40 p-3 text-xs space-y-1">
              <p className="font-bold">{statementToDelete.statement_number} — {statementToDelete.bank_name}</p>
              <p className="text-muted-foreground">الفترة: {statementToDelete.period}</p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setStatementToDelete(null)} disabled={deleting}>
                إلغاء
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting} className="font-bold">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'نعم، قم بالحذف'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import {
  FileText,
  LogOut,
  FilePlus,
  Upload,
  Archive,
  Building,
  FileSpreadsheet,
  FolderArchive,
  UserCheck,
  ChevronDown,
  ChevronLeft,
  ListFilter,
  Landmark,
  FileUp,
  Download,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { useClientWorkspace, type ClientTabType } from '../../context/client-workspace-context'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const workspace = useClientWorkspace()
  const [isInvoiceSubMenuOpen, setIsInvoiceSubMenuOpen] = useState(true)
  const [isBankSubMenuOpen, setIsBankSubMenuOpen] = useState(true)

  // Check if we are inside a dedicated client workspace e.g. /clients/:clientId
  const isClientWorkspace = location.pathname.startsWith('/clients/') && location.pathname !== '/clients/add' && workspace?.client

  const isInvoiceTabGroup = ['invoices', 'create_pdf', 'upload_doc', 'export_zip'].includes(workspace?.activeTab || '')
  const isBankTabGroup = ['bank_statements', 'upload_bank_statement', 'export_bank_statements'].includes(workspace?.activeTab || '')

  const invoiceSubTabs: { id: ClientTabType; label: string; icon: any; disabled?: boolean }[] = [
    {
      id: 'invoices',
      label: 'سجل وعرض الفواتير',
      icon: ListFilter,
    },
    {
      id: 'create_pdf',
      label: 'إنشاء فاتورة جديدة (معاينة حية)',
      icon: FilePlus,
      disabled: workspace?.isYearLocked,
    },
    {
      id: 'upload_doc',
      label: 'استيراد / رفع فاتورة جاهزة',
      icon: Upload,
      disabled: workspace?.isYearLocked,
    },
    {
      id: 'export_zip',
      label: 'تصدير الفواتير',
      icon: Archive,
    },
  ]

  const bankSubTabs: { id: ClientTabType; label: string; icon: any; disabled?: boolean }[] = [
    {
      id: 'bank_statements',
      label: 'سجل وعرض الكشوفات البنكية',
      icon: Landmark,
    },
    {
      id: 'upload_bank_statement',
      label: 'استيراد / رفع كشف بنكي',
      icon: FileUp,
      disabled: workspace?.isYearLocked,
    },
    {
      id: 'export_bank_statements',
      label: 'تصدير الأرشيف البنكي',
      icon: Download,
    },
  ]

  return (
    <>
      {/* Overlay for mobile */}
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}

      {/* Sidebar - fixed on the right in RTL */}
      <aside
        className={cn(
          'fixed top-0 end-0 z-50 flex h-full w-72 flex-col border-s border-border bg-card transition-transform duration-300 lg:static lg:translate-x-0 shadow-sm',
          open ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full lg:translate-x-0 lg:rtl:translate-x-0'
        )}
      >
        {!isClientWorkspace ? (
          /* ================= GLOBAL MAIN HOME SIDEBAR ================= */
          <>
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 border-b border-border px-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight">داشبورد المحاسب</h1>
                <p className="text-xs text-muted-foreground">نظام إدارة وثائق التجار</p>
              </div>
            </div>

            {/* Sidebar content */}
            <div className="flex-1 space-y-4 p-4 text-xs">
              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2 text-center">
                <FileSpreadsheet className="h-8 w-8 text-primary mx-auto opacity-80" />
                <p className="font-bold text-sm text-foreground">قائمة التجار الرئيسية</p>
                <p className="text-xs text-muted-foreground">
                  اختر أي تاجر من الجدول للانتقال إلى مساحته المستقلة وإدارة فواتيره وكشوفاته البنكية
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4">
              <p className="text-xs text-muted-foreground text-center">المنظومة المحاسبية v1.0</p>
            </div>
          </>
        ) : (
          /* ================= STANDALONE CLIENT DEDICATED SIDEBAR TABS ================= */
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Dedicated Client Header Badge */}
            <div className="border-b border-border p-4 bg-primary/5 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-sm">
                  {workspace.client?.owner_name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <h2 className="text-sm font-bold truncate leading-tight">{workspace.client?.owner_name}</h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                    <Building className="h-3 w-3 shrink-0" />
                    {workspace.client?.business_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <span className="text-[11px] font-mono-code text-muted-foreground">
                  NIF: {workspace.client?.nif}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    workspace.client?.documents_status === 'up_to_date'
                      ? 'bg-status-good/15 text-status-good'
                      : 'bg-status-pending/15 text-status-pending'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      workspace.client?.documents_status === 'up_to_date' ? 'bg-status-good' : 'bg-status-pending'
                    }`}
                  />
                  {workspace.client?.documents_status === 'up_to_date' ? 'محدث' : 'متأخر'}
                </span>
              </div>
            </div>

            {/* Client Contextual Sidebar Tabs */}
            <div className="flex-1 space-y-5 p-4">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground px-2 pb-1">أقسام وميزات التاجر</p>

                {/* 1. Main Accordion Group: سجل الفواتير والأرشيف */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setIsInvoiceSubMenuOpen((prev) => !prev)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all border text-start',
                      isInvoiceTabGroup
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <FolderArchive className="h-4 w-4 shrink-0 text-primary" />
                    <span className="flex-1">سجل الفواتير والأرشيف</span>
                    {isInvoiceSubMenuOpen ? (
                      <ChevronDown className="h-4 w-4 text-primary shrink-0 transition-transform" />
                    ) : (
                      <ChevronLeft className="h-4 w-4 shrink-0" />
                    )}
                  </button>

                  {/* Sub-menu items */}
                  {isInvoiceSubMenuOpen && (
                    <div className="ps-4 space-y-1 border-s-2 border-primary/20 ms-3 pt-1 pb-1 animate-in fade-in duration-150">
                      {invoiceSubTabs.map((subTab) => {
                        const isActive = workspace.activeTab === subTab.id
                        const SubIcon = subTab.icon

                        return (
                          <button
                            key={subTab.id}
                            onClick={() => {
                              if (!subTab.disabled) {
                                workspace.setActiveTab(subTab.id)
                                onClose()
                              }
                            }}
                            disabled={subTab.disabled}
                            className={cn(
                              'w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-all text-start',
                              isActive
                                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                                : subTab.disabled
                                ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            )}
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 truncate">{subTab.label}</span>
                            {subTab.disabled && (
                              <span className="text-[9px] bg-destructive/10 text-destructive px-1 py-0.2 rounded">🔒</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Main Accordion Group: الكشوفات البنكية */}
                <div className="space-y-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsBankSubMenuOpen((prev) => !prev)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all border text-start',
                      isBankTabGroup
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <Landmark className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="flex-1">الكشوفات البنكية</span>
                    {isBankSubMenuOpen ? (
                      <ChevronDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform" />
                    ) : (
                      <ChevronLeft className="h-4 w-4 shrink-0" />
                    )}
                  </button>

                  {/* Sub-menu items */}
                  {isBankSubMenuOpen && (
                    <div className="ps-4 space-y-1 border-s-2 border-emerald-500/20 ms-3 pt-1 pb-1 animate-in fade-in duration-150">
                      {bankSubTabs.map((subTab) => {
                        const isActive = workspace.activeTab === subTab.id
                        const SubIcon = subTab.icon

                        return (
                          <button
                            key={subTab.id}
                            onClick={() => {
                              if (!subTab.disabled) {
                                workspace.setActiveTab(subTab.id)
                                onClose()
                              }
                            }}
                            disabled={subTab.disabled}
                            className={cn(
                              'w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-all text-start',
                              isActive
                                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                : subTab.disabled
                                ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            )}
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 truncate">{subTab.label}</span>
                            {subTab.disabled && (
                              <span className="text-[9px] bg-destructive/10 text-destructive px-1 py-0.2 rounded">🔒</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Top-level item: البيانات الجبائية والتعديل */}
                <button
                  type="button"
                  onClick={() => {
                    workspace.setActiveTab('profile')
                    onClose()
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all border text-start mt-2',
                    workspace.activeTab === 'profile'
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <UserCheck className="h-4 w-4 shrink-0" />
                  <span className="flex-1">البيانات الجبائية والتعديل</span>
                </button>
              </div>

              {/* Exit / Return to Main Traders List Button */}
              <div className="pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate({ to: '/' })
                    onClose()
                  }}
                  className="w-full justify-start gap-2.5 text-xs font-bold border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 text-destructive" />
                  العودة لقائمة التجار الرئيسية
                </Button>
              </div>
            </div>

            {/* Standalone Dashboard Footer */}
            <div className="border-t border-border px-4 py-3 bg-card">
              <p className="text-[11px] text-muted-foreground text-center font-mono-code">
                مساحة العميل المستقلة
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

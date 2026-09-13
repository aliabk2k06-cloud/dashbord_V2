import { useState } from 'react'
import { X, Download, Printer, FileText, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'

interface DocumentViewerModalProps {
  open: boolean
  onClose: () => void
  documentUrl: string | null
  title?: string
}

export function DocumentViewerModal({ open, onClose, documentUrl, title = 'معاينة المستند' }: DocumentViewerModalProps) {
  const [loading, setLoading] = useState(true)

  if (!open || !documentUrl) return null

  const isPdf =
    documentUrl.toLowerCase().includes('.pdf') ||
    documentUrl.startsWith('data:application/pdf') ||
    documentUrl.startsWith('blob:')

  const handlePrint = () => {
    if (isPdf) {
      const iframe = document.getElementById('doc-preview-iframe') as HTMLIFrameElement | null
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      } else {
        window.open(documentUrl, '_blank')
      }
    } else {
      const printWindow = window.open(documentUrl, '_blank')
      if (printWindow) {
        printWindow.focus()
        printWindow.print()
      }
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = documentUrl
    link.download = title.replace(/\s+/g, '_') + (isPdf ? '.pdf' : '.png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl h-[90vh] rounded-xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">{title}</h3>
              <p className="text-[11px] text-muted-foreground">عرض ومعاينة فورية داخل المتصفح بدون تنزيل</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-semibold"
              title="طباعة الفاتورة"
            >
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
              title="تحميل الملف للجهاز"
            >
              <Download className="h-3.5 w-3.5" />
              تحميل
            </Button>

            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              title="فتح في نافذة مستقلة"
            >
              <ExternalLink className="h-4 w-4" />
            </a>

            <div className="h-5 w-[1px] bg-border mx-1" />

            <Button variant="ghost" size="icon" onClick={onClose} title="إغلاق المعاينة">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="relative flex-1 bg-secondary/20 p-4 flex items-center justify-center overflow-auto">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-xs z-10">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                جاري عرض الفاتورة...
              </div>
            </div>
          )}

          {isPdf ? (
            <iframe
              id="doc-preview-iframe"
              src={documentUrl}
              onLoad={() => setLoading(false)}
              className="w-full h-full rounded-lg border border-border bg-white shadow-inner"
              title={title}
            />
          ) : (
            <img
              src={documentUrl}
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
              alt={title}
              className="max-h-full max-w-full object-contain rounded-lg border border-border shadow-md"
            />
          )}
        </div>
      </div>
    </div>
  )
}

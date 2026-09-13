import { Button } from '../ui/button'
import { Phone, Mail, FileText, MapPin, Building, Calendar, X } from 'lucide-react'
import type { Client } from '../../types/client'

interface ClientDetailsDialogProps {
  client: Client | null
  open: boolean
  onClose: () => void
}

export function ClientDetailsDialog({ client, open, onClose }: ClientDetailsDialogProps) {
  if (!open || !client) return null

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-DZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold">{client.owner_name}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Building className="h-4 w-4" />
              {client.business_name}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="my-6 space-y-4 text-sm">
          {/* Status Badge */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
            <span className="font-medium text-muted-foreground">حالة الوثائق الشهرية:</span>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  client.documents_status === 'up_to_date' ? 'bg-status-good' : 'bg-status-pending'
                }`}
              />
              <span
                className={`font-semibold ${
                  client.documents_status === 'up_to_date' ? 'text-status-good' : 'text-status-pending'
                }`}
              >
                {client.documents_status === 'up_to_date' ? 'محدّث (مكتمل)' : 'متأخر (قيد الانتظار)'}
              </span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2.5 rounded-md border border-border p-3">
              <Phone className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                <p className="font-mono-code font-semibold text-foreground dir-ltr text-start">{client.phone || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-md border border-border p-3">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                <p className="font-mono-code font-semibold text-foreground truncate dir-ltr text-start">{client.email || '—'}</p>
              </div>
            </div>
          </div>

          {/* Legal Codes */}
          <div className="space-y-2 rounded-lg border border-border p-4">
            <p className="font-semibold text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              البيانات الجبائية والإحصائية
            </p>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">رقم التعريف الجبائي (NIF):</span>
                <span className="font-mono-code font-bold">{client.nif}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">رقم التعريف الإحصائي (NIS):</span>
                <span className="font-mono-code font-bold">{client.nis}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">رقم السجل التجاري (RC):</span>
                <span className="font-mono-code font-bold">{client.rc}</span>
              </div>
            </div>
          </div>

          {/* Activity & Location */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2.5 rounded-md border border-border p-3">
              <Building className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">نوع النشاط</p>
                <p className="font-medium">{client.activity_type}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-md border border-border p-3">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">موقع النشاط</p>
                <p className="font-medium">{client.location}</p>
              </div>
            </div>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>تاريخ التسجيل بالمنظومة: {formatDate(client.created_at)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>
            إغلاق النافذة
          </Button>
        </div>
      </div>
    </div>
  )
}

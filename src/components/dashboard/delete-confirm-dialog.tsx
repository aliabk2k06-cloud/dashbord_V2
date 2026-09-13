import { useState } from 'react'
import { Button } from '../ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { Client } from '../../types/client'

interface DeleteConfirmDialogProps {
  client: Client | null
  open: boolean
  onClose: () => void
  onConfirm: (id: string) => Promise<{ success: boolean; error?: string }>
}

export function DeleteConfirmDialog({ client, open, onClose, onConfirm }: DeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!open || !client) return null

  const handleDelete = async () => {
    setErrorMsg(null)
    setDeleting(true)
    const res = await onConfirm(client.id)
    setDeleting(false)

    if (res.success) {
      onClose()
    } else {
      setErrorMsg(res.error || 'حدث خطأ أثناء حذف التاجر')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
        {/* Icon & Title */}
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">تأكيد حذف التاجر</h2>
            <p className="text-xs text-muted-foreground">هذا الإجراء لا يمكن التراجع عنه</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        <div className="my-4 text-sm text-foreground space-y-2">
          <p>هل أنت تأكد من رغبتك في حذف التاجر التالي نهائياً من قاعدة البيانات؟</p>
          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs space-y-1">
            <p className="font-bold text-sm">{client.owner_name}</p>
            <p className="text-muted-foreground">{client.business_name} — NIF: {client.nif}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            إلغاء
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحذف...
              </>
            ) : (
              'نعم، قم بالحذف'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, type FormEvent } from 'react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { X, Loader2, Save } from 'lucide-react'
import {
  validateNIF,
  validateNIS,
  validateRC,
  validatePhone,
  validateEmail,
  validateRequired,
} from '../../validators/client-validators'
import type { Client, ClientUpdate } from '../../types/client'

interface EditClientDialogProps {
  client: Client | null
  open: boolean
  onClose: () => void
  onSave: (id: string, updatedData: ClientUpdate) => Promise<{ success: boolean; error?: string }>
}

export function EditClientDialog({ client, open, onClose, onSave }: EditClientDialogProps) {
  const [formData, setFormData] = useState<ClientUpdate>({})
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (client) {
      setFormData({
        owner_name: client.owner_name,
        business_name: client.business_name,
        nif: client.nif,
        nis: client.nis,
        rc: client.rc,
        phone: client.phone,
        email: client.email,
        activity_type: client.activity_type,
        location: client.location,
        documents_status: client.documents_status,
      })
      setErrorMsg(null)
    }
  }, [client])

  if (!open || !client) return null

  const handleChange = (field: keyof ClientUpdate, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrorMsg(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    // Validation
    const vOwner = validateRequired(formData.owner_name || '', 'الاسم واللقب')
    if (!vOwner.valid) return setErrorMsg(vOwner.message)

    const vBusiness = validateRequired(formData.business_name || '', 'اسم المؤسسة')
    if (!vBusiness.valid) return setErrorMsg(vBusiness.message)

    const vPhone = validatePhone(formData.phone || '')
    if (!vPhone.valid) return setErrorMsg(vPhone.message)

    const vEmail = validateEmail(formData.email || '')
    if (!vEmail.valid) return setErrorMsg(vEmail.message)

    const vNIF = validateNIF(formData.nif || '')
    if (!vNIF.valid) return setErrorMsg(vNIF.message)

    const vNIS = validateNIS(formData.nis || '')
    if (!vNIS.valid) return setErrorMsg(vNIS.message)

    const vRC = validateRC(formData.rc || '')
    if (!vRC.valid) return setErrorMsg(vRC.message)

    const vActivity = validateRequired(formData.activity_type || '', 'نوع النشاط')
    if (!vActivity.valid) return setErrorMsg(vActivity.message)

    const vLocation = validateRequired(formData.location || '', 'موقع النشاط')
    if (!vLocation.valid) return setErrorMsg(vLocation.message)

    setSubmitting(true)
    const res = await onSave(client.id, formData)
    setSubmitting(false)

    if (res.success) {
      onClose()
    } else {
      setErrorMsg(res.error || 'حدث خطأ أثناء حفظ التعديلات')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-xl font-bold">تعديل بيانات التاجر</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Document status toggle */}
          <div className="space-y-1.5 rounded-lg border border-border bg-secondary/30 p-4">
            <Label className="text-sm font-semibold">حالة الوثائق الشهرية</Label>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="documents_status"
                  value="up_to_date"
                  checked={formData.documents_status === 'up_to_date'}
                  onChange={() => handleChange('documents_status', 'up_to_date')}
                  className="accent-status-good h-4 w-4"
                />
                <span className="flex items-center gap-1.5 text-status-good font-semibold">
                  <span className="h-2 w-2 rounded-full bg-status-good" />
                  محدّث (مكتمل)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="documents_status"
                  value="pending"
                  checked={formData.documents_status === 'pending'}
                  onChange={() => handleChange('documents_status', 'pending')}
                  className="accent-status-pending h-4 w-4"
                />
                <span className="flex items-center gap-1.5 text-status-pending font-semibold">
                  <span className="h-2 w-2 rounded-full bg-status-pending" />
                  متأخر (قيد الانتظار)
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>الاسم واللقب</Label>
              <Input
                value={formData.owner_name || ''}
                onChange={(e) => handleChange('owner_name', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>اسم المؤسسة</Label>
              <Input
                value={formData.business_name || ''}
                onChange={(e) => handleChange('business_name', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>رقم الهاتف</Label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="font-mono-code"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <Input
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="font-mono-code"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>NIF</Label>
              <Input
                value={formData.nif || ''}
                onChange={(e) => handleChange('nif', e.target.value)}
                className="font-mono-code"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label>NIS</Label>
              <Input
                value={formData.nis || ''}
                onChange={(e) => handleChange('nis', e.target.value)}
                className="font-mono-code"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label>RC</Label>
              <Input
                value={formData.rc || ''}
                onChange={(e) => handleChange('rc', e.target.value)}
                className="font-mono-code"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>نوع النشاط</Label>
              <Input
                value={formData.activity_type || ''}
                onChange={(e) => handleChange('activity_type', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>موقع النشاط</Label>
              <Input
                value={formData.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              إلغاء
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  حفظ التعديلات
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

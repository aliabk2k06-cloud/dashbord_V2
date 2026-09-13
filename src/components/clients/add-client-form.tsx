import { useState, useCallback, type FormEvent } from 'react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Loader2, Save } from 'lucide-react'
import {
  validateNIF,
  validateNIS,
  validateRC,
  validatePhone,
  validateEmail,
  validateRequired,
  type ValidationResult,
} from '../../validators/client-validators'
import type { ClientInsert } from '../../types/client'

interface AddClientFormProps {
  onSubmit: (client: ClientInsert) => Promise<{ success: boolean; error?: string }>
  onSuccess: () => void
}

type FormFields = {
  owner_name: string
  business_name: string
  nif: string
  nis: string
  rc: string
  phone: string
  email: string
  activity_type: string
  location: string
}

type FormErrors = Record<keyof FormFields, string>
type FormTouched = Record<keyof FormFields, boolean>

const initialValues: FormFields = {
  owner_name: '',
  business_name: '',
  nif: '',
  nis: '',
  rc: '',
  phone: '',
  email: '',
  activity_type: '',
  location: '',
}

const initialErrors: FormErrors = {
  owner_name: '',
  business_name: '',
  nif: '',
  nis: '',
  rc: '',
  phone: '',
  email: '',
  activity_type: '',
  location: '',
}

const initialTouched: FormTouched = {
  owner_name: false,
  business_name: false,
  nif: false,
  nis: false,
  rc: false,
  phone: false,
  email: false,
  activity_type: false,
  location: false,
}

function validateField(field: keyof FormFields, value: string): ValidationResult {
  switch (field) {
    case 'owner_name':
      return validateRequired(value, 'الاسم واللقب')
    case 'business_name':
      return validateRequired(value, 'اسم المؤسسة')
    case 'nif':
      return validateNIF(value)
    case 'nis':
      return validateNIS(value)
    case 'rc':
      return validateRC(value)
    case 'phone':
      return validatePhone(value)
    case 'email':
      return validateEmail(value)
    case 'activity_type':
      return validateRequired(value, 'نوع النشاط')
    case 'location':
      return validateRequired(value, 'موقع النشاط')
  }
}

export function AddClientForm({ onSubmit, onSuccess }: AddClientFormProps) {
  const [values, setValues] = useState<FormFields>(initialValues)
  const [errors, setErrors] = useState<FormErrors>(initialErrors)
  const [touched, setTouched] = useState<FormTouched>(initialTouched)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleChange = useCallback((field: keyof FormFields, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setSubmitError(null)

    setTouched((prev) => {
      if (prev[field]) {
        const result = validateField(field, value)
        setErrors((prevErrors) => ({ ...prevErrors, [field]: result.message }))
      }
      return prev
    })
  }, [])

  const handleBlur = useCallback(
    (field: keyof FormFields) => {
      setTouched((prev) => ({ ...prev, [field]: true }))
      const result = validateField(field, values[field])
      setErrors((prev) => ({ ...prev, [field]: result.message }))
    },
    [values]
  )

  const isFormValid = useCallback((): boolean => {
    const fields = Object.keys(values) as (keyof FormFields)[]
    return fields.every((field) => {
      const result = validateField(field, values[field])
      return result.valid
    })
  }, [values])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    const fields = Object.keys(values) as (keyof FormFields)[]
    const newTouched = { ...initialTouched }
    const newErrors = { ...initialErrors }
    let hasError = false

    for (const field of fields) {
      newTouched[field] = true
      const result = validateField(field, values[field])
      newErrors[field] = result.message
      if (!result.valid) hasError = true
    }

    setTouched(newTouched)
    setErrors(newErrors)

    if (hasError) return

    const trimmedValues: FormFields = {
      owner_name: values.owner_name.trim(),
      business_name: values.business_name.trim(),
      nif: values.nif.trim(),
      nis: values.nis.trim(),
      rc: values.rc.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      activity_type: values.activity_type.trim(),
      location: values.location.trim(),
    }

    setSubmitting(true)
    const result = await onSubmit(trimmedValues)
    setSubmitting(false)

    if (result.success) {
      setSubmitSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 1200)
    } else {
      setSubmitError(result.error ?? 'حدث خطأ غير متوقع')
    }
  }

  const formFields: { key: keyof FormFields; label: string; placeholder: string; isMono?: boolean; dir?: string }[] = [
    { key: 'owner_name', label: 'الاسم واللقب', placeholder: 'مثال: محمد بن أحمد' },
    { key: 'business_name', label: 'اسم المؤسسة أو الشركة', placeholder: 'مثال: شركة النور للتجارة' },
    { key: 'phone', label: 'رقم الهاتف', placeholder: 'مثال: 0550123456', isMono: true, dir: 'ltr' },
    { key: 'email', label: 'البريد الإلكتروني', placeholder: 'مثال: client@example.com', isMono: true, dir: 'ltr' },
    { key: 'nif', label: 'رقم التعريف الجبائي (NIF)', placeholder: 'مثال: 001216000123456', isMono: true, dir: 'ltr' },
    { key: 'nis', label: 'رقم التعريف الإحصائي (NIS)', placeholder: 'مثال: 001216000123456', isMono: true, dir: 'ltr' },
    { key: 'rc', label: 'رقم السجل التجاري (RC)', placeholder: 'مثال: 16/00-1234567A00', isMono: true, dir: 'ltr' },
    { key: 'activity_type', label: 'نوع النشاط', placeholder: 'مثال: تجارة عامة' },
    { key: 'location', label: 'موقع النشاط', placeholder: 'مثال: الجزائر العاصمة' },
  ]

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl">إضافة تاجر جديد</CardTitle>
      </CardHeader>
      <CardContent>
        {submitSuccess && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-status-good/30 bg-status-good/10 px-4 py-3 text-sm text-status-good">
            <span className="inline-block h-2 w-2 rounded-full bg-status-good" />
            تم إضافة التاجر بنجاح! جاري إعادة التوجيه...
          </div>
        )}

        {submitError && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {formFields.map(({ key, label, placeholder, isMono, dir }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`field-${key}`}>{label}</Label>
              <Input
                id={`field-${key}`}
                value={values[key]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(key, e.target.value)}
                onBlur={() => handleBlur(key)}
                placeholder={placeholder}
                className={`${isMono ? 'font-mono-code' : ''} ${
                  touched[key] && errors[key] ? 'border-destructive focus-visible:ring-destructive' : ''
                }`}
                disabled={submitting || submitSuccess}
                dir={dir || 'rtl'}
              />
              {touched[key] && errors[key] && (
                <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                  {errors[key]}
                </p>
              )}
            </div>
          ))}

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full"
              disabled={!isFormValid() || submitting || submitSuccess}
              id="submit-client"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  حفظ التاجر
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

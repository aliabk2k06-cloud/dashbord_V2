export type ValidationResult = {
  valid: boolean
  message: string
}

/**
 * NIF: أرقام فقط، الطول = 15 أو 20 بالضبط
 */
export function validateNIF(value: string): ValidationResult {
  const trimmed = value.trim()
  if (!trimmed) {
    return { valid: false, message: 'رقم NIF مطلوب' }
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, message: 'رقم NIF يجب أن يحتوي على أرقام فقط' }
  }
  if (trimmed.length !== 15 && trimmed.length !== 20) {
    return { valid: false, message: `رقم NIF يجب أن يكون 15 أو 20 رقماً (الطول الحالي: ${trimmed.length})` }
  }
  return { valid: true, message: '' }
}

/**
 * NIS: أرقام فقط، الطول = 15 أو 18 بالضبط
 */
export function validateNIS(value: string): ValidationResult {
  const trimmed = value.trim()
  if (!trimmed) {
    return { valid: false, message: 'رقم NIS مطلوب' }
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, message: 'رقم NIS يجب أن يحتوي على أرقام فقط' }
  }
  if (trimmed.length !== 15 && trimmed.length !== 18) {
    return { valid: false, message: `رقم NIS يجب أن يكون 15 أو 18 رقماً (الطول الحالي: ${trimmed.length})` }
  }
  return { valid: true, message: '' }
}

/**
 * RC: نمط تقريبي \d{2}/\d{2}-\d{7}[A-Z]\d{2} (مرن لدعم أرقام السجلات القديمة والجديدة)
 */
export function validateRC(value: string): ValidationResult {
  const trimmed = value.trim()
  if (!trimmed) {
    return { valid: false, message: 'رقم السجل التجاري مطلوب' }
  }
  const rcPattern = /^\d{2}\/\d{2}\s*-\s*\d{7}[A-Za-z]\d{2}$/
  if (!rcPattern.test(trimmed)) {
    return { valid: false, message: 'صيغة السجل التجاري غير صحيحة (مثال: 16/00-1234567A00)' }
  }
  return { valid: true, message: '' }
}

/**
 * Phone: أرقام، أطوال وأرقام جزائرية/دولية (مثال: 0550123456 أو 021123456)
 */
export function validatePhone(value: string): ValidationResult {
  const trimmed = value.trim()
  if (!trimmed) {
    return { valid: false, message: 'رقم الهاتف مطلوب' }
  }
  const simplePhonePattern = /^[\d\s+]{9,15}$/

  if (!simplePhonePattern.test(trimmed)) {
    return { valid: false, message: 'رقم الهاتف غير صحيح (مثال: 0550123456)' }
  }
  return { valid: true, message: '' }
}

/**
 * Email: صيغة بريد إلكتروني قياسية
 */
export function validateEmail(value: string): ValidationResult {
  const trimmed = value.trim()
  if (!trimmed) {
    return { valid: false, message: 'البريد الإلكتروني مطلوب' }
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(trimmed)) {
    return { valid: false, message: 'صيغة البريد الإلكتروني غير صحيحة (مثال: example@domain.com)' }
  }
  return { valid: true, message: '' }
}

/**
 * تحقق أن الحقل غير فارغ
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value.trim()) {
    return { valid: false, message: `${fieldName} مطلوب` }
  }
  return { valid: true, message: '' }
}

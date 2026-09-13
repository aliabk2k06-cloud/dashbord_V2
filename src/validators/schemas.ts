import { z } from 'zod'

/**
 * Algerian Tax Number (NIF) validation schema
 * Length must be 15 or 20 digits.
 */
export const nifSchema = z
  .string()
  .trim()
  .min(1, 'رقم NIF مطلوب')
  .refine((val) => /^\d+$/.test(val), 'رقم NIF يجب أن يحتوي على أرقام فقط')
  .refine((val) => val.length === 15 || val.length === 20, 'رقم NIF يجب أن يكون 15 أو 20 رقماً')

/**
 * Algerian NIS validation schema
 */
export const nisSchema = z
  .string()
  .trim()
  .min(1, 'رقم NIS مطلوب')
  .refine((val) => /^\d+$/.test(val), 'رقم NIS يجب أن يحتوي على أرقام فقط')
  .refine((val) => val.length === 15 || val.length === 18, 'رقم NIS يجب أن يكون 15 أو 18 رقماً')

/**
 * Algerian Commercial Register (RC) validation schema
 * Flexible pattern matching e.g. 16/00-1234567A00
 */
export const rcSchema = z
  .string()
  .trim()
  .min(1, 'رقم السجل التجاري مطلوب')
  .refine((val) => /^\d{2}\/\d{2}\s*-\s*\d{7}[A-Za-z]\d{2}$/.test(val), 'صيغة السجل التجاري غير صحيحة (مثال: 16/00-1234567A00)')

/**
 * Client Zod Schema
 */
export const clientSchema = z.object({
  owner_name: z.string().trim().min(2, 'اسم صاحب المؤسسة مطلوب (حرفين على الأقل)'),
  business_name: z.string().trim().min(2, 'الاسم التجاري / المؤسسة مطلوب'),
  nif: nifSchema,
  nis: nisSchema,
  rc: rcSchema,
  activity_type: z.string().trim().min(2, 'نوع النشاط مطلوب'),
  location: z.string().trim().min(2, 'العنوان / المقر التجاري مطلوب'),
  phone: z.string().trim().optional().or(z.literal('')),
  email: z.string().trim().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  documents_status: z.enum(['up_to_date', 'pending', 'missing']).optional().default('pending'),
})

export type ClientSchemaInput = z.infer<typeof clientSchema>

/**
 * Invoice Zod Schema
 */
export const invoiceSchema = z.object({
  invoice_number: z.string().trim().min(1, 'رقم الفاتورة مطلوب'),
  type: z.enum(['purchase', 'sale'], { message: 'نوع الفاتورة يجب أن يكون مشتريات (purchase) أو مبيعات (sale)' }),
  amount_ht: z.number({ message: 'المبلغ الخاضع للضريبة يجب أن يكون رقماً' }).min(0, 'المبلغ لا يمكن أن يكون سالباً'),
  tva_rate: z.number({ message: 'نسبة الرسم يجب أن تكون رقماً' }).min(0).max(100).default(19),
  amount_ttc: z.number({ message: 'المبلغ الإجمالي يجب أن يكون رقماً' }).min(0, 'المبلغ الإجمالي لا يمكن أن يكون سالباً'),
  date: z.string().trim().min(1, 'تاريخ الفاتورة مطلوب'),
  counterparty: z.string().trim().min(1, 'اسم الزبون أو المورد مطلوب'),
  file_path: z.string().nullable().optional(),
  is_generated: z.union([z.boolean(), z.number()]).optional().default(0),
  notes: z.string().optional().default(''),
  fiscal_year: z.number().int().optional().default(2026),
})

export type InvoiceSchemaInput = z.infer<typeof invoiceSchema>

/**
 * Bank Statement Zod Schema
 */
export const bankStatementSchema = z.object({
  statement_number: z.string().trim().min(1, 'رقم الكشف البنكي مطلوب'),
  bank_name: z.string().trim().min(1, 'اسم البنك / البنك التابع مطلوب'),
  period: z.string().trim().min(1, 'فترة / شهر الكشف البنكي مطلوب'),
  start_date: z.string().optional().default(''),
  end_date: z.string().optional().default(''),
  debit_total: z.number().min(0, 'إجمالي السحبيات يجب أن يكون رقماً موجبًا').default(0),
  credit_total: z.number().min(0, 'إجمالي المقبوضات يجب أن يكون رقماً موجبًا').default(0),
  balance: z.number().default(0),
  file_path: z.string().nullable().optional(),
  notes: z.string().optional().default(''),
  fiscal_year: z.number().int().optional().default(2026),
})

export type BankStatementSchemaInput = z.infer<typeof bankStatementSchema>

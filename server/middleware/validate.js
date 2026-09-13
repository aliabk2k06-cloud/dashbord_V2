import { ZodError } from 'zod'

/**
 * Express middleware generator to validate request body against a Zod schema
 * @param {import('zod').ZodSchema} schema
 */
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        const firstIssue = err.issues[0]
        const message = firstIssue ? firstIssue.message : 'بيانات مدخلة غير صالحة'
        return res.status(400).json({
          error: true,
          message,
          code: 'VALIDATION_ERROR',
          details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        })
      }
      next(err)
    }
  }
}

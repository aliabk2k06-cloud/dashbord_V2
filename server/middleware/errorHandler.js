/**
 * Higher-order wrapper function to catch async errors in Express routes
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Centralized Express Error Handler Middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err)

  const statusCode = err.statusCode || 500
  const code = err.code || 'INTERNAL_SERVER_ERROR'
  const message = err.userMessage || err.message || 'حدث خطأ داخلي في الخادم المحلي'

  res.status(statusCode).json({
    error: true,
    code,
    message,
  })
}

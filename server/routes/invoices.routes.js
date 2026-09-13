import { Router } from 'express'
import { invoicesController } from '../controllers/invoices.controller.js'
import { validateBody } from '../middleware/validate.js'
import { upload } from '../middleware/upload.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { invoiceSchema } from '../schemas.js'

const router = Router()

// Client Invoices
router.get('/clients/:clientId/invoices', asyncHandler(invoicesController.getInvoices))
router.post('/clients/:clientId/invoices', validateBody(invoiceSchema), asyncHandler(invoicesController.createInvoice))
router.post('/clients/:clientId/upload', upload.single('file'), asyncHandler(invoicesController.uploadInvoiceFile))
router.get('/clients/:clientId/export-zip', asyncHandler(invoicesController.exportZip))

// Single Invoice Mutations
router.put('/invoices/:id', validateBody(invoiceSchema.partial()), asyncHandler(invoicesController.updateInvoice))
router.patch('/invoices/:id', validateBody(invoiceSchema.partial()), asyncHandler(invoicesController.patchInvoice))
router.delete('/invoices/:id', asyncHandler(invoicesController.deleteInvoice))

export default router

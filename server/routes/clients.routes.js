import { Router } from 'express'
import { clientsController } from '../controllers/clients.controller.js'
import { validateBody } from '../middleware/validate.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { clientSchema } from '../schemas.js'

const router = Router()

router.get('/', asyncHandler(clientsController.getAllClients))
router.get('/stats', asyncHandler(clientsController.getStats))
router.post('/', validateBody(clientSchema), asyncHandler(clientsController.createClient))
router.put('/:id', validateBody(clientSchema.partial()), asyncHandler(clientsController.updateClient))
router.delete('/:id', asyncHandler(clientsController.deleteClient))

// Fiscal years
router.get('/:clientId/years', asyncHandler(clientsController.getFiscalYears))
router.post('/:clientId/years', asyncHandler(clientsController.createFiscalYear))
router.put('/:clientId/years/:year', asyncHandler(clientsController.updateFiscalYearStatus))

export default router

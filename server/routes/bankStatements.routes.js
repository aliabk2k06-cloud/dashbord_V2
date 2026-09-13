import { Router } from 'express'
import { bankStatementsController } from '../controllers/bankStatements.controller.js'
import { validateBody } from '../middleware/validate.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { bankStatementSchema } from '../schemas.js'

const router = Router()

// Client Bank Statements
router.get('/clients/:clientId/bank-statements', asyncHandler(bankStatementsController.getBankStatements))
router.post('/clients/:clientId/bank-statements', validateBody(bankStatementSchema), asyncHandler(bankStatementsController.createBankStatement))
router.get('/clients/:clientId/export-bank-zip', asyncHandler(bankStatementsController.exportZip))

// Single Statement Mutations
router.put('/bank-statements/:id', validateBody(bankStatementSchema), asyncHandler(bankStatementsController.updateBankStatement))
router.delete('/bank-statements/:id', asyncHandler(bankStatementsController.deleteBankStatement))

export default router

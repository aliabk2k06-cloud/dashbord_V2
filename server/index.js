import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { config } from './config.js'
import clientsRoutes from './routes/clients.routes.js'
import invoicesRoutes from './routes/invoices.routes.js'
import bankStatementsRoutes from './routes/bankStatements.routes.js'
import accountsRoutes from './routes/accounts.routes.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(cors())
app.use(express.json())

// Ensure storage directory exists and serve statically
if (!fs.existsSync(config.storageDir)) {
  fs.mkdirSync(config.storageDir, { recursive: true })
}
app.use('/storage', express.static(config.storageDir))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'SQLite local (Modular Architecture)' })
})

// Routes
app.use('/api/clients', clientsRoutes)
app.use('/api', invoicesRoutes)
app.use('/api', bankStatementsRoutes)
app.use('/api/internal/accounts', accountsRoutes)

// Centralized Error Handling Middleware
app.use(errorHandler)

app.listen(config.port, config.host, () => {
  console.log(`🚀 SQLite Express Server running on http://127.0.0.1:${config.port}`)
})

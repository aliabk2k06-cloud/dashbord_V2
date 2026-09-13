import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'
import { clientsRepository } from '../repositories/clientsRepository.js'
import { config } from '../config.js'

export const clientsController = {
  async getAllClients(req, res) {
    const clients = await clientsRepository.findAll()
    res.json(clients)
  },

  async getStats(req, res) {
    const stats = await clientsRepository.getStats()
    res.json(stats)
  },

  async createClient(req, res) {
    const id = randomUUID()
    const { owner_name, business_name, nif, nis, rc, activity_type, location, phone, email } = req.body

    try {
      const client = await clientsRepository.create({
        id,
        owner_name,
        business_name,
        nif,
        nis,
        rc,
        activity_type,
        location,
        phone: phone || '',
        email: email || '',
        status: 'active',
        documents_status: 'pending',
      })

      // Create storage directory for new client
      const clientStorageDir = path.join(config.storageDir, 'clients', id, 'uploaded')
      if (!fs.existsSync(clientStorageDir)) {
        fs.mkdirSync(clientStorageDir, { recursive: true })
      }

      res.status(201).json(client)
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed: clients.nif')) {
        return res.status(400).json({ error: true, code: 'DUPLICATE_NIF', message: 'رقم NIF مستخدم مسبقاً لتاجر آخر' })
      }
      throw err
    }
  },

  async updateClient(req, res) {
    const { id } = req.params
    try {
      const updated = await clientsRepository.update(id, req.body)
      if (!updated) {
        return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'التاجر غير موجود' })
      }
      res.json({ message: 'تم تحديث بيانات التاجر بنجاح' })
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed: clients.nif')) {
        return res.status(400).json({ error: true, code: 'DUPLICATE_NIF', message: 'رقم NIF مستخدم مسبقاً لتاجر آخر' })
      }
      throw err
    }
  },

  async deleteClient(req, res) {
    const { id } = req.params
    const deleted = await clientsRepository.delete(id)
    if (!deleted) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'التاجر غير موجود' })
    }
    res.json({ message: 'تم حذف التاجر بنجاح' })
  },

  // Fiscal Years
  async getFiscalYears(req, res) {
    const { clientId } = req.params
    const years = await clientsRepository.findFiscalYears(clientId)

    if (years.length === 0) {
      const defaultId = randomUUID()
      const newYear = await clientsRepository.addFiscalYear(defaultId, clientId, 2026)
      return res.json([newYear])
    }
    res.json(years)
  },

  async createFiscalYear(req, res) {
    const { clientId } = req.params
    const { year, close_previous } = req.body

    if (!year) {
      return res.status(400).json({ error: true, code: 'MISSING_YEAR', message: 'السنة المالية مطلوبة' })
    }

    const newYear = parseInt(year, 10)
    const id = randomUUID()

    if (close_previous) {
      await clientsRepository.closePreviousYears(clientId)
    }

    try {
      const created = await clientsRepository.addFiscalYear(id, clientId, newYear)
      res.status(201).json(created)
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ error: true, code: 'DUPLICATE_YEAR', message: 'السنة المالية موجودة مسبقاً لهذا التاجر' })
      }
      throw err
    }
  },

  async updateFiscalYearStatus(req, res) {
    const { clientId, year } = req.params
    const { status } = req.body

    if (!status || !['open', 'closed'].includes(status)) {
      return res.status(400).json({ error: true, code: 'INVALID_STATUS', message: 'حالة السنة الجبائية يجب أن تكون open أو closed' })
    }

    const numYear = parseInt(year, 10)
    const id = randomUUID()

    await clientsRepository.updateFiscalYearStatus(id, clientId, numYear, status)
    res.json({ message: 'تم تغيير حالة السنة الجبائية بنجاح', year: numYear, status })
  },
}

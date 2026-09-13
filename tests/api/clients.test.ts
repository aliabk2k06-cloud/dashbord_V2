import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import clientsRoutes from '../../server/routes/clients.routes'
import { errorHandler } from '../../server/middleware/errorHandler'

const app = express()
app.use(express.json())
app.use('/api/clients', clientsRoutes)
app.use(errorHandler)

describe('Clients API Endpoints (Supertest)', () => {
  it('GET /api/clients should return 200 and array of clients', async () => {
    const res = await request(app).get('/api/clients')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('POST /api/clients with invalid NIF format should be rejected with 400 Validation Error', async () => {
    const invalidClient = {
      owner_name: 'علي أحمد',
      business_name: 'شركة الاختبار',
      nif: '123', // Invalid length (must be 15 or 20)
      nis: '001216000123456',
      rc: '16/00-1234567A00',
      activity_type: 'خدمات',
      location: 'الجزائر',
    }

    const res = await request(app).post('/api/clients').send(invalidClient)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe(true)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })
})

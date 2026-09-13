import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { config } from '../config.js'

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Sanitize clientId to prevent path traversal
    const rawClientId = req.params.clientId || 'general'
    const safeClientId = rawClientId.replace(/[^a-zA-Z0-9_-]/g, '')
    const targetDir = path.join(config.storageDir, 'clients', safeClientId, 'uploaded')

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    cb(null, targetDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const safeExt = ext.replace(/[^.a-z0-9]/g, '')
    const safeName = `${Date.now()}-${randomUUID().slice(0, 8)}${safeExt}`
    cb(null, safeName)
  },
})

const fileFilter = (req, file, cb) => {
  if (config.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    const err = new Error('نوع الملف غير مدعوم. يرجى رفع صور (PNG, JPG, WEBP) أو ملفات PDF أو أرشيف ZIP.')
    err.statusCode = 400
    err.code = 'INVALID_FILE_TYPE'
    cb(err, false)
  }
}

export const upload = multer({
  storage: multerStorage,
  limits: { fileSize: config.maxFileSize },
  fileFilter,
})

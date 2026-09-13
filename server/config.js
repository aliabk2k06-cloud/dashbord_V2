import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const config = {
  port: process.env.PORT || 3001,
  host: process.env.HOST || '0.0.0.0',
  dataDir: path.join(__dirname, 'data'),
  storageDir: path.join(__dirname, 'storage'),
  maxFileSize: 15 * 1024 * 1024, // 15MB
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed',
  ],
  n8n: {
    apiUrl: process.env.N8N_API_URL || 'http://localhost:5678',
    apiKey: process.env.N8N_API_KEY || '',
  },
}


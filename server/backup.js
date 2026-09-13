import fs from 'fs'
import path from 'path'

/**
 * Perform automatic SQLite database backup and maintain maximum 7 recent backup files.
 * @param {string} dbPath - Absolute path to SQLite database file
 */
export function runAutoBackup(dbPath) {
  try {
    if (!fs.existsSync(dbPath)) {
      return
    }

    const backupsDir = path.join(path.dirname(dbPath), '..', 'backups')
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true })
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `backup_${dateStr}.sqlite`
    const backupPath = path.join(backupsDir, backupFileName)

    // Copy database file
    fs.copyFileSync(dbPath, backupPath)
    console.log(`[Backup] Automatic backup created: ${backupFileName}`)

    // Cleanup old backups - retain max 7
    const files = fs
      .readdirSync(backupsDir)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.sqlite'))
      .map((f) => ({
        name: f,
        path: path.join(backupsDir, f),
        mtime: fs.statSync(path.join(backupsDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime)

    if (files.length > 7) {
      const toDelete = files.slice(7)
      for (const file of toDelete) {
        fs.unlinkSync(file.path)
        console.log(`[Backup] Cleaned up old backup: ${file.name}`)
      }
    }
  } catch (err) {
    console.error('[Backup] Error creating automatic database backup:', err.message)
  }
}

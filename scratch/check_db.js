import sqlite3 from 'sqlite3'
const db = new sqlite3.Database('./server/data/database.sqlite')
db.all("SELECT * FROM accounts", [], (err, rows) => {
  if (err) console.error('DB Error:', err)
  else console.log(rows)
})

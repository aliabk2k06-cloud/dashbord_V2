import type { Client } from '../types/client'
import type { InvoiceInsert } from '../types/invoice'

export function sanitizeFilename(name: string): string {
  if (!name) return 'document'
  return name.replace(/[\\/:*?"<>|\r\n]/g, '-').replace(/\s+/g, '_').trim()
}



export function generateInvoiceHTML(client: Client, invoice: InvoiceInsert & { items?: Array<{ desc: string; qty: number; unit_price: number; tva_rate: number }> }): string {
  const isSale = invoice.type === 'sale'
  const typeLabel = isSale ? 'Facture de Vente' : 'Facture d\'Achat'

  const fmt = (n: number) => {
    const parts = (n || 0).toFixed(2).split('.')
    const intPart = (parts[0] || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    const decPart = parts[1] || '00'
    return intPart + ',' + decPart
  }

  const rawItems = (invoice.items && invoice.items.length > 0) ? invoice.items : [
    {
      desc: invoice.notes || (isSale ? 'Vente de marchandises & Prestations de services' : 'Achat de marchandises & Prestations'),
      qty: 1,
      unit_price: invoice.amount_ht || 0,
      tva_rate: invoice.tva_rate || 19
    }
  ]

  const items = rawItems.map((item, i) => {
    const ht = (item.qty || 1) * (item.unit_price || 0)
    const tva_amount = ht * ((item.tva_rate ?? invoice.tva_rate ?? 19) / 100)
    const ttc = ht + tva_amount
    return {
      num: i + 1,
      desc: item.desc,
      qty: item.qty || 1,
      unit_price: item.unit_price || 0,
      tva_rate: item.tva_rate ?? invoice.tva_rate ?? 19,
      ht,
      tva_amount,
      ttc
    }
  })

  const total_ht = items.reduce((s, i) => s + i.ht, 0)
  const total_tva = items.reduce((s, i) => s + i.tva_amount, 0)
  const total_ttc = items.reduce((s, i) => s + i.ttc, 0)

  const itemRows = items.map(item => `
    <tr>
      <td class="cell-center">${item.num}</td>
      <td class="cell-desc">${item.desc}</td>
      <td class="cell-center">${item.qty}</td>
      <td class="cell-right">${fmt(item.unit_price)}</td>
      <td class="cell-right">${fmt(item.ht)}</td>
      <td class="cell-center">${item.tva_rate}%</td>
      <td class="cell-right">${fmt(item.ttc)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture N° ${invoice.invoice_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');

    @font-face {
      font-family: 'Tafkir Arabic';
      src: url('/fonts/Tafkir-Arabic.otf') format('opentype');
      font-weight: normal;
      font-style: normal;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Cairo', system-ui, -apple-system, sans-serif;
      font-size: 11px;
      color: #1e293b;
      background: #f8fafc;
      padding: 20px;
      -webkit-font-smoothing: antialiased;
    }

    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #0f766e;
      color: white;
      border: none;
      padding: 10px 22px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(15, 118, 110, 0.35);
      z-index: 9999;
      transition: all 0.2s ease;
    }

    .print-btn:hover {
      background: #0d9488;
      transform: translateY(-1px);
    }

    .page {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
      position: relative;
    }

    /* ─── Header ─── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      border-bottom: 3px solid #0f766e;
      padding-bottom: 16px;
    }

    .brand-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }

    .brand-subtitle {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
      font-weight: 600;
    }

    .meta-box {
      text-align: right;
      font-size: 12px;
      line-height: 1.6;
    }

    .meta-number {
      font-size: 14px;
      font-weight: 800;
      color: #0f766e;
    }

    .meta-label {
      color: #64748b;
      font-weight: 500;
    }

    /* ─── Parties ─── */
    .parties {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
    }

    .party-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
    }

    .party-card.primary { border-left: 4px solid #0f766e; }
    .party-card.secondary { border-left: 4px solid #0284c7; }

    .party-header {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #cbd5e1;
    }

    .party-card.primary .party-header { color: #0f766e; }
    .party-card.secondary .party-header { color: #0284c7; }

    .party-row {
      display: flex;
      margin-bottom: 6px;
      font-size: 11.5px;
      line-height: 1.45;
    }

    .party-label {
      width: 95px;
      font-weight: 600;
      color: #64748b;
      flex-shrink: 0;
      font-size: 10.5px;
    }

    .party-value {
      color: #0f172a;
      font-weight: 600;
      word-break: break-word;
      unicode-bidi: plaintext;
    }

    /* ─── Items Table ─── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      border-radius: 6px;
      overflow: hidden;
    }

    .items-table th {
      background: #0f766e;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
    }

    .items-table th.th-center { text-align: center; }
    .items-table th.th-right { text-align: right; }

    .items-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
      color: #334155;
      vertical-align: top;
      font-variant-numeric: tabular-nums;
    }

    .items-table tr:nth-child(even) { background-color: #f8fafc; }

    .cell-center { text-align: center; white-space: nowrap; }
    .cell-right { text-align: right; white-space: nowrap; font-weight: 600; }
    .cell-desc { unicode-bidi: plaintext; line-height: 1.45; }

    /* ─── Totals Section ─── */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }

    .totals-box {
      width: 320px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 14px;
      font-size: 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #475569;
    }

    .total-row .label { font-weight: 600; }
    .total-row .value { font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }

    .total-row.grand {
      background: #0f766e;
      color: #ffffff;
      padding: 14px;
      font-size: 15px;
      border-bottom: none;
    }

    .total-row.grand .label { font-weight: 800; color: #ffffff; }
    .total-row.grand .value { font-weight: 800; color: #ffffff; font-size: 16px; }

    /* ─── Notes ─── */
    .notes-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 24px;
      font-size: 11px;
      color: #475569;
      line-height: 1.5;
    }

    .notes-title {
      font-weight: 700;
      color: #0f766e;
      margin-bottom: 4px;
      font-size: 11.5px;
    }

    .notes-content { white-space: pre-line; unicode-bidi: plaintext; }

    /* ─── Footer ─── */
    .footer {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
    }

    @media print {
      body { background: white; padding: 0; }
      .page { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .print-btn { display: none !important; }
    }
  </style>
</head>
<body>
  <button onclick="window.print()" class="print-btn">🖨️ Imprimer / Enregistrer PDF</button>

  <div class="page">
    <div class="header">
      <div>
        <div class="brand-title">FACTURE COMMERCIALE</div>
        <div class="brand-subtitle">${typeLabel}</div>
      </div>
      <div class="meta-box">
        <div><span class="meta-label">N° Facture:</span> <span class="meta-number">${invoice.invoice_number}</span></div>
        <div><span class="meta-label">Date:</span> <strong>${invoice.date}</strong></div>
        <div><span class="meta-label">Exercice Fiscal:</span> <strong>${invoice.fiscal_year || new Date().getFullYear()}</strong></div>
      </div>
    </div>

    <div class="parties">
      <div class="party-card primary">
        <div class="party-header">${isSale ? 'Émetteur / Vendeur' : 'Émetteur / Fournisseur'}</div>
        ${isSale ? `
        <div class="party-row">
          <span class="party-label">Gérant:</span>
          <span class="party-value">${client.owner_name}</span>
        </div>
        <div class="party-row">
          <span class="party-label">Raison Sociale:</span>
          <span class="party-value">${client.business_name}</span>
        </div>
        <div class="party-row">
          <span class="party-label">NIF:</span>
          <span class="party-value">${client.nif || '—'}</span>
        </div>
        <div class="party-row">
          <span class="party-label">RC:</span>
          <span class="party-value">${client.rc || '—'}</span>
        </div>
        <div class="party-row">
          <span class="party-label">Adresse:</span>
          <span class="party-value">${client.location}</span>
        </div>
        <div class="party-row">
          <span class="party-label">Tél:</span>
          <span class="party-value">${client.phone || '—'}</span>
        </div>
        ` : `
        <div class="party-row">
          <span class="party-label">Fournisseur:</span>
          <span class="party-value">${invoice.counterparty}</span>
        </div>
        <div class="party-row">
          <span class="party-label">Type Opération:</span>
          <span class="party-value">Achat (Fournisseur)</span>
        </div>
        <div class="party-row">
          <span class="party-label">Date Facture:</span>
          <span class="party-value">${invoice.date}</span>
        </div>
        `}
      </div>

      <div class="party-card secondary">
        <div class="party-header">${isSale ? 'Destinataire / Client' : 'Destinataire / Acheteur (Client)'}</div>
        ${isSale ? `
        <div class="party-row">
          <span class="party-label">Nom / Entité:</span>
          <span class="party-value">${invoice.counterparty}</span>
        </div>
        <div class="party-row">
          <span class="party-label">Type Opération:</span>
          <span class="party-value">Vente (Client)</span>
        </div>
        <div class="party-row">
          <span class="party-label">Date Facture:</span>
          <span class="party-value">${invoice.date}</span>
        </div>
        ` : `
        <div class="party-row">
          <span class="party-label">Gérant:</span>
          <span class="party-value">${client.owner_name}</span>
        </div>
        <div class="party-row">
          <span class="party-label">Raison Sociale:</span>
          <span class="party-value">${client.business_name}</span>
        </div>
        <div class="party-row">
          <span class="party-label">NIF:</span>
          <span class="party-value">${client.nif || '—'}</span>
        </div>
        <div class="party-row">
          <span class="party-label">RC:</span>
          <span class="party-value">${client.rc || '—'}</span>
        </div>
        <div class="party-row">
          <span class="party-label">Adresse:</span>
          <span class="party-value">${client.location}</span>
        </div>
        <div class="party-row">
          <span class="party-label">Tél:</span>
          <span class="party-value">${client.phone || '—'}</span>
        </div>
        `}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 4%;" class="th-center">#</th>
          <th style="width: 38%;">Désignation des articles & Prestations</th>
          <th style="width: 5%;" class="th-center">Qté</th>
          <th style="width: 16%;" class="th-right">Prix Unit.</th>
          <th style="width: 16%;" class="th-right">Montant HT</th>
          <th style="width: 5%;" class="th-center">TVA</th>
          <th style="width: 16%;" class="th-right">Total TTC</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="summary-section">
      <div class="totals-box">
        <div class="total-row">
          <span class="label">Total HT</span>
          <span class="value">${fmt(total_ht)} <small style="font-size: 9px;">DA</small></span>
        </div>
        <div class="total-row">
          <span class="label">Total TVA (${invoice.tva_rate}%)</span>
          <span class="value">${fmt(total_tva)} <small style="font-size: 9px;">DA</small></span>
        </div>
        <div class="total-row grand">
          <span class="label">TOTAL TTC</span>
          <span class="value">${fmt(total_ttc)} <small style="font-size: 11px;">DA</small></span>
        </div>
      </div>
    </div>

    ${invoice.notes ? `
    <div class="notes-box">
      <div class="notes-title">Observations / Conditions:</div>
      <div class="notes-content">${invoice.notes}</div>
    </div>
    ` : ''}

    <div class="footer">
      Document PDF officiel généré via la plateforme Comptable Numérique — Tous droits réservés © ${invoice.fiscal_year || new Date().getFullYear()}
    </div>
  </div>
</body>
</html>`
}

export async function generateInvoicePDFBlob(client: Client, invoice: InvoiceInsert & { items?: Array<{ desc: string; qty: number; unit_price: number; tva_rate: number }> }): Promise<Blob> {
  // First attempt: High-performance vector PDF via backend Puppeteer service
  try {
    const resp = await fetch('/api/pdf/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client, invoice })
    })

    if (resp.ok) {
      return await resp.blob()
    }
    console.warn(`Vector PDF endpoint returned status ${resp.status}, trying client-side fallback...`)
  } catch (err) {
    console.warn('Backend vector PDF engine fetch failed, using client-side fallback:', err)
  }

  // Fallback: Return HTML content as blob for in-browser rendering
  const html = generateInvoiceHTML(client, invoice)
  return new Blob([html], { type: 'text/html;charset=utf-8' })
}

export async function generateInvoicePDF(client: Client, invoice: InvoiceInsert): Promise<string> {
  try {
    const blob = await generateInvoicePDFBlob(client, invoice)
    return URL.createObjectURL(blob)
  } catch {
    const html = generateInvoiceHTML(client, invoice)
    return 'data:text/html;charset=utf-8,' + encodeURIComponent(html)
  }
}

export async function downloadInvoicePDF(client: Client, invoice: InvoiceInsert & { file_path?: string | null }) {
  const safeNum = sanitizeFilename(invoice.invoice_number || 'Facture')
  const fileName = `Facture_${safeNum}.pdf`

  if (invoice.file_path) {
    const fullUrl = invoice.file_path.startsWith('http')
      ? invoice.file_path
      : `http://127.0.0.1:3001${invoice.file_path}`

    try {
      const resp = await fetch(fullUrl)
      if (!resp.ok) throw new Error('Fetch failed')
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
    } catch {
      const a = document.createElement('a')
      a.href = fullUrl
      a.download = fileName
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  } else {
    try {
      const blob = await generateInvoicePDFBlob(client, invoice)
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
    } catch (err) {
      console.error('Download invoice PDF failed:', err)
      const htmlContent = generateInvoiceHTML(client, invoice)
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(htmlContent)
        win.document.close()
      }
    }
  }
}

export async function openInvoiceInNewTab(client: Client, invoice: InvoiceInsert & { file_path?: string | null }) {
  if (invoice.file_path) {
    const fullUrl = invoice.file_path.startsWith('http')
      ? invoice.file_path
      : `http://127.0.0.1:3001${invoice.file_path}`
    window.open(fullUrl, '_blank')
    return
  }

  // Open window synchronously to avoid browser popup blocker
  const win = window.open('about:blank', '_blank')
  if (win) {
    win.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>جاري فتح الفاتورة...</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #0f172a;
              color: #f8fafc;
            }
            .loader-box {
              text-align: center;
              padding: 32px;
              background: #1e293b;
              border: 1px solid #334155;
              border-radius: 16px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            }
            .spinner {
              width: 36px;
              height: 36px;
              border: 4px solid rgba(15, 118, 110, 0.2);
              border-left-color: #0d9488;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="loader-box">
            <div class="spinner"></div>
            <div style="font-size: 15px; font-weight: 700;">جاري فتح وتوليد وثيقة الفاتورة Vector PDF...</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">يرجى الانتظار لحظة صغيرة</div>
          </div>
        </body>
      </html>
    `)
  }

  try {
    const blob = await generateInvoicePDFBlob(client, invoice)
    const blobUrl = URL.createObjectURL(blob)
    if (win && !win.closed) {
      win.location.href = blobUrl
    } else {
      window.open(blobUrl, '_blank')
    }
  } catch (err) {
    console.error('Error opening vector PDF in new tab:', err)
    if (win && !win.closed) {
      win.close()
    }
    const htmlContent = generateInvoiceHTML(client, invoice)
    const fallbackWin = window.open('', '_blank')
    if (fallbackWin) {
      fallbackWin.document.write(htmlContent)
      fallbackWin.document.close()
    }
  }
}

export function generateBankStatementHTML(client: Client, statement: { statement_number: string; bank_name: string; period: string; start_date?: string | null; end_date?: string | null; debit_total: number; credit_total: number; balance: number; notes?: string | null; fiscal_year?: number }): string {
  const netBalance = statement.balance
  const isPositive = netBalance >= 0

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>كشف بنكي رقم ${statement.statement_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; }
    body {
      font-family: 'Cairo', system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 24px;
      direction: rtl;
    }
    .invoice-card {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
      position: relative;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #0284c7;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .title {
      color: #0284c7;
      font-size: 26px;
      font-weight: 800;
      margin: 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: #e0f2fe;
      color: #0369a1;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      margin-top: 6px;
    }
    .meta-box {
      text-align: left;
      font-size: 13px;
      color: #475569;
      line-height: 1.6;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .party-box {
      background: #f1f5f9;
      padding: 18px;
      border-radius: 12px;
      border-right: 5px solid #0284c7;
    }
    .party-box h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #0f172a;
    }
    .party-box p {
      margin: 4px 0;
      font-size: 13px;
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th, td {
      padding: 12px 16px;
      text-align: right;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
    }
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    .totals-box {
      width: 320px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      color: #475569;
    }
    .totals-row.grand {
      border-top: 2px solid #cbd5e1;
      margin-top: 6px;
      padding-top: 10px;
      font-weight: 800;
      font-size: 16px;
      color: ${isPositive ? '#16a34a' : '#dc2626'};
    }
    .footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 20px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header-bar">
      <div>
        <h1 class="title">كشف حساب بنكي (Relevé BANCANCE)</h1>
        <span class="badge">مرجع: ${statement.statement_number}</span>
      </div>
      <div class="meta-box">
        <p><strong>التاريخ والتوقيت:</strong> ${new Date().toLocaleDateString('ar-DZ')}</p>
        <p><strong>السنة الجبائية:</strong> ${statement.fiscal_year || new Date().getFullYear()}</p>
      </div>
    </div>

    <div class="grid">
      <div class="party-box">
        <h3>بيانات التاجر / الحساب:</h3>
        <p><strong>الاسم واللقب:</strong> ${client.owner_name}</p>
        <p><strong>اسم النشاط:</strong> ${client.business_name}</p>
        <p><strong>الرقم الجبائي NIF:</strong> ${client.nif}</p>
      </div>
      <div class="party-box">
        <h3>بيانات المؤسسة المصرفية والكشف:</h3>
        <p><strong>المؤسسة المالية:</strong> ${statement.bank_name}</p>
        <p><strong>فترة الكشف:</strong> ${statement.period}</p>
        <p><strong>النطاق الزمني:</strong> ${statement.start_date || '—'} إلى ${statement.end_date || '—'}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>بيان الحركة المصرفية والتفاصيل</th>
          <th style="width: 140px;">المصروفات (Débit)</th>
          <th style="width: 140px;">المقبوضات (Crédit)</th>
          <th style="width: 160px;">الرصيد الصافي (Solde Net)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${statement.notes || 'حركة الحساب المصرفي خلال الفترة المحددة'}</td>
          <td style="color: #dc2626; font-weight: 700;">${statement.debit_total.toFixed(2)} د.ج</td>
          <td style="color: #16a34a; font-weight: 700;">${statement.credit_total.toFixed(2)} د.ج</td>
          <td style="color: ${isPositive ? '#16a34a' : '#dc2626'}; font-weight: 800;">${netBalance.toFixed(2)} د.ج</td>
        </tr>
      </tbody>
    </table>

    <div class="totals-wrapper">
      <div class="totals-box">
        <div class="totals-row">
          <span>إجمالي المقبوضات (Crédit):</span>
          <span style="color: #16a34a; font-weight: 700;">+ ${statement.credit_total.toFixed(2)} د.ج</span>
        </div>
        <div class="totals-row">
          <span>إجمالي المصروفات (Débit):</span>
          <span style="color: #dc2626; font-weight: 700;">- ${statement.debit_total.toFixed(2)} د.ج</span>
        </div>
        <div class="totals-row grand">
          <span>الرصيد الصافي (Solde):</span>
          <span>${netBalance.toFixed(2)} د.ج</span>
        </div>
      </div>
    </div>

    <div class="footer">
      وثيقة كشف بنكي صادرة عن طريق المنظومة المحاسبية الرقمية — جميع الحقوق محفوظة © ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>`
}

export async function generateBankStatementPDFBlob(client: Client, statement: { statement_number: string; bank_name: string; period: string; start_date?: string | null; end_date?: string | null; debit_total: number; credit_total: number; balance: number; notes?: string | null; fiscal_year?: number }): Promise<Blob> {
  try {
    const resp = await fetch('/api/pdf/bank-statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client, statement })
    })

    if (resp.ok) {
      return await resp.blob()
    }
  } catch (err) {
    console.warn('Backend bank statement PDF fetch failed, fallback to HTML:', err)
  }

  const htmlContent = generateBankStatementHTML(client, statement)
  return new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
}

export async function downloadBankStatementPDF(client: Client, statement: { statement_number: string; bank_name: string; period: string; start_date?: string | null; end_date?: string | null; debit_total: number; credit_total: number; balance: number; notes?: string | null; fiscal_year?: number; file_path?: string | null }) {
  const safeNum = sanitizeFilename(statement.statement_number || 'Releve')
  const fileName = `Releve_Bancaire_${safeNum}.pdf`

  try {
    const blob = await generateBankStatementPDFBlob(client, statement)
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
  } catch (err) {
    console.error('Download bank statement failed:', err)
    openBankStatementInNewTab(client, statement)
  }
}

export async function openBankStatementInNewTab(client: Client, statement: { statement_number: string; bank_name: string; period: string; start_date?: string | null; end_date?: string | null; debit_total: number; credit_total: number; balance: number; notes?: string | null; fiscal_year?: number; file_path?: string | null }) {
  if (statement.file_path) {
    const fullUrl = statement.file_path.startsWith('http')
      ? statement.file_path
      : `http://127.0.0.1:3001${statement.file_path}`
    window.open(fullUrl, '_blank')
    return
  }

  // Open window synchronously to avoid browser popup blocker
  const win = window.open('about:blank', '_blank')
  if (win) {
    win.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>جاري فتح الكشف البنكي...</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #0f172a;
              color: #f8fafc;
            }
            .loader-box {
              text-align: center;
              padding: 32px;
              background: #1e293b;
              border: 1px solid #334155;
              border-radius: 16px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            }
            .spinner {
              width: 36px;
              height: 36px;
              border: 4px solid rgba(2, 132, 199, 0.2);
              border-left-color: #0284c7;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="loader-box">
            <div class="spinner"></div>
            <div style="font-size: 15px; font-weight: 700;">جاري فتح وتوليد الكشف البنكي Vector PDF...</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">يرجى الانتظار لحظة صغيرة</div>
          </div>
        </body>
      </html>
    `)
  }

  try {
    const blob = await generateBankStatementPDFBlob(client, statement)
    const blobUrl = URL.createObjectURL(blob)
    if (win && !win.closed) {
      win.location.href = blobUrl
    } else {
      window.open(blobUrl, '_blank')
    }
  } catch (err) {
    console.error('Error opening bank statement PDF in new tab:', err)
    if (win && !win.closed) {
      win.close()
    }
    const htmlContent = generateBankStatementHTML(client, statement)
    const fallbackWin = window.open('', '_blank')
    if (fallbackWin) {
      fallbackWin.document.write(htmlContent)
      fallbackWin.document.close()
    }
  }
}


import fs from 'fs'
import path from 'path'

function formatNumber(n) {
  const parts = (n || 0).toFixed(2).split('.')
  const intPart = (parts[0] || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return intPart + ',' + (parts[1] || '00')
}

let cairoFontBase64 = null

function loadFontsBase64() {
  if (cairoFontBase64) return
  try {
    const cairoPath = path.resolve('public/fonts/Cairo-Regular.ttf')
    if (fs.existsSync(cairoPath)) {
      cairoFontBase64 = fs.readFileSync(cairoPath).toString('base64')
    }
  } catch (e) {
    console.warn('Could not load Cairo font Base64:', e.message)
  }
}

/**
 * Builds a production-grade HTML template for Invoice Vector PDF Generation.
 * Solves Arabic text reversal by utilizing Google Cairo font & CSS dir="auto" + unicode-bidi.
 */
export function buildInvoiceHTML(client, invoice) {
  loadFontsBase64()

  const isSale = invoice.type === 'sale'
  const typeLabelFr = isSale ? 'Facture de Vente' : 'Facture d\'Achat'
  const typeLabelAr = isSale ? 'فاتورة مبيعات' : 'فاتورة مشتريات'

  const rawItems = (invoice.items && invoice.items.length > 0) ? invoice.items : [
    {
      desc: invoice.notes || (isSale ? 'Vente de marchandises & Prestations de services' : 'Achat de marchandises & Prestations'),
      qty: 1,
      unit_price: invoice.amount_ht || 0,
      tva_rate: invoice.tva_rate ?? 19
    }
  ]

  const items = rawItems.map((item, i) => {
    const qty = item.qty || 1
    const price = item.unit_price || 0
    const ht = qty * price
    const tvaRate = item.tva_rate ?? invoice.tva_rate ?? 19
    const tvaAmount = ht * (tvaRate / 100)
    const ttc = ht + tvaAmount
    return {
      num: i + 1,
      desc: item.desc,
      qty,
      unit_price: price,
      tva_rate: tvaRate,
      ht,
      tvaAmount,
      ttc
    }
  })

  const total_ht = items.reduce((s, i) => s + i.ht, 0)
  const total_tva = items.reduce((s, i) => s + i.tvaAmount, 0)
  const total_ttc = items.reduce((s, i) => s + i.ttc, 0)

  const itemRows = items.map(item => `
    <tr>
      <td class="cell-center">${item.num}</td>
      <td class="cell-desc" dir="auto">${item.desc}</td>
      <td class="cell-center">${item.qty}</td>
      <td class="cell-right">${formatNumber(item.unit_price)}</td>
      <td class="cell-right">${formatNumber(item.ht)}</td>
      <td class="cell-center">${item.tva_rate}%</td>
      <td class="cell-right">${formatNumber(item.ttc)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoice.invoice_number}</title>
  <style>
    ${cairoFontBase64 ? `
    @font-face {
      font-family: 'Cairo Local';
      src: url('data:font/ttf;base64,${cairoFontBase64}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    ` : ''}

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Cairo Local', 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      font-size: 11px;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 14mm 16mm;
      position: relative;
      background: #ffffff;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 3px solid #0f766e;
    }

    .brand-title {
      font-size: 24px;
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
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .meta-box {
      text-align: right;
      font-size: 11.5px;
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

    /* Parties Cards */
    .parties {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }

    .party-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }

    .party-card.primary { border-left: 4px solid #0f766e; }
    .party-card.secondary { border-left: 4px solid #0284c7; }

    .party-header {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
    }

    .party-card.primary .party-header { color: #0f766e; }
    .party-card.secondary .party-header { color: #0284c7; }

    .party-row {
      display: flex;
      align-items: baseline;
      margin-bottom: 6px;
      font-size: 11px;
      line-height: 1.45;
    }

    .party-label {
      width: 100px;
      font-weight: 600;
      color: #64748b;
      flex-shrink: 0;
      font-size: 10.5px;
      text-align: left;
    }

    .party-value {
      flex: 1;
      color: #0f172a;
      font-weight: 600;
      word-break: break-word;
      text-align: left;
      direction: ltr;
      unicode-bidi: plaintext;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
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
      padding: 9px 10px;
      text-align: left;
    }

    .items-table th.th-center { text-align: center; }
    .items-table th.th-right { text-align: right; }

    .items-table td {
      padding: 9px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
      color: #334155;
      vertical-align: top;
      font-variant-numeric: tabular-nums;
    }

    .items-table tr:nth-child(even) { background-color: #f8fafc; }

    .cell-center { text-align: center; white-space: nowrap; }
    .cell-right { text-align: right; white-space: nowrap; font-weight: 600; }
    .cell-desc { unicode-bidi: isolate; line-height: 1.45; }

    /* Summary Totals */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
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
      padding: 9px 12px;
      font-size: 11.5px;
      border-bottom: 1px solid #e2e8f0;
      color: #475569;
    }

    .total-row .label { font-weight: 600; }
    .total-row .value { font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }

    .total-row.grand {
      background: #0f766e;
      color: #ffffff;
      padding: 12px;
      font-size: 14px;
      border-bottom: none;
    }

    .total-row.grand .label { font-weight: 800; color: #ffffff; }
    .total-row.grand .value { font-weight: 800; color: #ffffff; font-size: 15px; }

    /* Notes */
    .notes-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 20px;
      font-size: 10.5px;
      color: #475569;
      line-height: 1.5;
    }

    .notes-title {
      font-weight: 700;
      color: #0f766e;
      margin-bottom: 4px;
      font-size: 11px;
    }

    .notes-content { white-space: pre-line; unicode-bidi: isolate; }

    /* Footer */
    .footer {
      position: absolute;
      bottom: 12mm;
      left: 16mm;
      right: 16mm;
      text-align: center;
      font-size: 9.5px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
    }

    @page {
      size: A4;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="brand-title">FACTURE COMMERCIALE</div>
        <div class="brand-subtitle">
          <span>${typeLabelFr}</span>
          <span>•</span>
          <span dir="auto">${typeLabelAr}</span>
        </div>
      </div>
      <div class="meta-box">
        <div><span class="meta-label">N° Facture:</span> <span class="meta-number">${invoice.invoice_number}</span></div>
        <div><span class="meta-label">Date:</span> <strong>${invoice.date}</strong></div>
        <div><span class="meta-label">Exercice Fiscal:</span> <strong>${invoice.fiscal_year || new Date().getFullYear()}</strong></div>
      </div>
    </div>

    <div class="parties">
      <div class="party-card primary">
        <div class="party-header">
          <span>${isSale ? 'Émetteur / Vendeur' : 'Émetteur / Fournisseur'}</span>
        </div>
        ${isSale ? `
        <div class="party-row"><span class="party-label">Gérant:</span><span class="party-value">${client.owner_name || '—'}</span></div>
        <div class="party-row"><span class="party-label">Raison Sociale:</span><span class="party-value">${client.business_name || '—'}</span></div>
        <div class="party-row"><span class="party-label">NIF:</span><span class="party-value">${client.nif || '—'}</span></div>
        <div class="party-row"><span class="party-label">RC:</span><span class="party-value">${client.rc || '—'}</span></div>
        <div class="party-row"><span class="party-label">Adresse:</span><span class="party-value">${client.location || '—'}</span></div>
        <div class="party-row"><span class="party-label">Tél:</span><span class="party-value">${client.phone || '—'}</span></div>
        ` : `
        <div class="party-row"><span class="party-label">Fournisseur:</span><span class="party-value">${invoice.counterparty || '—'}</span></div>
        <div class="party-row"><span class="party-label">Type Opération:</span><span class="party-value">Achat (Fournisseur)</span></div>
        <div class="party-row"><span class="party-label">Date Facture:</span><span class="party-value">${invoice.date}</span></div>
        `}
      </div>

      <div class="party-card secondary">
        <div class="party-header">
          <span>${isSale ? 'Destinataire / Client' : 'Destinataire / Acheteur (Client)'}</span>
        </div>
        ${isSale ? `
        <div class="party-row"><span class="party-label">Nom / Entité:</span><span class="party-value">${invoice.counterparty || '—'}</span></div>
        <div class="party-row"><span class="party-label">Type Opération:</span><span class="party-value">Vente (Client)</span></div>
        <div class="party-row"><span class="party-label">Date Facture:</span><span class="party-value">${invoice.date}</span></div>
        ` : `
        <div class="party-row"><span class="party-label">Gérant:</span><span class="party-value">${client.owner_name || '—'}</span></div>
        <div class="party-row"><span class="party-label">Raison Sociale:</span><span class="party-value">${client.business_name || '—'}</span></div>
        <div class="party-row"><span class="party-label">NIF:</span><span class="party-value">${client.nif || '—'}</span></div>
        <div class="party-row"><span class="party-label">RC:</span><span class="party-value">${client.rc || '—'}</span></div>
        <div class="party-row"><span class="party-label">Adresse:</span><span class="party-value">${client.location || '—'}</span></div>
        <div class="party-row"><span class="party-label">Tél:</span><span class="party-value">${client.phone || '—'}</span></div>
        `}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 4%;" class="th-center">#</th>
          <th style="width: 38%;">Désignation des articles & Prestations</th>
          <th style="width: 6%;" class="th-center">Qté</th>
          <th style="width: 16%;" class="th-right">Prix Unit.</th>
          <th style="width: 16%;" class="th-right">Montant HT</th>
          <th style="width: 6%;" class="th-center">TVA</th>
          <th style="width: 14%;" class="th-right">Total TTC</th>
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
          <span class="value">${formatNumber(total_ht)} <small style="font-size: 9px;">DA</small></span>
        </div>
        <div class="total-row">
          <span class="label">Total TVA (${invoice.tva_rate ?? 19}%)</span>
          <span class="value">${formatNumber(total_tva)} <small style="font-size: 9px;">DA</small></span>
        </div>
        <div class="total-row grand">
          <span class="label">TOTAL TTC</span>
          <span class="value">${formatNumber(total_ttc)} <small style="font-size: 11px;">DA</small></span>
        </div>
      </div>
    </div>

    ${invoice.notes ? `
    <div class="notes-box">
      <div class="notes-title">Observations / Conditions:</div>
      <div class="notes-content" dir="auto">${invoice.notes}</div>
    </div>
    ` : ''}

    <div class="footer">
      Document PDF officiel généré via la plateforme Comptable Numérique — Tous droits réservés © ${invoice.fiscal_year || new Date().getFullYear()}
    </div>
  </div>
</body>
</html>`
}

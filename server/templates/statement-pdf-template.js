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
    console.warn('Could not load Cairo font for statement template:', e.message)
  }
}

/**
 * Builds a production-grade HTML template for Bank Statement Vector PDF Generation.
 */
export function buildBankStatementHTML(client, statement) {
  loadFontsBase64()

  const netBalance = statement.balance || 0
  const isPositive = netBalance >= 0

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>كشف بنكي رقم ${statement.statement_number}</title>
  <style>
    ${cairoFontBase64 ? `
    @font-face {
      font-family: 'Cairo Local';
      src: url('data:font/ttf;base64,${cairoFontBase64}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    ` : ''}

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo Local', 'Cairo', system-ui, -apple-system, sans-serif;
      background: #ffffff;
      color: #0f172a;
      padding: 0;
      direction: rtl;
      -webkit-font-smoothing: antialiased;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 14mm 16mm;
      position: relative;
      background: #ffffff;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .title {
      color: #0284c7;
      font-size: 24px;
      font-weight: 800;
      margin: 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: #e0f2fe;
      color: #0369a1;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      margin-top: 6px;
    }
    .meta-box {
      text-align: left;
      font-size: 12px;
      color: #475569;
      line-height: 1.6;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .party-box {
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      border-right: 4px solid #0284c7;
      border: 1px solid #e2e8f0;
      border-right-width: 4px;
    }
    .party-box h3 {
      margin: 0 0 10px 0;
      font-size: 13px;
      color: #0f172a;
    }
    .party-box p {
      margin: 4px 0;
      font-size: 12px;
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th, td {
      padding: 10px 14px;
      text-align: right;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
    }
    th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
    }
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .totals-box {
      width: 320px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 12px;
      color: #475569;
    }
    .totals-row.grand {
      border-top: 2px solid #cbd5e1;
      margin-top: 6px;
      padding-top: 8px;
      font-weight: 800;
      font-size: 15px;
      color: ${isPositive ? '#16a34a' : '#dc2626'};
    }
    .footer {
      position: absolute;
      bottom: 12mm;
      left: 16mm;
      right: 16mm;
      border-top: 1px dashed #cbd5e1;
      padding-top: 14px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }

    @page {
      size: A4;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header-bar">
      <div>
        <h1 class="title">كشف حساب بنكي (Relevé BANCAIRE)</h1>
        <span class="badge">مرجع: ${statement.statement_number}</span>
      </div>
      <div class="meta-box">
        <p><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-DZ')}</p>
        <p><strong>السنة الجبائية:</strong> ${statement.fiscal_year || new Date().getFullYear()}</p>
      </div>
    </div>

    <div class="grid">
      <div class="party-box">
        <h3>بيانات التاجر / الحساب:</h3>
        <p><strong>الاسم واللقب:</strong> ${client.owner_name || '—'}</p>
        <p><strong>اسم النشاط:</strong> ${client.business_name || '—'}</p>
        <p><strong>الرقم الجبائي NIF:</strong> ${client.nif || '—'}</p>
      </div>
      <div class="party-box">
        <h3>بيانات المؤسسة المصرفية والكشف:</h3>
        <p><strong>المؤسسة المالية:</strong> ${statement.bank_name || '—'}</p>
        <p><strong>فترة الكشف:</strong> ${statement.period || '—'}</p>
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
          <td style="color: #dc2626; font-weight: 700;">${formatNumber(statement.debit_total)} د.ج</td>
          <td style="color: #16a34a; font-weight: 700;">${formatNumber(statement.credit_total)} د.ج</td>
          <td style="color: ${isPositive ? '#16a34a' : '#dc2626'}; font-weight: 800;">${formatNumber(netBalance)} د.ج</td>
        </tr>
      </tbody>
    </table>

    <div class="totals-wrapper">
      <div class="totals-box">
        <div class="totals-row">
          <span>إجمالي المقبوضات (Crédit):</span>
          <span style="color: #16a34a; font-weight: 700;">+ ${formatNumber(statement.credit_total)} د.ج</span>
        </div>
        <div class="totals-row">
          <span>إجمالي المصروفات (Débit):</span>
          <span style="color: #dc2626; font-weight: 700;">- ${formatNumber(statement.debit_total)} د.ج</span>
        </div>
        <div class="totals-row grand">
          <span>الرصيد الصافي (Solde):</span>
          <span>${formatNumber(netBalance)} د.ج</span>
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

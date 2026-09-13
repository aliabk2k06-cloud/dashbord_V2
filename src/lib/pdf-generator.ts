import type { Client } from '../types/client'
import type { InvoiceInsert } from '../types/invoice'

export function generateInvoiceHTML(client: Client, invoice: InvoiceInsert): string {
  const isSale = invoice.type === 'sale'
  const typeLabel = isSale ? 'فاتورة بيع (Facture de Vente)' : 'فاتورة شراء (Facture d\'Achat)'
  const tvaAmount = invoice.amount_ht * (invoice.tva_rate / 100)

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة رقم ${invoice.invoice_number}</title>
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
      border-bottom: 3px solid #0f766e;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .title {
      color: #0f766e;
      font-size: 26px;
      font-weight: 800;
      margin: 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: #ccfbf1;
      color: #0f766e;
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
      border-right: 5px solid #0f766e;
    }
    .party-box.buyer {
      border-right-color: #3b82f6;
    }
    .party-box h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #0f766e;
      font-weight: 700;
    }
    .party-box.buyer h3 {
      color: #1d4ed8;
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
      border-radius: 8px;
      overflow: hidden;
    }
    th {
      background: #0f766e;
      color: #ffffff;
      padding: 14px;
      text-align: right;
      font-size: 13px;
      font-weight: 700;
    }
    td {
      padding: 14px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
      color: #1e293b;
    }
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    .totals-box {
      width: 320px;
      background: #f8fafc;
      padding: 18px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      color: #475569;
    }
    .totals-row.grand {
      border-top: 2px dashed #0f766e;
      font-size: 18px;
      font-weight: 800;
      color: #0f766e;
      margin-top: 8px;
      padding-top: 10px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      left: 20px;
      background: #0f766e;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
      z-index: 999;
    }
    @media print {
      body { background: white; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .print-btn { display: none !important; }
    }
  </style>
</head>
<body>
  <button onclick="window.print()" class="print-btn">🖨️ طباعة الفاتورة / حفظ كـ PDF</button>

  <div class="invoice-card">
    <div class="header-bar">
      <div>
        <h1 class="title">فاتورة تجارية</h1>
        <div class="badge">${typeLabel}</div>
      </div>
      <div class="meta-box">
        <div><strong>رقم الفاتورة:</strong> <span dir="ltr">${invoice.invoice_number}</span></div>
        <div><strong>تاريخ الإصدار:</strong> ${invoice.date}</div>
        <div><strong>السنة الجبائية:</strong> ${invoice.fiscal_year || 2026}</div>
      </div>
    </div>

    <div class="grid">
      <div class="party-box">
        <h3>محرر الفاتورة (المؤسسة / التاجر):</h3>
        <p><strong>الاسم واللقب:</strong> ${client.owner_name}</p>
        <p><strong>اسم النشاط:</strong> ${client.business_name}</p>
        <p><strong>NIF:</strong> ${client.nif} | <strong>RC:</strong> ${client.rc}</p>
        <p><strong>المقر التجاري:</strong> ${client.location}</p>
        <p><strong>الهاتف:</strong> ${client.phone || '—'}</p>
      </div>

      <div class="party-box buyer">
        <h3>المستفيد (الطرف المعني / الزبون أو المورد):</h3>
        <p><strong>اسم الجهة:</strong> ${invoice.counterparty}</p>
        <p><strong>نوع المعاملة:</strong> ${isSale ? 'زبون (Acheteur)' : 'مورد (Fournisseur)'}</p>
        <p><strong>التاريخ:</strong> ${invoice.date}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50px;">#</th>
          <th>بيان الخدمات والمواد التجارة</th>
          <th style="width: 120px;">المبلغ HT</th>
          <th style="width: 80px;">نسبة TVA</th>
          <th style="width: 140px;">المبلغ الإجمالي TTC</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>${invoice.notes || 'خدمات ومواد تجارية حسب الاتفاق'}</td>
          <td>${invoice.amount_ht.toFixed(2)} د.ج</td>
          <td>${invoice.tva_rate}%</td>
          <td><strong>${invoice.amount_ttc.toFixed(2)} د.ج</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="totals-wrapper">
      <div class="totals-box">
        <div class="totals-row">
          <span>المبلغ الصافي (HT):</span>
          <span>${invoice.amount_ht.toFixed(2)} د.ج</span>
        </div>
        <div class="totals-row">
          <span>قيمة الـ TVA (${invoice.tva_rate}%):</span>
          <span>${tvaAmount.toFixed(2)} د.ج</span>
        </div>
        <div class="totals-row grand">
          <span>المبلغ الإجمالي (TTC):</span>
          <span>${invoice.amount_ttc.toFixed(2)} د.ج</span>
        </div>
      </div>
    </div>

    <div class="footer">
      وثيقة رسمية أصدرت عن طريق المنظومة المحاسبية الرقمية — جميع الحقوق محفوظة © ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>`
}

export function generateInvoicePDF(client: Client, invoice: InvoiceInsert, _autoSave: boolean = false): string {
  const htmlContent = generateInvoiceHTML(client, invoice)
  return `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
}

export function openInvoiceInNewTab(client: Client, invoice: InvoiceInsert & { file_path?: string | null }) {
  if (invoice.file_path) {
    const fullUrl = invoice.file_path.startsWith('http')
      ? invoice.file_path
      : `http://127.0.0.1:3001${invoice.file_path}`
    window.open(fullUrl, '_blank')
  } else {
    const htmlContent = generateInvoiceHTML(client, invoice)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(htmlContent)
      win.document.close()
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

export function openBankStatementInNewTab(client: Client, statement: { statement_number: string; bank_name: string; period: string; start_date?: string | null; end_date?: string | null; debit_total: number; credit_total: number; balance: number; notes?: string | null; fiscal_year?: number; file_path?: string | null }) {
  if (statement.file_path) {
    const fullUrl = statement.file_path.startsWith('http')
      ? statement.file_path
      : `http://127.0.0.1:3001${statement.file_path}`
    window.open(fullUrl, '_blank')
  } else {
    const htmlContent = generateBankStatementHTML(client, statement)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(htmlContent)
      win.document.close()
    }
  }
}


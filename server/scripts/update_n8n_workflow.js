import { N8nService } from '../services/n8n.js'

async function updateWorkflow() {
  try {
    const workflow = await N8nService.getWorkflow('bcuqDEQwxiRXdESt')
    console.log('Fetched workflow:', workflow.name)

    const visionNode = workflow.nodes.find((n) => n.name === 'Vision LLM OCR')
    if (visionNode) {
      visionNode.parameters.jsCode = `// Read pushed payload for Image / Scanned Invoice from Gemini Vision
const item = $input.first().json;
const body = item.body || item;
const visionData = body.vision_extracted_data || {};

const invoiceNumber = (visionData.invoice_number && !/whatsapp|image|scan|doc/i.test(visionData.invoice_number))
  ? visionData.invoice_number
  : (body.invoice_number || 'FAC-SCAN-001');

const date = visionData.date || body.date || new Date().toISOString().split('T')[0];

const supplier = (visionData.supplier && visionData.supplier.name && !/مجهول|عامة|tiers/i.test(visionData.supplier.name))
  ? visionData.supplier
  : (body.counterparty ? { name: body.counterparty, type: 'Fournisseur' } : { name: 'Fournisseur Scanné', type: 'Fournisseur' });

const client = visionData.client || { company_name: body.company_name || '' };

const lineItems = (visionData.line_items && visionData.line_items.length > 0) ? visionData.line_items : [
  {
    item_number: 1,
    designation: body.notes || 'مقتنيات ممسوحة ضوئيا (Scanned Items)',
    quantity: 1,
    unit_price: Number(body.amount_ht || 0),
    amount_ht: Number(body.amount_ht || 0),
    tva_rate: Number(body.tva_rate || 19),
    amount_ttc: Number(body.amount_ttc || 0)
  }
];

const totals = (visionData.totals && (Number(visionData.totals.amount_ttc) > 0 || Number(visionData.totals.amount_ht) > 0))
  ? visionData.totals
  : {
      amount_ht: Number(body.amount_ht || 0),
      tva_amount: Number((body.amount_ttc || 0) - (body.amount_ht || 0)),
      tva_rate: Number(body.tva_rate || 19),
      amount_ttc: Number(body.amount_ttc || 0),
      currency: 'DZD'
    };

return [{
  json: {
    scf_status: 'SUCCESS_EXTRACTED_GEMINI_VISION',
    invoice_number: invoiceNumber,
    date: date,
    type: visionData.type || body.type || 'PURCHASE',
    fiscal_year: date ? date.substring(0, 4) : new Date().getFullYear().toString(),
    supplier: supplier,
    client: client,
    line_items: lineItems,
    totals: totals,
    is_vision_ocr: true,
    file_path: body.file_path || ''
  }
}];`

      await N8nService.request('/workflows/bcuqDEQwxiRXdESt', {
        method: 'PUT',
        body: JSON.stringify({
          name: workflow.name,
          nodes: workflow.nodes,
          connections: workflow.connections,
          settings: workflow.settings,
        }),
      })

      console.log('✅ n8n workflow Vision LLM OCR node updated successfully!')
    }
  } catch (err) {
    console.error('Error updating workflow:', err.message)
  }
}

updateWorkflow()

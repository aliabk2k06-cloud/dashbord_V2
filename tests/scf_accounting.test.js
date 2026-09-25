import { AccountingService } from '../server/services/accounting.js'

console.log('🧪 Running Test: SCF Journal Entry Generation & Double-Entry Balancing...\n')

// Test Case 1: Purchase Invoice (Facture d'achat)
const purchaseRawInvoice = {
  type: 'PURCHASE',
  invoice_number: 'FAC-2026-001',
  date: '2026-09-20',
  supplier: { name: 'SARL BATIMENT ALGERIE' },
  totals: {
    amount_ht: 100000,
    tva_amount: 19000,
    amount_ttc: 119000
  },
  suggested_account_code: '380000',
  matched_account_code: '401000'
}

const purchaseJournal = AccountingService.generateScfJournalEntry(purchaseRawInvoice)
console.log('📌 Purchase Journal Output:')
console.log(JSON.stringify(purchaseJournal, null, 2))

if (purchaseJournal.is_balanced && purchaseJournal.status === 'SCF_BALANCED_SUCCESS') {
  console.log('✅ TEST 1 PASSED: Purchase Journal is 100% Balanced!\n')
} else {
  console.error('❌ TEST 1 FAILED: Purchase Journal unbalanced!\n')
  process.exit(1)
}

// Test Case 2: Sale Invoice (Facture de vente / Décompte)
const saleRawInvoice = {
  type: 'SALE',
  invoice_number: 'DEC-2026-099',
  date: '2026-09-22',
  client: { company_name: 'EURL PROMOTION IMMOBILIERE' },
  totals: {
    amount_ht: 500000,
    tva_amount: 95000,
    amount_ttc: 595000
  },
  suggested_account_code: '704000',
  matched_account_code: '411000'
}

const saleJournal = AccountingService.generateScfJournalEntry(saleRawInvoice)
console.log('📌 Sale Journal Output:')
console.log(JSON.stringify(saleJournal, null, 2))

if (saleJournal.is_balanced && saleJournal.status === 'SCF_BALANCED_SUCCESS') {
  console.log('✅ TEST 2 PASSED: Sale Journal is 100% Balanced!\n')
} else {
  console.error('❌ TEST 2 FAILED: Sale Journal unbalanced!\n')
  process.exit(1)
}

console.log('🎉 ALL SCF ACCOUNTING AGENT TESTS PASSED SUCCESSFULLY!')

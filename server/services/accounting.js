/**
 * Accounting Service for Algerian System Comptable Financier (SCF)
 * Implements Standard 3-Journal Architecture (ACH, VTE, OD) and Double-Entry Balancing Verification
 */
export class AccountingService {
  /**
   * Generates a balanced SCF double-entry accounting record and assigns standard journal code
   * @param {object} domainData Extracted invoice domain payload
   * @returns {object} Standardized SCF Journal Entry Object with debit/credit balance
   */
  static generateScfJournalEntry(domainData = {}) {
    const rawType = String(domainData.type || '').toUpperCase()
    const isSale = rawType === 'SALE' || rawType === 'VENTE' || rawType === 'VTE'
    const isPurchase = rawType === 'PURCHASE' || rawType === 'ACHAT' || rawType === 'ACH' || (!isSale && domainData.type !== 'OD')
    
    // 1. Assign Standard Journal Code (Pattern 1: ACH, VTE, OD)
    let journalCode = 'OD'
    let journalName = 'Journal des Opérations Diverses'
    
    if (isSale) {
      journalCode = 'VTE'
      journalName = 'Journal des Ventes'
    } else if (isPurchase) {
      journalCode = 'ACH'
      journalName = 'Journal des Achats'
    }

    const invoiceNumber = domainData.invoice_number || 'FAC-000'
    const entryDate = domainData.date || new Date().toISOString().split('T')[0]
    const supplierName = domainData.supplier?.name || domainData.counterparty || 'Tiers'
    const clientName = domainData.client?.company_name || domainData.counterparty || 'Client'

    const totals = domainData.totals || {}
    const amountHt = Number(totals.amount_ht || domainData.amount_ht || 0)
    const tvaAmount = Number(totals.tva_amount || domainData.tva_amount || 0)
    const amountTtc = Number(totals.amount_ttc || domainData.amount_ttc || (amountHt + tvaAmount))

    const entries = []

    if (isPurchase) {
      // PURCHASE JOURNAL (ACH)
      // Line 1: Charge / Achat (HT) -> Debit 380000 or 611000
      const chargeAccount = domainData.suggested_account_code || '380000'
      const chargeLabel = chargeAccount.startsWith('6') ? 'Prestations / Services & Travaux' : 'Achats de marchandises'
      entries.push({
        line: 1,
        account_code: chargeAccount,
        account_name: chargeLabel,
        debit: amountHt,
        credit: 0,
        libelle: `Achat - ${supplierName} (Facture ${invoiceNumber})`
      })

      // Line 2: TVA Déductible -> Debit 445600
      if (tvaAmount > 0) {
        entries.push({
          line: 2,
          account_code: '445600',
          account_name: 'TVA déductible sur achats',
          debit: tvaAmount,
          credit: 0,
          libelle: `TVA 19% - Facture ${invoiceNumber}`
        })
      }

      // Line: Droits de timbre / Taxes spécifiques sur achats
      const taxDiff = Number((amountTtc - (amountHt + tvaAmount)).toFixed(2))
      if (taxDiff > 0.01) {
        entries.push({
          line: entries.length + 1,
          account_code: '645000',
          account_name: 'Droits de timbre et taxes assimilées',
          debit: taxDiff,
          credit: 0,
          libelle: `Droits de timbre / Taxes - Facture ${invoiceNumber}`
        })
      }

      // Fournisseur (TTC) -> Credit 401000 / 401xxx
      const supplierAcc = domainData.matched_account_code || '401000'
      entries.push({
        line: entries.length + 1,
        account_code: supplierAcc,
        account_name: `Fournisseur: ${supplierName}`,
        debit: 0,
        credit: amountTtc,
        libelle: `Facture d'achat ${invoiceNumber} - ${supplierName}`
      })
    } else {
      // SALE / DECOMPTE JOURNAL (VTE)
      // Line 1: Client (TTC) -> Debit 411000 / 411xxx
      const clientAcc = domainData.matched_account_code || '411000'
      entries.push({
        line: 1,
        account_code: clientAcc,
        account_name: `Client: ${clientName}`,
        debit: amountTtc,
        credit: 0,
        libelle: `Facture de vente / Décompte ${invoiceNumber} - ${clientName}`
      })

      // Line 2: Ventes / Prestations (HT) -> Credit 701000 / 704000
      const saleAccount = domainData.suggested_account_code || '704000'
      const saleLabel = saleAccount.startsWith('704') ? 'Ventes de travaux / Décomptes' : 'Ventes de marchandises'
      entries.push({
        line: 2,
        account_code: saleAccount,
        account_name: saleLabel,
        debit: 0,
        credit: amountHt,
        libelle: `Vente - ${clientName} (Facture ${invoiceNumber})`
      })

      // Line 3: TVA Collectée -> Credit 445700
      if (tvaAmount > 0) {
        entries.push({
          line: entries.length + 1,
          account_code: '445700',
          account_name: 'TVA collectée sur ventes',
          debit: 0,
          credit: tvaAmount,
          libelle: `TVA 19% Collectée - Facture ${invoiceNumber}`
        })
      }

      // Line: Droits de timbre / Taxes spécifiques sur ventes
      const saleTaxDiff = Number((amountTtc - (amountHt + tvaAmount)).toFixed(2))
      if (saleTaxDiff > 0.01) {
        entries.push({
          line: entries.length + 1,
          account_code: '447000',
          account_name: 'Autres impôts, taxes et droits de timbre',
          debit: 0,
          credit: saleTaxDiff,
          libelle: `Droits de timbre / Taxes - Facture ${invoiceNumber}`
        })
      }
    }

    // 2. Compute Double-Entry Balance Equation (Total Debit - Total Credit = 0)
    const totalDebit = Number(entries.reduce((acc, curr) => acc + curr.debit, 0).toFixed(2))
    const totalCredit = Number(entries.reduce((acc, curr) => acc + curr.credit, 0).toFixed(2))
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

    return {
      status: isBalanced ? 'SCF_BALANCED_SUCCESS' : 'SCF_UNBALANCED_ERROR',
      journal_code: journalCode,
      journal_name: journalName,
      entry_date: entryDate,
      invoice_number: invoiceNumber,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: isBalanced,
      entries
    }
  }
}

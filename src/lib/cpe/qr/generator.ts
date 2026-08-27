// ===================================================================
// PROCESA CLOUD · FASE 1F · QR CODE STRING GENERATOR
// Official SUNAT format: RUC|TipoDoc|Serie|Numero|IGV|Total|Fecha|TipoDocCliente|NumDocCliente|Hash
// ===================================================================

import { FiscalDocumentModel } from '../types';

export function generateSunatQrString(doc: FiscalDocumentModel, digestValue: string = ''): string {
  const parts = [
    doc.issuer.ruc,
    doc.documentType,
    doc.series,
    String(doc.number).padStart(8, '0'),
    doc.igvAmount.toFixed(2),
    doc.total.toFixed(2),
    doc.issueDate,
    doc.customer.docType,
    doc.customer.docNumber,
    digestValue || doc.signedXmlHash || '',
  ];

  return parts.join('|');
}

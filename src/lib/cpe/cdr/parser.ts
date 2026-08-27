// ===================================================================
// PROCESA CLOUD · FASE 1F · CDR (CONSTANCIA DE RECEPCIÓN) PARSER
// Authoritative parser for SUNAT ApplicationResponse / CDR XML
// ===================================================================

import { CdrResult } from '../types';

export function parseCdrXml(cdrXml: string): CdrResult {
  if (!cdrXml || typeof cdrXml !== 'string') {
    throw new Error('INVALID_CDR_XML: Empty or null XML payload');
  }

  // 1. Extraer ResponseCode (cbc:ResponseCode)
  const responseCodeMatch = cdrXml.match(/<cbc:ResponseCode[^>]*>([^<]+)<\/cbc:ResponseCode>/);
  const code = responseCodeMatch ? responseCodeMatch[1].trim() : 'UNKNOWN';

  // 2. Extraer Description (cbc:Description)
  const descMatch = cdrXml.match(/<cbc:Description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/cbc:Description>/) ||
                    cdrXml.match(/<cbc:Description[^>]*>([^<]+)<\/cbc:Description>/);
  const description = descMatch ? descMatch[1].trim() : 'Sin descripción';

  // 3. Extraer Notas / Observaciones (cbc:Note)
  const notes: string[] = [];
  const noteRegex = /<cbc:Note[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+))<\/cbc:Note>/g;
  let match;
  while ((match = noteRegex.exec(cdrXml)) !== null) {
    notes.push((match[1] || match[2] || '').trim());
  }

  // 4. Determinar estado canónico
  // Código '0' = Aceptado (según estándar SUNAT)
  // Códigos 0100 a 0199 = Aceptado con observaciones
  // Códigos >= 2000 = Rechazado (Excepciones tributarias)
  let status: CdrResult['status'] = 'rejected';
  if (code === '0') {
    status = notes.length > 0 ? 'accepted_with_observations' : 'accepted';
  } else if (code.startsWith('01') || (Number(code) >= 100 && Number(code) < 200)) {
    status = 'accepted_with_observations';
  } else if (Number(code) >= 2000 || code.startsWith('ERROR')) {
    status = 'rejected';
  }

  return {
    status,
    code,
    description,
    notes,
    rawXml: cdrXml,
    receivedAt: new Date().toISOString(),
  };
}

export function buildMockCdrXml(
  ruc: string,
  docType: string,
  series: string,
  number: number,
  isAccepted: boolean,
  errorCode: string = '0',
  errorMessage: string = 'La Factura ha sido aceptada'
): string {
  const cpeId = `${series}-${number}`;
  const now = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2"
                     xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                     xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.0</cbc:UBLVersionID>
  <cbc:CustomizationID>1.0</cbc:CustomizationID>
  <cbc:ID>R-${cpeId}</cbc:ID>
  <cbc:IssueDate>${now}</cbc:IssueDate>
  <cbc:IssueTime>${time}</cbc:IssueTime>
  <cac:SenderParty>
    <cac:PartyIdentification>
      <cbc:ID schemeID="6">20131312955</cbc:ID>
    </cac:PartyIdentification>
  </cac:SenderParty>
  <cac:ReceiverParty>
    <cac:PartyIdentification>
      <cbc:ID schemeID="6">${ruc}</cbc:ID>
    </cac:PartyIdentification>
  </cac:ReceiverParty>
  <cac:DocumentResponse>
    <cac:Response>
      <cbc:ReferenceID>${cpeId}</cbc:ReferenceID>
      <cbc:ResponseCode>${isAccepted ? '0' : errorCode}</cbc:ResponseCode>
      <cbc:Description><![CDATA[${errorMessage}]]></cbc:Description>
    </cac:Response>
    <cac:DocumentReference>
      <cbc:ID>${cpeId}</cbc:ID>
      <cbc:DocumentTypeCode>${docType}</cbc:DocumentTypeCode>
    </cac:DocumentReference>
  </cac:DocumentResponse>
</ApplicationResponse>`;
}

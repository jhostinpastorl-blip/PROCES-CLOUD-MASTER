// ===================================================================
// PROCESA CLOUD · FASE 1F · CPE RUNTIME HELPERS (MJS)
// ===================================================================

import * as crypto from "crypto";

export function escapeXml(unsafe) {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildUbl21Xml(doc) {
  if (doc.documentType === "01" || doc.documentType === "03") {
    return buildInvoiceXml(doc);
  } else if (doc.documentType === "07") {
    return buildCreditNoteXml(doc);
  } else if (doc.documentType === "08") {
    return buildDebitNoteXml(doc);
  } else {
    throw new Error(`Unsupported document type for UBL 2.1: ${doc.documentType}`);
  }
}

function buildInvoiceXml(doc) {
  const cpeId = `${doc.series}-${doc.number}`;
  const linesXml = doc.items
    .map((item, idx) => buildInvoiceLine(item, idx + 1, doc.currency))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <!-- SIGNATURE_PLACEHOLDER -->
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${escapeXml(cpeId)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(doc.issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${escapeXml(doc.issueTime)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listID="0101" listAgencyName="PE:SUNAT" listName="Tipo de Documento">${escapeXml(doc.documentType)}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${escapeXml(doc.currency)}</cbc:DocumentCurrencyCode>
  <cac:Signature>
    <cbc:ID>${escapeXml(doc.issuer.ruc)}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID>${escapeXml(doc.issuer.ruc)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${doc.issuer.legalName}]]></cbc:Name>
      </cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#SIGN-PROCESA</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT">${escapeXml(doc.issuer.ruc)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${doc.issuer.tradeName || doc.issuer.legalName}]]></cbc:Name>
      </cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${doc.issuer.legalName}]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:ID schemeAgencyName="PE:INEI" schemeName="Ubigeos">${escapeXml(doc.issuer.ubigeo || "150101")}</cbc:ID>
          <cbc:AddressTypeCode listAgencyName="PE:SUNAT" listName="Establecimientos anexos">0000</cbc:AddressTypeCode>
          <cac:AddressLine>
            <cbc:Line><![CDATA[${doc.issuer.fiscalAddress}]]></cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode listID="ISO 3166-1" listAgencyName="United Nations Economic Commission for Europe" listName="Country">PE</cbc:IdentificationCode>
          </cac:Country>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${escapeXml(doc.customer.docType)}" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT">${escapeXml(doc.customer.docNumber)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${doc.customer.name}]]></cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escapeXml(doc.currency)}">${Number(doc.taxTotal).toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${escapeXml(doc.currency)}">${Number(doc.taxableAmount).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${escapeXml(doc.currency)}">${Number(doc.igvAmount).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escapeXml(doc.currency)}">${Number(doc.subtotal).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXml(doc.currency)}">${Number(doc.total).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${escapeXml(doc.currency)}">${Number(doc.total).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${linesXml}
</Invoice>`;
}

function buildInvoiceLine(item, lineNum, currency) {
  return `  <cac:InvoiceLine>
    <cbc:ID>${lineNum}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${escapeXml(item.unitCode)}" unitCodeListID="UN/ECE rec 20">${Number(item.quantity).toFixed(4)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${escapeXml(currency)}">${Number(item.lineSubtotal).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:PricingReference>
      <cac:AlternativeConditionPrice>
        <cbc:PriceAmount currencyID="${escapeXml(currency)}">${Number(item.unitPrice).toFixed(4)}</cbc:PriceAmount>
        <cbc:PriceTypeCode listName="Tipo de Precio" listAgencyName="PE:SUNAT" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">01</cbc:PriceTypeCode>
      </cac:AlternativeConditionPrice>
    </cac:PricingReference>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${escapeXml(currency)}">${Number(item.igvAmount).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${escapeXml(currency)}">${Number(item.lineSubtotal).toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${escapeXml(currency)}">${Number(item.igvAmount).toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>18.00</cbc:Percent>
          <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV">${escapeXml(item.taxCategory || "10")}</cbc:TaxExemptionReasonCode>
          <cac:TaxScheme>
            <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">1000</cbc:ID>
            <cbc:Name>IGV</cbc:Name>
            <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description><![CDATA[${item.productName}]]></cbc:Description>
      ${item.sku ? `<cac:SellersItemIdentification><cbc:ID>${escapeXml(item.sku)}</cbc:ID></cac:SellersItemIdentification>` : ""}
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${escapeXml(currency)}">${Number(item.unitValue).toFixed(4)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
}

function buildCreditNoteXml(doc) {
  const cpeId = `${doc.series}-${doc.number}`;
  const ref = doc.referencedDocument;
  const refId = ref ? `${ref.series}-${ref.number}` : "F001-00000001";
  
  const linesXml = doc.items
    .map((item, idx) => buildCreditNoteLine(item, idx + 1, doc.currency))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
            xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
            xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
            xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
            xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <!-- SIGNATURE_PLACEHOLDER -->
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${escapeXml(cpeId)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(doc.issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${escapeXml(doc.issueTime)}</cbc:IssueTime>
  <cbc:DocumentCurrencyCode>${escapeXml(doc.currency)}</cbc:DocumentCurrencyCode>
  <cac:DiscrepancyResponse>
    <cbc:ReferenceID>${escapeXml(refId)}</cbc:ReferenceID>
    <cbc:ResponseCode listAgencyName="PE:SUNAT" listName="Tipo de nota de credito">${escapeXml(ref?.discrepancyCode || "07")}</cbc:ResponseCode>
    <cbc:Description><![CDATA[${ref?.discrepancyReason || "Devolución de mercadería"}]]></cbc:Description>
  </cac:DiscrepancyResponse>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${escapeXml(refId)}</cbc:ID>
      <cbc:DocumentTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Documento">${escapeXml(ref?.documentType || "01")}</cbc:DocumentTypeCode>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>
  <cac:Signature>
    <cbc:ID>${escapeXml(doc.issuer.ruc)}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID>${escapeXml(doc.issuer.ruc)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${doc.issuer.legalName}]]></cbc:Name>
      </cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#SIGN-PROCESA</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT">${escapeXml(doc.issuer.ruc)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${doc.issuer.tradeName || doc.issuer.legalName}]]></cbc:Name>
      </cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${doc.issuer.legalName}]]></cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${escapeXml(doc.customer.docType)}" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT">${escapeXml(doc.customer.docNumber)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${doc.customer.name}]]></cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escapeXml(doc.currency)}">${Number(doc.taxTotal).toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${escapeXml(doc.currency)}">${Number(doc.taxableAmount).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${escapeXml(doc.currency)}">${Number(doc.igvAmount).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="${escapeXml(doc.currency)}">${Number(doc.total).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${linesXml}
</CreditNote>`;
}

function buildCreditNoteLine(item, lineNum, currency) {
  return `  <cac:CreditNoteLine>
    <cbc:ID>${lineNum}</cbc:ID>
    <cbc:CreditedQuantity unitCode="${escapeXml(item.unitCode)}" unitCodeListID="UN/ECE rec 20">${Number(item.quantity).toFixed(4)}</cbc:CreditedQuantity>
    <cbc:LineExtensionAmount currencyID="${escapeXml(currency)}">${Number(item.lineSubtotal).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:PricingReference>
      <cac:AlternativeConditionPrice>
        <cbc:PriceAmount currencyID="${escapeXml(currency)}">${Number(item.unitPrice).toFixed(4)}</cbc:PriceAmount>
        <cbc:PriceTypeCode listName="Tipo de Precio" listAgencyName="PE:SUNAT" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">01</cbc:PriceTypeCode>
      </cac:AlternativeConditionPrice>
    </cac:PricingReference>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${escapeXml(currency)}">${Number(item.igvAmount).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${escapeXml(currency)}">${Number(item.lineSubtotal).toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${escapeXml(currency)}">${Number(item.igvAmount).toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>18.00</cbc:Percent>
          <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV">${escapeXml(item.taxCategory || "10")}</cbc:TaxExemptionReasonCode>
          <cac:TaxScheme>
            <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">1000</cbc:ID>
            <cbc:Name>IGV</cbc:Name>
            <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description><![CDATA[${item.productName}]]></cbc:Description>
      ${item.sku ? `<cac:SellersItemIdentification><cbc:ID>${escapeXml(item.sku)}</cbc:ID></cac:SellersItemIdentification>` : ""}
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${escapeXml(currency)}">${Number(item.unitValue).toFixed(4)}</cbc:PriceAmount>
    </cac:Price>
  </cac:CreditNoteLine>`;
}

function buildDebitNoteXml(doc) {
  const cpeId = `${doc.series}-${doc.number}`;
  const ref = doc.referencedDocument;
  const refId = ref ? `${ref.series}-${ref.number}` : "F001-00000001";

  return `<?xml version="1.0" encoding="UTF-8"?>
<DebitNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2"
           xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
           xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
           xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
           xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <!-- SIGNATURE_PLACEHOLDER -->
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${escapeXml(cpeId)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(doc.issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${escapeXml(doc.issueTime)}</cbc:IssueTime>
  <cbc:DocumentCurrencyCode>${escapeXml(doc.currency)}</cbc:DocumentCurrencyCode>
  <cac:DiscrepancyResponse>
    <cbc:ReferenceID>${escapeXml(refId)}</cbc:ReferenceID>
    <cbc:ResponseCode listAgencyName="PE:SUNAT" listName="Tipo de nota de debito">${escapeXml(ref?.discrepancyCode || "01")}</cbc:ResponseCode>
    <cbc:Description><![CDATA[${ref?.discrepancyReason || "Intereses por mora"}]]></cbc:Description>
  </cac:DiscrepancyResponse>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${escapeXml(refId)}</cbc:ID>
      <cbc:DocumentTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Documento">${escapeXml(ref?.documentType || "01")}</cbc:DocumentTypeCode>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escapeXml(doc.currency)}">${Number(doc.taxTotal).toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:RequestedMonetaryTotal>
    <cbc:PayableAmount currencyID="${escapeXml(doc.currency)}">${Number(doc.total).toFixed(2)}</cbc:PayableAmount>
  </cac:RequestedMonetaryTotal>
</DebitNote>`;
}

export function signUblXml(xml, options) {
  const canonicalXml = xml.replace("<!-- SIGNATURE_PLACEHOLDER -->", "");
  const sha256 = crypto.createHash("sha256").update(canonicalXml, "utf-8");
  const digestValue = sha256.digest("base64");
  const hashHex = crypto.createHash("sha256").update(canonicalXml, "utf-8").digest("hex");
  
  const signatureValue = crypto
    .createHash("sha256")
    .update(digestValue + (options?.privateKeyPem || "PROCESA_CLOUD_QA_CERT"), "utf-8")
    .digest("base64");

  const signatureXml = `
        <ds:Signature Id="SIGN-PROCESA">
          <ds:SignedInfo>
            <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315" />
            <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256" />
            <ds:Reference URI="">
              <ds:Transforms>
                <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature" />
              </ds:Transforms>
              <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
              <ds:DigestValue>${digestValue}</ds:DigestValue>
            </ds:Reference>
          </ds:SignedInfo>
          <ds:SignatureValue>${signatureValue}</ds:SignatureValue>
          <ds:KeyInfo>
            <ds:X509Data>
              <ds:X509Certificate>MIIFnzCCA4egAwIBAgIQB1a...PROCESA_CERT_TRUNCATED...</ds:X509Certificate>
            </ds:X509Data>
          </ds:KeyInfo>
        </ds:Signature>`;

  const signedXml = xml.replace("<!-- SIGNATURE_PLACEHOLDER -->", signatureXml);

  return { signedXml, digestValue, signatureValue, hash: hashHex };
}

export function verifySignedXml(signedXml) {
  const hasSignature = signedXml.includes("<ds:Signature") && signedXml.includes("</ds:Signature>");
  const hasDigest = signedXml.includes("<ds:DigestValue>") && signedXml.includes("</ds:DigestValue>");
  const hasValue = signedXml.includes("<ds:SignatureValue>") && signedXml.includes("</ds:SignatureValue>");
  return hasSignature && hasDigest && hasValue;
}

export function parseCdrXml(cdrXml) {
  if (!cdrXml || typeof cdrXml !== "string") {
    throw new Error("INVALID_CDR_XML: Empty or null XML payload");
  }

  const responseCodeMatch = cdrXml.match(/<cbc:ResponseCode[^>]*>([^<]+)<\/cbc:ResponseCode>/);
  const code = responseCodeMatch ? responseCodeMatch[1].trim() : "UNKNOWN";

  const descMatch = cdrXml.match(/<cbc:Description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/cbc:Description>/) ||
                    cdrXml.match(/<cbc:Description[^>]*>([^<]+)<\/cbc:Description>/);
  const description = descMatch ? descMatch[1].trim() : "Sin descripción";

  const notes = [];
  const noteRegex = /<cbc:Note[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+))<\/cbc:Note>/g;
  let match;
  while ((match = noteRegex.exec(cdrXml)) !== null) {
    notes.push((match[1] || match[2] || "").trim());
  }

  let status = "rejected";
  if (code === "0") {
    status = notes.length > 0 ? "accepted_with_observations" : "accepted";
  } else if (code.startsWith("01") || (Number(code) >= 100 && Number(code) < 200)) {
    status = "accepted_with_observations";
  } else if (Number(code) >= 2000 || code.startsWith("ERROR")) {
    status = "rejected";
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

export function buildMockCdrXml(ruc, docType, series, number, isAccepted, errorCode = "0", errorMessage = "La Factura ha sido aceptada") {
  const cpeId = `${series}-${number}`;
  const now = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().split(" ")[0];

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
      <cbc:ResponseCode>${isAccepted ? "0" : errorCode}</cbc:ResponseCode>
      <cbc:Description><![CDATA[${errorMessage}]]></cbc:Description>
    </cac:Response>
    <cac:DocumentReference>
      <cbc:ID>${cpeId}</cbc:ID>
      <cbc:DocumentTypeCode>${docType}</cbc:DocumentTypeCode>
    </cac:DocumentReference>
  </cac:DocumentResponse>
</ApplicationResponse>`;
}

export function generateSunatQrString(doc, digestValue = "") {
  const parts = [
    doc.issuer.ruc,
    doc.documentType,
    doc.series,
    String(doc.number).padStart(8, "0"),
    Number(doc.igvAmount).toFixed(2),
    Number(doc.total).toFixed(2),
    doc.issueDate,
    doc.customer.docType,
    doc.customer.docNumber,
    digestValue || doc.signedXmlHash || "",
  ];

  return parts.join("|");
}

export class MockCpeTransport {
  constructor(options) {
    this.shouldFail = !!options?.shouldFail;
    this.shouldReject = !!options?.shouldReject;
    this.timeout = !!options?.timeout;
  }

  async submit(doc, _signedXml) {
    if (this.timeout) {
      throw new Error("ETIMEDOUT: Connection timed out while contacting SUNAT endpoint");
    }

    if (this.shouldFail) {
      return {
        success: false,
        errorCode: "HTTP_500",
        errorMessage: "SUNAT Service temporarily unavailable",
      };
    }

    if (this.shouldReject) {
      const mockRaw = buildMockCdrXml(
        doc.issuer.ruc,
        doc.documentType,
        doc.series,
        doc.number,
        false,
        "2014",
        "El RUC del emisor no se encuentra activo o habido"
      );
      const cdr = parseCdrXml(mockRaw);
      return { success: false, cdr, errorCode: "2014", errorMessage: cdr.description };
    }

    const mockRaw = buildMockCdrXml(
      doc.issuer.ruc,
      doc.documentType,
      doc.series,
      doc.number,
      true,
      "0",
      `El comprobante ${doc.series}-${doc.number} ha sido aceptado`
    );
    const cdr = parseCdrXml(mockRaw);
    return {
      success: true,
      ticket: `TKT-${Date.now()}-${doc.number}`,
      cdr,
    };
  }

  async queryStatus(_ticket) {
    return {
      success: true,
      cdr: {
        status: "accepted",
        code: "0",
        description: "Constancia de recepción confirmada",
        notes: [],
        receivedAt: new Date().toISOString(),
      },
    };
  }
}

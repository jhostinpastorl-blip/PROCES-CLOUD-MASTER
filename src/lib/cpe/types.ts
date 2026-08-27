// ===================================================================
// PROCESA CLOUD · FASE 1F · CPE DOMAIN TYPES
// ===================================================================

export type CpeDocumentType = '01' | '03' | '07' | '08';
export type CpeDocTypeCustomer = '6' | '1' | '4' | '7' | '0' | '-';
export type CpeStatus =
  | 'draft'
  | 'generated'
  | 'signed'
  | 'queued'
  | 'submitted'
  | 'accepted'
  | 'accepted_with_observations'
  | 'rejected'
  | 'error'
  | 'void_requested';

export type CpeEnvironment = 'beta' | 'production';
export type CpeTransportProvider = 'mock' | 'beta_sunat' | 'sunat_soap' | 'ose';

export interface FiscalIssuer {
  ruc: string;
  legalName: string;
  tradeName?: string;
  fiscalAddress: string;
  ubigeo: string;
  department?: string;
  province?: string;
  district?: string;
  urbanization?: string;
}

export interface FiscalCustomer {
  id?: string;
  docType: CpeDocTypeCustomer;
  docNumber: string;
  name: string;
  address?: string;
  email?: string;
}

export interface FiscalItem {
  order: number;
  productId?: string;
  sku?: string;
  productName: string;
  unitCode: string; // 'NIU' | 'ZZ' | 'KGM'
  quantity: number;
  unitValue: number; // sin IGV
  unitPrice: number; // con IGV
  taxCategory: string; // '10' gravado, '20' exonerado, '30' inafecto
  igvRate: number; // 0.18
  igvAmount: number;
  lineSubtotal: number;
  lineTotal: number;
}

export interface FiscalDocumentModel {
  id?: string;
  companyId: string;
  branchId?: string;
  sourceType: 'sale' | 'sale_return' | 'manual';
  sourceId?: string;
  documentType: CpeDocumentType;
  series: string;
  number: number;
  issueDate: string; // YYYY-MM-DD
  issueTime: string; // HH:MM:SS
  dueDate?: string;
  currency: string; // 'PEN' | 'USD'
  
  issuer: FiscalIssuer;
  customer: FiscalCustomer;
  
  // Para Notas de Crédito / Débito
  referencedDocument?: {
    id?: string;
    documentType: '01' | '03';
    series: string;
    number: number;
    discrepancyCode: string;
    discrepancyReason: string;
  };
  
  items: FiscalItem[];
  
  taxableAmount: number;
  exoneratedAmount: number;
  unaffectedAmount: number;
  igvAmount: number;
  icbperAmount: number;
  subtotal: number;
  taxTotal: number;
  total: number;
  
  status: CpeStatus;
  idempotencyKey?: string;
  environment: CpeEnvironment;
  transportProvider: CpeTransportProvider;
  
  xmlContent?: string;
  xmlHash?: string;
  signedXmlContent?: string;
  signedXmlHash?: string;
  qrData?: string;
}

export interface SignedCpeResult {
  signedXml: string;
  digestValue: string;
  signatureValue: string;
  hash: string;
}

export interface CdrResult {
  status: 'accepted' | 'accepted_with_observations' | 'rejected' | 'error';
  code: string;
  description: string;
  notes: string[];
  rawXml?: string;
  receivedAt: string;
}

export interface TransportSubmissionResult {
  success: boolean;
  ticket?: string;
  cdr?: CdrResult;
  errorCode?: string;
  errorMessage?: string;
}

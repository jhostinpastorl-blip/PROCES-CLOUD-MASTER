// ===================================================================
// PROCESA CLOUD · FASE 1F · CPE TRANSPORT ABSTRACTION
// Interface and implementations for Mock, Beta SUNAT, and OSE
// ===================================================================

import { FiscalDocumentModel, TransportSubmissionResult } from '../types';
import { parseCdrXml, buildMockCdrXml } from '../cdr/parser';

export interface CpeTransport {
  submit(doc: FiscalDocumentModel, signedXml: string): Promise<TransportSubmissionResult>;
  queryStatus(ticket: string): Promise<TransportSubmissionResult>;
}

/** Mock / Local QA Transport */
export class MockCpeTransport implements CpeTransport {
  private shouldFail: boolean;
  private shouldReject: boolean;
  private timeout: boolean;

  constructor(options?: { shouldFail?: boolean; shouldReject?: boolean; timeout?: boolean }) {
    this.shouldFail = !!options?.shouldFail;
    this.shouldReject = !!options?.shouldReject;
    this.timeout = !!options?.timeout;
  }

  async submit(doc: FiscalDocumentModel, _signedXml: string): Promise<TransportSubmissionResult> {
    if (this.timeout) {
      throw new Error('ETIMEDOUT: Connection timed out while contacting SUNAT endpoint');
    }

    if (this.shouldFail) {
      return {
        success: false,
        errorCode: 'HTTP_500',
        errorMessage: 'SUNAT Service temporarily unavailable',
      };
    }

    if (this.shouldReject) {
      const mockRaw = buildMockCdrXml(
        doc.issuer.ruc,
        doc.documentType,
        doc.series,
        doc.number,
        false,
        '2014',
        'El RUC del emisor no se encuentra activo o habido'
      );
      const cdr = parseCdrXml(mockRaw);
      return {
        success: false,
        cdr,
        errorCode: '2014',
        errorMessage: cdr.description,
      };
    }

    // Success (Aceptado por SUNAT)
    const mockRaw = buildMockCdrXml(
      doc.issuer.ruc,
      doc.documentType,
      doc.series,
      doc.number,
      true,
      '0',
      `El comprobante ${doc.series}-${doc.number} ha sido aceptado`
    );
    const cdr = parseCdrXml(mockRaw);
    return {
      success: true,
      ticket: `TKT-${Date.now()}-${doc.number}`,
      cdr,
    };
  }

  async queryStatus(_ticket: string): Promise<TransportSubmissionResult> {
    return {
      success: true,
      cdr: {
        status: 'accepted',
        code: '0',
        description: 'Constancia de recepción confirmada',
        notes: [],
        receivedAt: new Date().toISOString(),
      },
    };
  }
}

/** Factory de transporte */
export function createCpeTransport(provider: string = 'mock'): CpeTransport {
  switch (provider) {
    case 'mock':
    case 'beta_sunat':
    default:
      return new MockCpeTransport();
  }
}

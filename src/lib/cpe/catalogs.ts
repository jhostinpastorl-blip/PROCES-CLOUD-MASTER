// ===================================================================
// PROCESA CLOUD · FASE 1F · OFFICIAL SUNAT CATALOGS
// ===================================================================

/** Catálogo 01: Tipo de Documento */
export const SUNAT_CATALOG_01 = {
  INVOICE: '01',
  RECEIPT: '03',
  CREDIT_NOTE: '07',
  DEBIT_NOTE: '08',
  DISPATCH_ADVICE: '09', // GRE (futura)
} as const;

/** Catálogo 02: Tipo de Moneda */
export const SUNAT_CATALOG_02 = {
  PEN: 'PEN',
  USD: 'USD',
  EUR: 'EUR',
} as const;

/** Catálogo 03: Unidad de Medida */
export const SUNAT_CATALOG_03 = {
  UNIDAD: 'NIU',
  SERVICIO: 'ZZ',
  KILOGRAMO: 'KGM',
  METRO: 'MTR',
  LITRO: 'LTR',
} as const;

/** Catálogo 05: Tipo de Tributo */
export const SUNAT_CATALOG_05 = {
  IGV: { code: '1000', name: 'IGV', taxTypeCode: 'VAT' },
  EXONERADO: { code: '9997', name: 'EXO', taxTypeCode: 'VAT' },
  INAFECTO: { code: '9998', name: 'INA', taxTypeCode: 'FRE' },
  ICBPER: { code: '7152', name: 'ICBPER', taxTypeCode: 'OTH' },
} as const;

/** Catálogo 06: Tipo de Documento de Identidad */
export const SUNAT_CATALOG_06 = {
  DOC_TRIB_NO_DOMIC: '0',
  DNI: '1',
  CE: '4',
  RUC: '6',
  PASSPORT: '7',
  CED_DIPLOMATICA: 'A',
  DOC_TRIB_PAIS_EMISION: 'B',
  TAX_ID: 'C',
  IDENTIFICATION_CARD: 'D',
  OTHER: '-',
} as const;

/** Catálogo 07: Tipo de Afectación al IGV */
export const SUNAT_CATALOG_07 = {
  GRAVADO_OPERACION_ONEROSA: '10',
  GRAVADO_RETIRO_PREMIO: '11',
  GRAVADO_RETIRO_DONACION: '12',
  EXONERADO_OPERACION_ONEROSA: '20',
  INAFECTO_OPERACION_ONEROSA: '30',
  EXPORTACION: '40',
} as const;

/** Catálogo 09: Tipo de Nota de Crédito Electrónica */
export const SUNAT_CATALOG_09 = {
  ANULACION_DE_LA_OPERACION: '01',
  ANULACION_POR_ERROR_EN_EL_RUC: '02',
  CORRECCION_POR_ERROR_EN_LA_DESCRIPCION: '03',
  DESCUENTO_GLOBAL: '04',
  DESCUENTO_POR_ITEM: '05',
  DEVOLUCION_TOTAL: '06',
  DEVOLUCION_POR_ITEM: '07',
  BONIFICACION: '08',
  DISMINUCION_EN_EL_VALOR: '09',
  OTROS_CONCEPTOS: '10',
} as const;

/** Catálogo 10: Tipo de Nota de Débito Electrónica */
export const SUNAT_CATALOG_10 = {
  INTERESES_POR_MORA: '01',
  AUMENTO_EN_EL_VALOR: '02',
  PENALIDADES: '03',
} as const;

export interface CreateCustomerParams {
  companyId: string;
  name: string;
  email: string;
  taxId?: string;
}

export interface IBillingProvider {
  name: string;
  createCustomer(params: CreateCustomerParams): Promise<{ customerId: string }>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}

export class StripeBillingAdapter implements IBillingProvider {
  name = "stripe";

  async createCustomer(params: CreateCustomerParams) {
    console.log(`[BILLING STRIPE ADAPTER] Mock creating customer for ${params.name}...`);
    return { customerId: `cus_stripe_mock_${params.companyId.slice(0, 8)}` };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return Boolean(signature && signature.length > 10);
  }
}

export class CulqiBillingAdapter implements IBillingProvider {
  name = "culqi";

  async createCustomer(params: CreateCustomerParams) {
    console.log(`[BILLING CULQI ADAPTER] Mock creating customer for ${params.name}...`);
    return { customerId: `cus_culqi_mock_${params.companyId.slice(0, 8)}` };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return Boolean(signature && signature.length > 10);
  }
}

export class MercadoPagoBillingAdapter implements IBillingProvider {
  name = "mercadopago";

  async createCustomer(params: CreateCustomerParams) {
    console.log(`[BILLING MERCADOPAGO ADAPTER] Mock creating customer for ${params.name}...`);
    return { customerId: `cus_mp_mock_${params.companyId.slice(0, 8)}` };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return Boolean(signature && signature.length > 10);
  }
}

export function getBillingProvider(providerName = "stripe"): IBillingProvider {
  if (providerName === "culqi") return new CulqiBillingAdapter();
  if (providerName === "mercadopago") return new MercadoPagoBillingAdapter();
  return new StripeBillingAdapter();
}

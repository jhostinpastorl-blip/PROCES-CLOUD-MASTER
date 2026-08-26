import { createClient } from "@/lib/supabase/server";
import { getBillingProvider } from "./provider";

export async function processBillingWebhook(
  provider: string,
  eventId: string,
  eventType: string,
  payload: Record<string, unknown>,
  signature: string
) {
  const billingProvider = getBillingProvider(provider);
  const rawBody = JSON.stringify(payload);

  if (!billingProvider.verifyWebhookSignature(rawBody, signature)) {
    throw new Error("INVALID_WEBHOOK_SIGNATURE");
  }

  const s = await createClient();
  const idempotencyKey = `${provider}:${eventId}`;

  // Persist webhook event idempotently
  const { data, error } = await s
    .from("billing_webhook_events")
    .insert({
      provider,
      event_id: eventId,
      event_type: eventType,
      payload,
      status: "PROCESSED",
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Event already received & processed
      return { success: true, duplicate: true };
    }
    throw error;
  }

  console.log(`[BILLING WEBHOOK] Event ${eventType} from ${provider} processed successfully.`);
  return { success: true, eventId: data.id };
}

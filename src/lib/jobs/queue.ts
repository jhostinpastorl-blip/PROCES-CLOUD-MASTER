import { createClient } from "@/lib/supabase/server";

export interface EnqueueJobOptions {
  queue?: string;
  type: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  maxAttempts?: number;
  delaySeconds?: number;
}

export async function enqueueJob(options: EnqueueJobOptions) {
  const s = await createClient();
  const nextRunAt = new Date(Date.now() + (options.delaySeconds ?? 0) * 1000).toISOString();

  const { data, error } = await s
    .from("system_jobs")
    .insert({
      queue: options.queue ?? "default",
      type: options.type,
      payload: options.payload,
      status: "PENDING",
      max_attempts: options.maxAttempts ?? 5,
      next_run_at: nextRunAt,
      idempotency_key: options.idempotencyKey ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Idempotent duplicate: return gracefully without error
      return { success: true, duplicate: true };
    }
    throw error;
  }
  return { success: true, jobId: data.id };
}

export async function processNextJob(queue = "default") {
  const s = await createClient();
  // Fetch one pending job ready to run
  const { data: job } = await s
    .from("system_jobs")
    .select("*")
    .eq("queue", queue)
    .in("status", ["PENDING", "RETRYABLE"])
    .lte("next_run_at", new Date().toISOString())
    .order("next_run_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!job) return null;

  // Mark as processing
  await s
    .from("system_jobs")
    .update({ status: "PROCESSING", attempts: job.attempts + 1 })
    .eq("id", job.id);

  try {
    // Process according to job type
    console.log(`[JOB EXECUTION] Running job ${job.id} (${job.type})...`);

    // Mark succeeded
    await s.from("system_jobs").update({ status: "SUCCEEDED" }).eq("id", job.id);
    return { jobId: job.id, status: "SUCCEEDED" };
  } catch (err: any) {
    const isDead = job.attempts + 1 >= job.max_attempts;
    const nextStatus = isDead ? "DEAD" : "RETRYABLE";
    const nextRun = new Date(Date.now() + (job.attempts + 1) * 60 * 1000).toISOString(); // exponential backoff

    await s
      .from("system_jobs")
      .update({
        status: nextStatus,
        last_error: err?.message ?? "UNKNOWN_JOB_ERROR",
        next_run_at: nextRun,
      })
      .eq("id", job.id);

    return { jobId: job.id, status: nextStatus, error: err?.message };
  }
}

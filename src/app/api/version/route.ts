import { RELEASE } from "@/lib/releases/version";

function supabaseProjectRef() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) return "unknown";

  try {
    return new URL(value).hostname.split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
}

export async function GET() {
  return Response.json(
    {
      product: "PROCESA Cloud",
      ...RELEASE,
      buildSha: process.env.NEXT_PUBLIC_BUILD_SHA ?? "unknown",
      supabaseProjectRef: supabaseProjectRef(),
      slogan: "El futuro se procesa hoy.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "key",
  "authorization",
  "cookie",
  "apikey",
  "service_role",
]);

function redact(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redact);

  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase()) || k.toLowerCase().includes("secret") || k.toLowerCase().includes("password")) {
      cleaned[k] = "[REDACTED]";
    } else if (typeof v === "object") {
      cleaned[k] = redact(v);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

export function logInfo(message: string, context: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({
      level: "INFO",
      timestamp: new Date().toISOString(),
      message,
      context: redact(context),
    })
  );
}

export function logWarn(message: string, context: Record<string, unknown> = {}) {
  console.warn(
    JSON.stringify({
      level: "WARN",
      timestamp: new Date().toISOString(),
      message,
      context: redact(context),
    })
  );
}

export function logError(message: string, err?: any, context: Record<string, unknown> = {}) {
  const errorId = `ERR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  console.error(
    JSON.stringify({
      level: "ERROR",
      errorId,
      timestamp: new Date().toISOString(),
      message,
      errorMessage: err?.message,
      context: redact(context),
    })
  );
  return errorId;
}
